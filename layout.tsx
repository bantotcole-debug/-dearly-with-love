import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dearly, with love ♡",
  description: "A little corner of the internet for anonymous letters.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
