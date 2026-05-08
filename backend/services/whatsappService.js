const GRAPH_API_VERSION = "v22.0";

function normalizeWhatsAppNumber(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    throw new Error("Mesaj gönderilecek telefon numarası eksik.");
  }

  const digitsOnly = rawValue.replace(/\D/g, "");
  const normalizedNumber = digitsOnly.startsWith("00")
    ? digitsOnly.slice(2)
    : digitsOnly;

  if (!normalizedNumber) {
    throw new Error("Telefon numarası sadece rakamlardan oluşmalıdır.");
  }

  if (normalizedNumber.startsWith("0")) {
    throw new Error(
      "Telefon numarasını ülke koduyla gönderin. Örnek: 905551112233"
    );
  }

  if (normalizedNumber.length < 8 || normalizedNumber.length > 15) {
    throw new Error("Telefon numarası geçerli bir uluslararası formatta değil.");
  }

  return normalizedNumber;
}

function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) {
    throw new Error("WHATSAPP_TOKEN .env içinde tanımlı değil.");
  }

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID .env içinde tanımlı değil.");
  }


  return {
    token,
    phoneNumberId,
  };
}

async function sendWhatsAppPayload(payload) {
  const { token, phoneNumberId } = getWhatsAppConfig();

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  console.log("WhatsApp API response:", {
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok) {
    throw new Error(data.error?.message || "WhatsApp mesajı gönderilemedi.");
  }

  const metaMessage = Array.isArray(data.messages) ? data.messages[0] : null;

  return {
    requestAccepted: true,
    to: payload.to,
    messageId: metaMessage?.id || null,
    messageStatus: metaMessage?.message_status || "accepted",
    raw: data,
  };
}

async function sendWhatsAppTextMessage({ to, message }) {
  const normalizedTo = normalizeWhatsAppNumber(to);

  if (!message || !String(message).trim()) {
    throw new Error("Gönderilecek mesaj içeriği boş olamaz.");
  }

  const payload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "text",
    text: {
      preview_url: false,
      body: String(message).trim(),
    },
  };

  return sendWhatsAppPayload(payload);
}

async function sendWhatsAppTemplateTest({ to }) {
  const normalizedTo = normalizeWhatsAppNumber(to);

  const payload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "template",
    template: {
      name: "hello_world",
      language: {
        code: "en_US",
      },
    },
  };

  return sendWhatsAppPayload(payload);
}

module.exports = {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateTest,
};