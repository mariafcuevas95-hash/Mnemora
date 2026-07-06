import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Términos de uso — Mnemora" };

export default function TerminosPage() {
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
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>Términos de uso</h1>
        <p style={{ fontSize: 13, color: "#9E9389", marginBottom: 40 }}>Última actualización: julio de 2025</p>

        {[
          {
            title: "1. Aceptación de los términos",
            body: "Al crear una cuenta o utilizar Mnemora, aceptas estos Términos de uso. Si no estás de acuerdo con alguna parte, no debes utilizar el servicio.",
          },
          {
            title: "2. Descripción del servicio",
            body: "Mnemora es una plataforma de estudio asistida por inteligencia artificial. Ofrece funciones como tutor conversacional, generación de flashcards, planificación académica y análisis de progreso. El servicio se brinda según el plan contratado (Free, Pro o Premium).",
          },
          {
            title: "3. Uso aceptable",
            body: "Debes utilizar Mnemora únicamente con fines académicos personales. Está prohibido revender, copiar o distribuir el contenido generado por la plataforma, así como intentar acceder a sistemas o datos de otros usuarios.",
          },
          {
            title: "4. Contenido del usuario",
            body: "Al subir documentos, apuntes u otro material, confirmas que tienes los derechos necesarios sobre ese contenido. Mnemora utiliza ese material exclusivamente para brindarte el servicio.",
          },
          {
            title: "5. Planes y pagos",
            body: "Los planes de pago se facturan mensual o anualmente según la opción elegida. Las suscripciones se renuevan automáticamente hasta que las canceles. No ofrecemos reembolsos por períodos parciales, salvo en los casos requeridos por la ley aplicable.",
          },
          {
            title: "6. Cancelación",
            body: "Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta o contactándonos. Seguirás teniendo acceso al plan pagado hasta el final del período en curso.",
          },
          {
            title: "7. Limitación de responsabilidad",
            body: "Mnemora es una herramienta de apoyo al estudio. No garantizamos resultados académicos específicos. La plataforma se ofrece 'tal como está', sin garantías de disponibilidad continua.",
          },
          {
            title: "8. Cambios en los términos",
            body: "Podemos actualizar estos términos en cualquier momento. Te notificaremos por email ante cambios importantes. El uso continuado del servicio implica la aceptación de los términos actualizados.",
          },
          {
            title: "9. Contacto",
            body: "Para consultas sobre estos términos, escríbenos a legal@mnemora.app.",
          },
        ].map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A1612", marginBottom: 8 }}>{title}</h2>
            <p style={{ fontSize: 14, color: "#4A4039", lineHeight: 1.7 }}>{body}</p>
          </section>
        ))}

        <div style={{ borderTop: "1px solid rgba(26,22,18,0.08)", paddingTop: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/privacidad" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600, textDecoration: "none" }}>Política de privacidad</Link>
          <Link href="/contacto" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600, textDecoration: "none" }}>Contacto</Link>
          <Link href="/" style={{ fontSize: 13, color: "#9E9389", textDecoration: "none" }}>Volver al inicio</Link>
        </div>
      </main>
    </div>
  );
}
