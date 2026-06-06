"use client";

import type { ReactNode } from "react";

export type SocialKey =
  | "instagram"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "website";

export function detectSocialProvider(url: string): SocialKey {
  const value = String(url || "").toLowerCase();

  if (value.includes("instagram.com")) return "instagram";
  if (value.includes("facebook.com") || value.includes("fb.com")) return "facebook";
  if (value.includes("twitter.com") || value.includes("x.com")) return "twitter";
  if (value.includes("linkedin.com")) return "linkedin";
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "youtube";
  if (value.includes("tiktok.com")) return "tiktok";

  return "website";
}

const ICON_PATHS: Record<SocialKey, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="17" cy="7" r="1.4" fill="white" />
    </>
  ),
  facebook: (
    <path
      fill="white"
      d="M13.5 21v-8h2.6l.4-3H13.5V8.1c0-.87.24-1.46 1.5-1.46h1.6V4c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.42-3.9 4.02V10H8.3v3h2.66v8h2.54z"
    />
  ),
  twitter: (
    <path
      fill="white"
      d="M17.53 3h3.07l-6.71 7.67L21.5 21h-5.9l-4.62-6.04L5.7 21H2.62l7.18-8.2L2.2 3h6.05l4.18 5.52L17.53 3zm-1.08 16.2h1.7L7.62 4.7H5.8l10.65 14.5z"
    />
  ),
  linkedin: (
    <path
      fill="white"
      d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0zM3.3 8.4h3.3V21H3.3V8.4zm5.6 0h3.16v1.72h.05c.44-.83 1.52-1.72 3.12-1.72 3.34 0 3.96 2.2 3.96 5.05V21h-3.3v-5.6c0-1.34-.03-3.06-1.86-3.06-1.87 0-2.15 1.46-2.15 2.96V21H8.9V8.4z"
    />
  ),
  youtube: (
    <path
      fill="white"
      d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3-5.2 3z"
    />
  ),
  tiktok: (
    <path
      fill="white"
      d="M16.5 3c.3 2.1 1.5 3.4 3.5 3.6v2.4c-1.2.1-2.3-.3-3.5-1v6.1c0 3.2-2.4 5.4-5.4 5.4-2.9 0-5.1-2.2-5.1-5 0-2.9 2.4-5 5.3-4.9.3 0 .5 0 .8.1v2.5c-.2-.1-.5-.1-.8-.1-1.4 0-2.5 1-2.5 2.4 0 1.4 1.1 2.4 2.5 2.4 1.5 0 2.6-1.1 2.6-2.8V3h2.6z"
    />
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="white" strokeWidth="2" />
      <path
        d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"
        fill="none"
        stroke="white"
        strokeWidth="1.6"
      />
    </>
  ),
};

const PROVIDER_META: Record<SocialKey, { label: string; className: string }> = {
  instagram: {
    label: "Instagram",
    className:
      "bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400 hover:opacity-90",
  },
  facebook: { label: "Facebook", className: "bg-[#1877F2] hover:bg-[#0f63d6]" },
  twitter: { label: "X (Twitter)", className: "bg-black hover:bg-slate-800" },
  linkedin: { label: "LinkedIn", className: "bg-[#0A66C2] hover:bg-[#0950a0]" },
  youtube: { label: "YouTube", className: "bg-[#FF0000] hover:bg-[#d60000]" },
  tiktok: { label: "TikTok", className: "bg-black hover:bg-slate-800" },
  website: { label: "Website", className: "bg-slate-600 hover:bg-slate-700" },
};

/**
 * Tek bir sosyal medya linkini, marka renkli ve tıklanabilir bir ikon olarak
 * gösterir. Tıklayınca ilgili sayfaya yönlendirir.
 */
export function SocialChip({
  url,
  size = "md",
}: {
  url: string;
  size?: "sm" | "md";
}) {
  const provider = detectSocialProvider(url);
  const meta = PROVIDER_META[provider];

  const boxClass = size === "sm" ? "h-7 w-7 rounded-lg" : "h-10 w-10 rounded-xl";
  const iconSize = size === "sm" ? 15 : 20;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={meta.label}
      aria-label={meta.label}
      className={`flex items-center justify-center text-white transition ${boxClass} ${meta.className}`}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" aria-hidden="true">
        {ICON_PATHS[provider]}
      </svg>
    </a>
  );
}
