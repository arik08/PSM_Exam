import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPIc English Coach",
  description: "OPIc 영어 말하기 연습과 복습을 위한 학습용 웹앱"
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
