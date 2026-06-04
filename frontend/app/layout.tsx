import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthGuard } from "@/components/AuthGuard";
import { PanelChrome } from "@/components/PanelChrome";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Jefedes Lead Flow",
  description:
    "Potansiyel müşteri arama, iletişim ve lead takip yönetim paneli.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthGuard>
          <PanelChrome>{children}</PanelChrome>
        </AuthGuard>
      </body>
    </html>
  );
}