import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Política de privacidad — Mnemora" };

export default function PrivacidadPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF" }}>
      <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(26,22,18,0.08)", background: "#FAFAF8" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, background: "#1B3F2F", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#1A1612", fontFamily: "var(--font-display, sans-serif)" }}>Mnemora</span>
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>Política de privacidad</h1>
        <p style={{ fontSize: 13, color: "#9E9389", marginBottom: 40 }}>Última actualización: julio de 2025</p>

        {[
          {
            title: "1. Qué información recopilamos",
            body: "Recopilamos la información que tú nos proporcionas al registrarte (nombre, email) y el contenido que subes a la plataforma (documentos, apuntes). También registramos datos de uso como sesiones de estudio, progreso en flashcards y resultados de quiz para brindarte un servicio personalizado.",
          },
          {
            title: "2. Cómo usamos tu información",
            body: "Usamos tu información para operar el servicio, generar flashcards y resúmenes, personalizar tu plan de estudio y mejorar la experiencia de la plataforma. No vendemos tu información personal a terceros.",
          },
          {
            title: "3. Almacenamiento y seguridad",
            body: "Tus datos se almacenan en servidores seguros. Utilizamos cifrado en tránsito (HTTPS) y en reposo. El acceso a los datos está restringido mediante autenticación y políticas de fila por usuario (Row Level Security).",
          },
          {
            title: "4. Servicios de terceros",
            body: "Utilizamos servicios externos para operar la plataforma: Supabase (base de datos y autenticación), Vercel (hosting), Hotmart (procesamiento de pagos) y proveedores de IA para generar contenido de estudio. Cada proveedor tiene sus propias políticas de privacidad.",
          },
          {
            title: "5. Cookies",
            body: "Utilizamos cookies esenciales para mantener tu sesión activa. No usamos cookies de seguimiento publicitario.",
          },
          {
            title: "6. Tus derechos",
            body: "Puedes solicitar en cualquier momento el acceso, corrección o eliminación de tus datos personales. Para ejercer estos derechos, escríbenos a privacidad@mnemora.app.",
          },
          {
            title: "7. Menores de edad",
            body: "Mnemora está diseñado para mayores de 13 años. No recopilamos intencionalmente información de menores de esa edad.",
          },
          {
            title: "8. Cambios en esta política",
            body: "Podemos actualizar esta política periódicamente. Te notificaremos por email ante cambios importantes.",
          },
          {
            title: "9. Contacto",
            body: "Para consultas sobre privacidad, escríbenos a privacidad@mnemora.app.",
          },
        ].map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A1612", marginBottom: 8 }}>{title}</h2>
            <p style={{ fontSize: 14, color: "#4A4039", lineHeight: 1.7 }}>{body}</p>
          </section>
        ))}

        <div style={{ borderTop: "1px solid rgba(26,22,18,0.08)", paddingTop: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/terminos" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600, textDecoration: "none" }}>Términos de uso</Link>
          <Link href="/contacto" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600, textDecoration: "none" }}>Contacto</Link>
          <Link href="/" style={{ fontSize: 13, color: "#9E9389", textDecoration: "none" }}>Volver al inicio</Link>
        </div>
      </main>
    </div>
  );
}
