import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDIS Plan Automation",
  description: "AI-assisted NDIS care plan drafting with mandatory human oversight",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
