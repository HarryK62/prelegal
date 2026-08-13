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
  title: "Prelegal Document Creator",
  description: "Chat with an AI assistant to draft a Common Paper legal agreement.",
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
