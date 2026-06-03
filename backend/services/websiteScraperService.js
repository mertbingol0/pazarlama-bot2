// İşletme web sitelerinden iletişim verisi (e-posta + sosyal medya) çıkaran
// hafif kazıyıcı. Harici bağımlılık yok; yerleşik fetch + regex kullanır.

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Görsel/asset uzantılarıyla biten ya da bilinen çöp adresleri ele.
const EMAIL_BLOCKLIST_PATTERNS = [
  /\.(png|jpg|jpeg|gif|webp|svg|css|js|ico)$/i,
  /@(sentry|wixpress|example|sentry\.io|domain)\./i,
  /^(info|noreply|no-reply)@(sentry|wix)/i,
];

const SOCIAL_PROVIDERS = [
  { key: "instagram", pattern: /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>)]+/gi },
  { key: "facebook", pattern: /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>)]+/gi },
  { key: "twitter", pattern: /https?:\/\/(www\.)?(twitter|x)\.com\/[^\s"'<>)]+/gi },
  { key: "linkedin", pattern: /https?:\/\/(www\.)?linkedin\.com\/[^\s"'<>)]+/gi },
  { key: "youtube", pattern: /https?:\/\/(www\.)?youtube\.com\/[^\s"'<>)]+/gi },
  { key: "tiktok", pattern: /https?:\/\/(www\.)?tiktok\.com\/[^\s"'<>)]+/gi },
];

// Sosyal medya linklerinde sıkça görülen ama işletmeye ait olmayan yollar.
const SOCIAL_IGNORE_PATHS = [
  "sharer",
  "share.php",
  "intent",
  "/plugins/",
  "/tr_TR/",
];

function normalizeWebsiteUrl(rawUrl) {
  if (!rawUrl) return "";

  const trimmed = String(rawUrl).trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isUsableEmail(email) {
  const lower = email.toLowerCase();

  return !EMAIL_BLOCKLIST_PATTERNS.some((pattern) => pattern.test(lower));
}

function extractEmails(html) {
  const matches = html.match(EMAIL_REGEX) || [];
  const unique = new Set();

  matches.forEach((email) => {
    const cleaned = email.trim().replace(/\.$/, "");

    if (isUsableEmail(cleaned)) {
      unique.add(cleaned.toLowerCase());
    }
  });

  return Array.from(unique);
}

function extractSocials(html) {
  const socials = {};
  const allLinks = [];

  SOCIAL_PROVIDERS.forEach(({ key, pattern }) => {
    const matches = html.match(pattern) || [];

    for (const rawMatch of matches) {
      // Sondaki tırnak/parantez/kaçış/boşlukları, query (?...) ve hash (#...)
      // kısımlarını ve sondaki slash'i temizleyip normalize et. Böylece
      // ".../profil?hl=en" gibi onlarca dil varyantı tek linke iner.
      const link = rawMatch
        .replace(/[\\"'<>)\s]+$/, "")
        .split("?")[0]
        .split("#")[0]
        .replace(/\/$/, "");

      if (SOCIAL_IGNORE_PATHS.some((ignore) => link.includes(ignore))) {
        continue;
      }

      // Her sağlayıcı için ilk geçerli linki al.
      if (!socials[key]) {
        socials[key] = link;
      }

      if (!allLinks.includes(link)) {
        allLinks.push(link);
      }
    }
  });

  // İşletme başına aşırı uzun listeleri engellemek için sınırla.
  return { socials, socialLinks: allLinks.slice(0, 8) };
}

async function fetchHtml(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LeadFinderBot/1.0; +https://jefedes.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html") && !contentType.includes("xml")) {
      return "";
    }

    return await response.text();
  } catch (error) {
    // Timeout, DNS, sertifika vb. — sessizce boş geç.
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tek bir website için e-posta + sosyal medya verisini döndürür.
 */
async function scrapeWebsiteContacts(websiteUrl, { timeoutMs = 7000 } = {}) {
  const url = normalizeWebsiteUrl(websiteUrl);

  if (!url) {
    return { emails: [], socials: {}, socialLinks: [] };
  }

  const html = await fetchHtml(url, timeoutMs);

  if (!html) {
    return { emails: [], socials: {}, socialLinks: [] };
  }

  const emails = extractEmails(html);
  const { socials, socialLinks } = extractSocials(html);

  return { emails, socials, socialLinks };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runner()
  );

  await Promise.all(runners);

  return results;
}

/**
 * İşletme listesini website'lerinden çıkarılan email + sosyal verilerle
 * zenginleştirir. Website'i olmayan ya da erişilemeyen işletmeler olduğu gibi
 * kalır. Orijinal dizinin kopyasını döndürür.
 */
async function enrichBusinessesWithContacts(
  businesses,
  { concurrency = 6, timeoutMs = 7000 } = {}
) {
  if (!Array.isArray(businesses) || businesses.length === 0) {
    return businesses || [];
  }

  await mapWithConcurrency(businesses, concurrency, async (business) => {
    if (!business || !business.website) {
      return;
    }

    try {
      const { emails, socials, socialLinks } = await scrapeWebsiteContacts(
        business.website,
        { timeoutMs }
      );

      if (emails.length > 0) {
        business.email = emails.join(", ");
      }

      if (socials.instagram) {
        business.instagram = socials.instagram;
      }

      if (socialLinks.length > 0) {
        business.socials = socialLinks.join(", ");
      }
    } catch (error) {
      console.warn(
        `Website kazıma başarısız (${business.website}):`,
        error.message
      );
    }
  });

  return businesses;
}

module.exports = {
  scrapeWebsiteContacts,
  enrichBusinessesWithContacts,
};
