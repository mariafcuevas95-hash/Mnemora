import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@/components/analytics";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mnemora — La IA que recuerda todo lo que estudiaste",
  description:
    "Sube el programa de tu materia. Mnemora organiza tu semestre, crea flashcards y te dice qué estudiar hoy. El tutor con memoria que estudia contigo.",
  openGraph: {
    title: "Mnemora — La IA que recuerda todo lo que estudiaste",
    description:
      "Sube el programa de tu materia. Mnemora organiza tu semestre, crea flashcards y te dice qué estudiar hoy.",
    type: "website",
    locale: "es_419",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
