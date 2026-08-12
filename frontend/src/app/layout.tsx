import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import EntryGate from "@/components/EntryGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mutual NDA Creator",
  description: "Fill in a form and generate a Common Paper Mutual Non-Disclosure Agreement.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <EntryGate>{children}</EntryGate>
      </body>
    </html>
  );
}
