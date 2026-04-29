import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CatalogFlow AI",
  description: "Internal catalog workflow tool for SPB Textile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

