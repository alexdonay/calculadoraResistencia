// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <<<< ESTA LINHA É ESSENCIAL!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Simulador de Circuitos", // Você pode customizar o título aqui
  description: "Criado com Next.js e Tailwind CSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={inter.className}>{children}</body>
    </html>
  );
}