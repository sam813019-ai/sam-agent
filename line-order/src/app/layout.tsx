import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HERA(凱麗@hera__2013)",
  description: "LINE 群組快速下單",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
