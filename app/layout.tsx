import type { Metadata } from "next";
import { Noto_Sans_KR, Archivo_Narrow } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const noto = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Condensed face for scores / big numerals / English labels (KFA Gothic substitute).
const condensed = Archivo_Narrow({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "한국 32강 진출 트래커 · 2026 월드컵",
  description:
    "2026 FIFA 월드컵 한국 대표팀의 32강(베스트 3위) 진출 가능성을 실시간 순위·경기 현황·향후 일정별 시나리오로 추적합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${noto.variable} ${condensed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
