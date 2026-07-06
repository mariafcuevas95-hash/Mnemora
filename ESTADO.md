# Mnemora — Estado del Proyecto

> Última actualización: Session 7 completada

---

## ✅ Qué está construido

### Frontend (100%)
| Página | Ruta | Estado |
|--------|------|--------|
| Landing (11 secciones) | `/` | ✅ Completo |
| Registro (2 pasos) | `/registro` | ✅ Completo |
| Login | `/login` | ✅ Completo |
| Onboarding (5 pasos) | `/onboarding` | ✅ Completo |
| Paywall | `/upgrade` | ✅ Completo |
| Dashboard | `/dashboard` | ✅ Completo |
| Materia detalle | `/materias/[id]` | ✅ Completo |
| Tutor IA (chat) | `/tutor/[id]` | ✅ Completo |
| Calendario | `/calendario` | ✅ Completo |

### Backend (100%)
| Endpoint | Descripción | Estado |
|----------|-------------|--------|
| `POST /api/chat` | Tutor IA con streaming SSE | ✅ Completo |
| `POST /api/process-document` | PDF → flashcards + calendario | ✅ Completo |
| `POST /api/webhooks/hotmart` | Pagos + idempotencia | ✅ Completo |

### Infraestructura (100%)
| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `middleware.ts` | Auth guard + redirects | ✅ Completo |
| `lib/supabase/` | Cliente browser + server + admin | ✅ Completo |
| `lib/mem0.ts` | Memoria académica por materia | ✅ Completo |
| `lib/resend.ts` | Emails transaccionales | ✅ Completo |
| `lib/rate-limit.ts` | Rate limiting por usuario | ✅ Completo |
| `supabase/migrations/001_initial.sql` | Schema completo con RLS | ✅ Completo |
| `next.config.ts` | Security headers + CSP | ✅ Completo |

---

## 🚀 Pasos para hacer el deploy

### 1. Supabase
1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Ir a **SQL Editor** → pegar y ejecutar `supabase/migrations/001_initial.sql`
4. Ir a **Authentication → Providers** → activar Google OAuth
5. Copiar `Project URL` y `anon key` desde **Settings → API**

### 2. Variables de entorno
```bash
cp .env.local.example .env.local
```
Completar `.env.local` con:
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (Settings → API)
- `ANTHROPIC_API_KEY` — desde [console.anthropic.com](https://console.anthropic.com)
- `MEM0_API_KEY` — desde [app.mem0.ai](https://app.mem0.ai)
- `HOTMART_HOTTOK` — desde Hotmart → Webhooks
- `HOTMART_PRO_PRODUCT_ID` — ID del producto Pro en Hotmart
- `RESEND_API_KEY` — desde [resend.com](https://resend.com)
- `RESEND_FROM_EMAIL` — ej: `hola@mnemora.app`
- `NEXT_PUBLIC_APP_URL` — ej: `https://mnemora.app`

### 3. Vercel
```bash
npx vercel
```
O conectar el repositorio desde [vercel.com](https://vercel.com) y agregar las env vars en **Settings → Environment Variables**.

### 4. Dominio
- Comprar `mnemora.app` en Namecheap o Google Domains (~$15/año)
- Configurar DNS en Vercel → Settings → Domains

### 5. Hotmart
1. Crear cuenta en [hotmart.com](https://hotmart.com)
2. Crear producto "Mnemora Pro" — precio $7.99/mes (fundador)
3. Ir a **Ferramentas → Webhooks** → URL: `https://mnemora.app/api/webhooks/hotmart`
4. Copiar el `hottok` generado → `HOTMART_HOTTOK`

### 6. Resend
1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar dominio `mnemora.app`
3. Copiar API key → `RESEND_API_KEY`

---

## 🔒 Seguridad implementada

- ✅ RLS en todas las tablas de Supabase (`auth.uid() = user_id`)
- ✅ Middleware de auth protege rutas `/dashboard`, `/materias`, `/tutor`, `/calendario`, `/flashcards`
- ✅ API keys nunca en cliente — BFF pattern
- ✅ Validación Zod en todos los endpoints
- ✅ Rate limiting: 30 msgs/min (chat), 10 docs/hora (procesamiento)
- ✅ Verificación `x-hotmart-hottok` en webhook
- ✅ Idempotencia en transacciones Hotmart
- ✅ Security headers + CSP en `next.config.ts`
- ✅ `createAdminClient()` (service_role) solo en webhooks server-side

---

## 💡 Reemplazar datos mock con Supabase

Cuando tengas las credenciales, los archivos que usan datos mock y necesitan Supabase son:

| Archivo | Qué reemplazar |
|---------|----------------|
| `app/(app)/layout.tsx` | `MOCK_SUBJECTS` → `supabase.from("subjects").select()` |
| `app/(app)/dashboard/page.tsx` | `TODAY_TASKS`, `UPCOMING`, `SUBJECTS` → queries reales |
| `app/(app)/materias/[id]/page.tsx` | `SUBJECTS_DATA` → query por id |
| `app/(app)/calendario/page.tsx` | `EVENTS` → `calendar_events` table |
| `app/registro/page.tsx` | `window.location.href` → `supabase.auth.signUp()` |
| `app/login/page.tsx` | Form submit → `supabase.auth.signInWithPassword()` |
| `app/onboarding/page.tsx` | `onComplete` → insert en `subjects` + `profiles` update |

---

## 📊 Modelo de negocio

| | Free | Pro Fundador ($7.99/mes) |
|--|------|--------------------------|
| Materias | 2 | Ilimitadas |
| Docs/mes | 3 | Ilimitados |
| Flashcards/mes | 50 | Ilimitadas |
| Tutor IA | 10 msgs/día | Ilimitado |
| Syllabuses | 1 | Ilimitados |
| Precio fundador | — | Primeros 200 usuarios · lifetime |

---

## 🗂 Estructura de archivos

```
mnemora/
├── app/
│   ├── page.tsx                    # Landing
│   ├── layout.tsx                  # Root layout + fonts
│   ├── globals.css                 # Design tokens + animaciones
│   ├── registro/page.tsx
│   ├── login/page.tsx
│   ├── onboarding/page.tsx
│   ├── upgrade/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # Sidebar layout
│   │   ├── dashboard/page.tsx
│   │   ├── materias/[id]/page.tsx
│   │   ├── tutor/[id]/page.tsx
│   │   └── calendario/page.tsx
│   └── api/
│       ├── chat/route.ts           # Streaming SSE
│       ├── process-document/route.ts
│       └── webhooks/hotmart/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── mem0.ts
│   ├── resend.ts
│   └── rate-limit.ts
├── middleware.ts
├── supabase/migrations/001_initial.sql
├── next.config.ts
└── .env.local.example
```
