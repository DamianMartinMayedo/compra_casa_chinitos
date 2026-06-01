# AGENTS.md — guía para agentes de IA

Lee esto primero. Evita reexplorar el repo: aquí está lo esencial y los punteros.

- **Qué es y por qué** → [PRODUCT.md](PRODUCT.md) (estrategia, usuarios, principios de diseño).
- **Qué hace y cómo (modelo, API, rutas, reglas)** → [SPEC.md](SPEC.md). Fuente de verdad funcional.
- **Datos iniciales exactos** (3 casas, secciones, items) → `db/seeds/seed.cjs`. No los dupliques.

## En una frase

App privada (sin login) para gestionar la compra de vivienda: el usuario **da de
alta, edita y borra casas** de Idealista/Fotocasa, y al visitarlas rellena **un
checklist global editable** cuyo estado se guarda **por casa**. No hay "visitas".

## Cómo arrancar (IMPORTANTE)

```bash
npm install
npm run netlify:dev   # frontend + funciones serverless → http://localhost:8888
```

> Usa **`netlify:dev`**, no `npm run dev`. Vite solo (5173) **no sirve `/api/*`**
> (no hay servidor de funciones) y la app parece rota. La app real va en **:8888**.

```bash
npm run db:migrate    # migraciones desde cero (node-pg-migrate)
npm run db:seed       # 3 casas + checklist global (idempotente)
npm run build         # tsc -b && vite build
npm run lint
```

`DATABASE_URL` (Neon) en `.env` (ver `.env.example`). Nunca exponer credenciales
en el cliente: la DB solo se toca desde `netlify/functions/`.

## Estructura

```
db/migrations/        Migraciones .cjs (node-pg-migrate)
db/seeds/seed.cjs     Seed inicial (datos)
netlify/functions/    API serverless: properties.js, checklist.js
src/pages/            Páginas React
src/styles/global.css Design tokens (OKLCH) + sistema de UI
PRODUCT.md / SPEC.md  Contexto de producto y especificación
.agents/skills/       Skills de UI (obligatorias, ver abajo)
```

## Modelo (resumen — detalle en SPEC.md)

- `properties` — casas (CRUD completo desde la UI). `google_address` → Google Maps;
  `idealista_url` → enlace al anuncio.
- `checklist_sections` + `checklist_items` — **un** checklist global, editable.
- `property_item_responses` — respuestas por casa (upsert, UNIQUE(property_id, item)).
- Eliminado: `property_visits`, `visit_item_responses` (concepto "visitas").

## Convenciones de código

- **Funciones serverless**: patrón uniforme — `neon(process.env.DATABASE_URL)`,
  headers CORS, `event.path.replace(...)` + split de ruta, despacho por método,
  `try/catch` → 500. Sigue el estilo de las funciones existentes.
- **Frontend**: TypeScript, React Router. Las llamadas usan rutas `/api/*`.
- **Estilos**: usa las **clases y tokens de `src/styles/global.css`**. Evita
  estilos inline salvo one-offs de layout. Registro **product** (ver skills).

## UI/UX — reglas obligatorias (skills)

Toda decisión de UI sigue las skills de `.agents/skills/`: **impeccable** (lidera,
registro *product*), **emil-design-eng** (pulido/micro-interacciones), y los
anti-patrones universales de **gpt-taste** y **high-end-visual-design**. Esta app
es una **herramienta/producto**, no una landing: nada de hero/AIDA/GSAP.

1. **Consulta las skills antes de escribir UI.** `impeccable` exige correr
   `node .agents/skills/impeccable/scripts/context.mjs` una vez por sesión (lee
   PRODUCT.md). Sigue su `reference/product.md`.
2. **Principios product**: escala tipográfica **fija** (no `clamp` fluido), una
   sola familia (Geist), color contenido (un acento, OKLCH), estados completos en
   cada componente (default/hover/focus/active/disabled/loading/empty/error),
   **skeletons** en carga, motion 150–250ms que **comunica estado** (sin secuencias
   orquestadas), `prefers-reduced-motion` siempre.
3. **Badges con significado**: color solo para estado real (pendiente/recibido/
   falta…), nunca decorativo. El tipo de casa va en badge neutro.
4. **Prohibido**: fuentes Inter/Roboto/Arial; iconos gruesos por defecto; bordes
   1px gris + sombra ancha juntos como decoración; `border-radius` >16px en cards;
   gradient text; glassmorphism por defecto; motion lineal/instantáneo.
5. **Accesibilidad**: contraste ≥4.5:1 en cuerpo; targets táctiles ~44px (uso en
   móvil durante la visita); no depender solo del color.
