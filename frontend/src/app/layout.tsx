import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Employee Directory",
  description: "Manage employee records",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
