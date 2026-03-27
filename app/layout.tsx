import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSM Study",
  description: "PSM 문제 풀이와 오답 복습을 위한 학습용 웹앱"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
