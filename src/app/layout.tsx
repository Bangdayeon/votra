import type { Metadata } from "next";
import localFont from "next/font/local";

import { listProjects } from "@/application/listProjects";
import { AppShell } from "@/components/AppShell";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialProjects = await listProjects();
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-sans">
        <AppShell initialProjects={initialProjects}>{children}</AppShell>
      </body>
    </html>
  );
}
