import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "마그네이트코리아 대시보드",
  description: "마그네이트코리아 업무 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={outfit.variable}>
      <body className="font-outfit antialiased">{children}</body>
    </html>
  );
}
