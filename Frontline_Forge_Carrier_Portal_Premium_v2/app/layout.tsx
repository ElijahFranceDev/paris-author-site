import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frontline Forge Solutions Carrier Command Portal",
  description: "Premium carrier operations, recordkeeping, reporting, and support portal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
