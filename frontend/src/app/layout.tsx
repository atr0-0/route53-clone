import type { Metadata } from "next";
import "@cloudscape-design/global-styles/index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Route 53 | Console",
  description: "AWS Route53 clone — Scaler SDE Fullstack assignment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
