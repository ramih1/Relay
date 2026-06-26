import type { Metadata } from "next";
import { JarvisProvider } from "@/components/jarvis-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS",
  description: "A calm AI productivity command center with transparent approvals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <JarvisProvider>{children}</JarvisProvider>
      </body>
    </html>
  );
}
