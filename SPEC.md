# SPEC — Casa Chinitos

Especificación funcional y técnica. Fuente de verdad del comportamiento de la app.
Reemplaza al antiguo `brief_app_viviendas.md` (borrado por obsoleto).

Para el porqué/estrategia y reglas de diseño visual, ver [PRODUCT.md](PRODUCT.md).
Para cómo arrancar, estructura y convenciones, ver [AGENTS.md](AGENTS.md).

## Resumen funcional

App privada (un solo usuario, sin login) para gestionar la compra de vivienda:

1. **Casas** — el usuario da de alta, **edita** y borra casas que encuentra en
   Idealista/Fotocasa. Campos en la tabla `properties`.
   - `google_address` se usa para abrir la dirección en **Google Maps**.
   - `idealista_url` es el enlace al **anuncio** (Idealista o Fotocasa).
2. **Checklist global** — UN único checklist compartido por todas las casas,
   organizado en secciones. El usuario puede **añadir / editar / quitar / activar /
   desactivar / reordenar** sus elementos. No hay items específicos por casa.
3. **Revisión por casa** — al visitar una casa, el usuario abre su checklist y
   marca/anota el estado. Las respuestas se guardan **por casa** (una fila por
   item y casa). Volver a abrir la casa restaura ese estado.

> Concepto **eliminado**: "visitas". No hay registro de múltiples visitas ni sus
> tablas. El checklist se rellena directamente sobre la casa.

## Modelo de datos (Neon Postgres)

Migraciones reproducibles en `db/migrations/*.cjs` (node-pg-migrate). Seed
idempotente en `db/seeds/seed.cjs` — **fuente de verdad de los datos iniciales**
(3 casas + secciones + items globales); no se duplican aquí.

### `properties`
Datos de la vivienda. Campos: `id` uuid pk, `name` text not null, `google_address`
text not null, `price_eur` int not null, `municipality`, `idealista_url` (enlace al
anuncio), `type`, `built_area_m2`, `plot_area_m2`, `bedrooms`, `bathrooms`,
`floors`, `year_built`, `initial_state_summary`, `additional_notes`,
`budget_min_eur`, `budget_max_eur`, `created_at`, `updated_at`.

### `checklist_sections`
Secciones del checklist global. `id` uuid pk, `name` not null, `description`,
`sort_order` int not null, `is_default` bool, timestamps.

### `checklist_items`
Items del checklist **global** (`property_id` siempre null; columna conservada por
compatibilidad pero sin uso). `id` uuid pk, `section_id` fk→checklist_sections,
`label` not null, `item_type` not null, `placeholder`, `help_text`, `is_required`,
`is_default`, `sort_order` not null, `is_active` bool, timestamps.

`item_type` ∈ `checkbox | text | textarea | number | rating | status`.

### `property_item_responses`
Respuestas del checklist **por casa**. `id` uuid pk,
`property_id` fk→properties (on delete cascade),
`checklist_item_id` fk→checklist_items (on delete cascade),
`checked` bool, `text_value`, `number_value` numeric, `rating_value` int,
`status_value`, `note`, timestamps.
**UNIQUE(`property_id`, `checklist_item_id`)** → upsert; una sola fila por casa+item.

`status_value` ∈ `pending | requested | received | missing | not_applicable`.

## API (Netlify Functions, vía redirect `/api/*` → `/.netlify/functions/:splat`)

Enrutado por el **nombre de la función** (primer segmento). Patrón común: cada
función hace `event.path.replace(...)`, parte la ruta y despacha por método.

`netlify/functions/properties.js`
- `GET /api/properties` · `POST /api/properties`
- `GET /api/properties/:id` · `PATCH /api/properties/:id` · `DELETE /api/properties/:id`

`netlify/functions/checklist.js`
- `GET|POST /api/checklist/sections` · `PATCH|DELETE /api/checklist/sections/:id`
- `GET|POST /api/checklist/items` (GET devuelve items globales) ·
  `PATCH|DELETE /api/checklist/items/:id`
- `GET /api/checklist/responses?property_id=X` (respuestas de una casa)
- `POST /api/checklist/response` → **upsert** por (`property_id`,`checklist_item_id`)

## Rutas (frontend, React Router)

- `/` — lista de casas (tabla, info a una línea, responsive) + botón "Nueva casa".
- `/property/new` — formulario de alta.
- `/property/:id` — detalle: datos (con bloque "Más detalles" desplegable), enlace a
  Google Maps y al anuncio, **checklist inline** de la casa (sección "Preguntas"
  colapsada; la de documentos NO va aquí), y arriba a la derecha botón "Documentos"
  + menú "Opciones" (Editar / Eliminar).
- `/property/:id/edit` — edición (mismo formulario).
- `/property/:id/documents` — solo la sección "Información y documentos a pedir" de la casa.
- `/checklist` — gestor del checklist global (añadir/editar/cambiar tipo/activar/quitar
  items y secciones).

El checklist por casa se renderiza con el componente reutilizable
`src/components/Checklist.tsx` (modo `review` para el detalle, `documents` para la
página de documentos). Solo muestra items con `is_active`.

## Reglas de negocio

- Una casa puede existir sin checklist relleno.
- El checklist global existe siempre, independiente de las casas.
- Editar el checklist no invalida respuestas ya guardadas de una casa. Para retirar
  un item preferir **desactivarlo** (`is_active=false`) antes que borrarlo.
- Las respuestas son por casa: misma pregunta, estado independiente en cada casa.
- Guardar una respuesta es idempotente (upsert): no crea duplicados.
- Importes en euros como enteros cuando aplique.
- Migraciones ejecutables desde cero; seed idempotente / reinicializable.

## Helper: Google Maps

Abrir dirección: `https://www.google.com/maps/search/?api=1&query=<encodeURIComponent(google_address)>`.
