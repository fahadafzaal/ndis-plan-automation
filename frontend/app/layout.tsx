import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDIS Plan Automation",
  description: "AI-assisted NDIS participant plan drafting tool with human oversight",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
