import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Digital AI",
  description: "Servidor privado Gemini, Nano Banana e Veo para o projeto Design Digital.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
