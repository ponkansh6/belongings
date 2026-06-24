import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Belongings Checker",
  description: "出かける前の忘れ物チェックリスト",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
