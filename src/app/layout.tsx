import type { Metadata } from "next";
import localFont from "next/font/local";

import { SideNavigation } from "@/components/SideNavigation";
import "@/styles/globals.css";

const pretendard = localFont({
  src: "../../public/assets/fonts/PretendardVariable.woff2",
  display: "swap",
  variable: "--font-pretendard",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "Votra",
  description: "Votra application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-sans">
        <div className="flex min-h-screen">
          <SideNavigation />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
