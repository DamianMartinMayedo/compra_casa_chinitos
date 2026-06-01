# Casa Chinitos — gestor de visitas a viviendas

App privada para evaluar y comparar viviendas en proceso de compra (Sevilla y alrededores): datos de cada vivienda, checklist editable por secciones, registro de visitas con respuestas, control de documentos y presupuestos de reforma.

## Stack

- **Frontend:** Vite + React 19 + React Router 7 (TypeScript)
- **API:** Netlify Functions (serverless) en `netlify/functions/`
- **DB:** Neon Postgres (`@neondatabase/serverless`)
- **Migraciones:** `node-pg-migrate` (`db/migrations/`)
- **Seed:** `db/seeds/seed.cjs`

## Requisitos

Node 20+ y una `DATABASE_URL` de Neon. Copia `.env.example` a `.env` y rellénala:

```bash
cp .env.example .env
# DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
```

## Arrancar en local

> **Importante:** usa `netlify:dev`, no `vite`. El `npm run dev` levanta solo el
> frontend (Vite, puerto 5173) y **las llamadas `/api/*` no funcionan** porque no
> hay servidor de funciones. La app real se sirve en **http://localhost:8888**.

```bash
npm install
npm run netlify:dev   # frontend + funciones serverless → http://localhost:8888
```

## Base de datos

```bash
npm run db:migrate    # aplica migraciones desde cero
npm run db:seed       # carga 3 viviendas + checklist base (idempotente)
```

## Build

```bash
npm run build         # tsc -b && vite build  → dist/
npm run preview       # previsualiza el build
```

## Estructura

```
db/migrations/        Migraciones (.cjs)
db/seeds/seed.cjs     Seed inicial
netlify/functions/    Endpoints: properties.js, visits.js, checklist.js
src/pages/            Páginas React (lista, detalle, visitas, detalle de visita)
src/styles/global.css Design tokens (OKLCH) y sistema de UI
PRODUCT.md            Contexto estratégico de producto (skill impeccable)
```

## API (vía redirect `/api/*` → `/.netlify/functions/:splat`)

`GET/POST /api/properties` · `GET/PATCH/DELETE /api/properties/:id` ·
`GET/POST /api/properties/:id/visits` · `GET/PATCH /api/visits/:id` ·
`GET/POST/PATCH/DELETE /api/checklist/{sections,items}` ·
`POST/PATCH /api/checklist/response`

## Diseño

Toda la UI sigue las skills de `.agents/skills/` (ver `AGENTS.md` y `PRODUCT.md`).
Lidera `impeccable` en registro **product**: escala tipográfica fija, color
contenido (un acento), estados completos (hover/focus/active/disabled/loading/
empty), skeletons en carga y motion sobrio que comunica estado. No introducir
anti-patrones (badges de color sin significado, fuentes/sombras prohibidas,
motion lineal).
