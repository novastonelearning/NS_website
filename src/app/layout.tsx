import type { Metadata } from "next";
import { Archivo, Libre_Caslon_Text } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const caslon = Libre_Caslon_Text({
  variable: "--font-caslon",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.novastonelearning.com"),
  title: "Novastone Learning | Leadership Film Series",
  description:
    "Cinematic-quality short films and AI character conversations for graduate programs in educational leadership.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${caslon.variable} antialiased`}>
      <body className="min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
