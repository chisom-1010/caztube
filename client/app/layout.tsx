import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "caZTube - Video Streaming Platform",
  description:
    "A modern video streaming platform built with Next.js and Express",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <main>{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
