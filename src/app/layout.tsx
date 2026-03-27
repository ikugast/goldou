import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "金豆芽实验室",
  description: "AI Trading Arena",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
