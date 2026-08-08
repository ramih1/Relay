import type { Metadata } from "next";
import { RelayProvider } from "@/components/relay-provider";
import "./globals.css";
import "./vision.css";

export const metadata: Metadata = {
  title: "Relay",
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
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <RelayProvider>{children}</RelayProvider>
      </body>
    </html>
  );
}
