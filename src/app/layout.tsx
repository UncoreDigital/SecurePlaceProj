import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import ResourcePreloader from "@/components/ResourcePreloader";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import "./globals.css";

// Optimize font loading with display swap for faster initial render
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Only preload primary font
});

export const metadata: Metadata = {
  title: "Secure Place to Work",
  description: "Next Generation Security Solution for Employees",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          <ResourcePreloader />
          {children}
          <Toaster richColors position="bottom-center" />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
