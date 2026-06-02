const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function seed() {
  console.log('Starting seed...');

  const properties = [
    {
      name: 'Sanlúcar la Mayor - Sor Ángela de la Cruz',
      google_address: 'Calle Sor Ángela de la Cruz, Sanlúcar la Mayor, Sevilla',
      price_eur: 145000,
      municipality: 'Sanlúcar la Mayor',
      idealista_url: 'https://www.idealista.com/inmueble/111114386/',
      type: 'Chalet adosado',
      built_area_m2: 112,
      plot_area_m2: 85,
      bedrooms: 4,
      bathrooms: 2,
      floors: 2,
      initial_state_summary: 'Casa antigua anunciada para reformar; se comentó necesidad de reforma de fontanería e integral.',
      additional_notes: 'Riesgo alto de obra oculta. Revisar fontanería, electricidad, humedades, baños, cocina, carpinterías y cubierta.',
      budget_min_eur: 25000,
      budget_max_eur: 67000,
    },
    {
      name: 'Pilas - Calle Magallanes',
      google_address: 'Calle Magallanes, Pilas, Sevilla',
      price_eur: 144900,
      municipality: 'Pilas',
      idealista_url: 'https://www.idealista.com/inmueble/110599769/',
      type: 'Chalet adosado',
      built_area_m2: 124,
      bedrooms: 3,
      bathrooms: 2,
      year_built: 2003,
      initial_state_summary: 'Anunciada en buen estado; no se comentó reforma necesaria.',
      additional_notes: 'Tiene garaje, trastero, terraza y aire acondicionado. Detectar costes ocultos o mantenimiento pendiente.',
    },
    {
      name: 'Carrión de los Céspedes - Cronista Manuel García Fernández',
      google_address: 'Calle Cronista Manuel García Fernández, Carrión de los Céspedes, Sevilla',
      price_eur: 137000,
      municipality: 'Carrión de los Céspedes',
      idealista_url: 'https://www.idealista.com/inmueble/110563662/',
      type: 'Casa o chalet independiente',
      built_area_m2: 122,
      bedrooms: 3,
      bathrooms: 3,
      initial_state_summary: 'Buen estado según anuncio, pero se comentó necesidad de pintar fachada, amueblar cocina y poner puertas interiores.',
      additional_notes: 'Puede permitir entrada progresiva, priorizando habitabilidad básica y mejoras por fases.',
      budget_min_eur: 2500,
      budget_max_eur: 10500,
    },
    {
      name: 'Ref. 111589969 · visita 2 jun',
      idealista_url: 'https://www.idealista.com/inmueble/111589969/',
      status: 'en_estudio',
      visit_date: '2026-06-02',
      additional_notes: 'Visita concertada para el 2 de junio. Pendiente de completar precio, dirección y características del anuncio.',
    },
    {
      name: 'Ref. 109643913 · 3 hab',
      idealista_url: 'https://www.idealista.com/inmueble/109643913/',
      price_eur: 99900,
      bedrooms: 3,
      status: 'en_estudio',
      additional_notes: 'Opción de 3 habitaciones por 99.900 €. Pendiente de completar dirección y resto de características.',
    },
  ];

  for (const prop of properties) {
    await sql`
      INSERT INTO properties (name, google_address, price_eur, municipality, idealista_url, type, built_area_m2, plot_area_m2, bedrooms, bathrooms, floors, year_built, initial_state_summary, additional_notes, budget_min_eur, budget_max_eur, status, visit_date)
      VALUES (${prop.name}, ${prop.google_address || null}, ${prop.price_eur || null}, ${prop.municipality || null}, ${prop.idealista_url || null}, ${prop.type || null}, ${prop.built_area_m2 || null}, ${prop.plot_area_m2 || null}, ${prop.bedrooms || null}, ${prop.bathrooms || null}, ${prop.floors || null}, ${prop.year_built || null}, ${prop.initial_state_summary || null}, ${prop.additional_notes || null}, ${prop.budget_min_eur || null}, ${prop.budget_max_eur || null}, ${prop.status || 'en_estudio'}, ${prop.visit_date || null})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log('Properties seeded');

  const sections = [
    { name: 'Exterior y entorno', sort_order: 1 },
    { name: 'Interior', sort_order: 2 },
    { name: 'Instalaciones', sort_order: 3 },
    { name: 'Preguntas abiertas', sort_order: 4 },
    { name: 'Información y documentos a pedir', sort_order: 5 },
    { name: 'Valoración final', sort_order: 6 },
  ];

  for (const section of sections) {
    await sql`
      INSERT INTO checklist_sections (name, sort_order, is_default)
      VALUES (${section.name}, ${section.sort_order}, true)
      ON CONFLICT DO NOTHING
    `;
  }
  console.log('Checklist sections seeded');

  const sectionRows = await sql`SELECT id, name FROM checklist_sections`;
  const sectionMap = {};
  sectionRows.forEach(row => { sectionMap[row.name] = row.id; });

  const globalItems = [
    { section: 'Exterior y entorno', label: 'La calle y el entorno transmiten buena sensación', item_type: 'checkbox', sort_order: 1 },
    { section: 'Exterior y entorno', label: 'Hay servicios cerca', item_type: 'checkbox', sort_order: 2 },
    { section: 'Exterior y entorno', label: 'La conexión general en coche es cómoda', item_type: 'checkbox', sort_order: 3 },
    { section: 'Exterior y entorno', label: 'La fachada no muestra grietas preocupantes', item_type: 'checkbox', sort_order: 4 },
    { section: 'Exterior y entorno', label: 'No se ven humedades exteriores relevantes', item_type: 'checkbox', sort_order: 5 },
    { section: 'Exterior y entorno', label: 'Cubierta o tejado sin señales claras de filtración', item_type: 'checkbox', sort_order: 6 },
    { section: 'Exterior y entorno', label: 'El patio o exterior drena bien', item_type: 'checkbox', sort_order: 7 },
    { section: 'Exterior y entorno', label: 'Muros y medianeras se ven firmes', item_type: 'checkbox', sort_order: 8 },

    { section: 'Interior', label: 'La distribución funciona para la familia', item_type: 'checkbox', sort_order: 1 },
    { section: 'Interior', label: 'Hay espacio útil para despacho', item_type: 'checkbox', sort_order: 2 },
    { section: 'Interior', label: 'Hay espacio futuro para cuarto infantil', item_type: 'checkbox', sort_order: 3 },
    { section: 'Interior', label: 'El salón tiene tamaño suficiente', item_type: 'checkbox', sort_order: 4 },
    { section: 'Interior', label: 'Cocina y baños son funcionales o recuperables', item_type: 'checkbox', sort_order: 5 },
    { section: 'Interior', label: 'Suelos en estado aceptable', item_type: 'checkbox', sort_order: 6 },
    { section: 'Interior', label: 'Puertas y ventanas funcionan bien', item_type: 'checkbox', sort_order: 7 },
    { section: 'Interior', label: 'Hay luz natural suficiente', item_type: 'checkbox', sort_order: 8 },
    { section: 'Interior', label: 'Hay ventilación adecuada', item_type: 'checkbox', sort_order: 9 },
    { section: 'Interior', label: 'No se detecta olor a humedad', item_type: 'checkbox', sort_order: 10 },
    { section: 'Interior', label: 'No se observan manchas, moho ni goteras', item_type: 'checkbox', sort_order: 11 },
    { section: 'Interior', label: 'No se observan grietas interiores importantes', item_type: 'checkbox', sort_order: 12 },
    { section: 'Interior', label: 'Escaleras y barandillas se sienten seguras', item_type: 'checkbox', sort_order: 13 },

    { section: 'Instalaciones', label: 'La presión del agua parece correcta', item_type: 'checkbox', sort_order: 1 },
    { section: 'Instalaciones', label: 'Grifos funcionan', item_type: 'checkbox', sort_order: 2 },
    { section: 'Instalaciones', label: 'Cisternas funcionan', item_type: 'checkbox', sort_order: 3 },
    { section: 'Instalaciones', label: 'Los desagües tragan bien', item_type: 'checkbox', sort_order: 4 },
    { section: 'Instalaciones', label: 'El cuadro eléctrico parece correcto', item_type: 'checkbox', sort_order: 5 },
    { section: 'Instalaciones', label: 'Hay enchufes suficientes', item_type: 'checkbox', sort_order: 6 },
    { section: 'Instalaciones', label: 'No hay señales de cableado antiguo o improvisado', item_type: 'checkbox', sort_order: 7 },
    { section: 'Instalaciones', label: 'El sistema de agua caliente funciona', item_type: 'checkbox', sort_order: 8 },
    { section: 'Instalaciones', label: 'Hay aire acondicionado o preinstalación suficiente', item_type: 'checkbox', sort_order: 9 },
    { section: 'Instalaciones', label: 'No se ven problemas en bajantes o tuberías', item_type: 'checkbox', sort_order: 10 },

    { section: 'Preguntas abiertas', label: '¿Qué reformas o mantenimientos se han hecho y cuándo?', item_type: 'textarea', sort_order: 1 },
    { section: 'Preguntas abiertas', label: '¿Ha habido humedades o filtraciones?', item_type: 'textarea', sort_order: 2 },
    { section: 'Preguntas abiertas', label: '¿Qué elementos se quedan dentro de la vivienda?', item_type: 'textarea', sort_order: 3 },
    { section: 'Preguntas abiertas', label: '¿Hay margen real de negociación en el precio?', item_type: 'textarea', sort_order: 4 },
    { section: 'Preguntas abiertas', label: '¿Cuál sería el plazo real de entrega?', item_type: 'textarea', sort_order: 5 },
    { section: 'Preguntas abiertas', label: '¿Hay incidencias con vecinos, comunidad o derramas?', item_type: 'textarea', sort_order: 6 },

    { section: 'Información y documentos a pedir', label: 'Nota simple actualizada', item_type: 'status', sort_order: 1 },
    { section: 'Información y documentos a pedir', label: 'Último recibo del IBI', item_type: 'status', sort_order: 2 },
    { section: 'Información y documentos a pedir', label: 'Certificado energético', item_type: 'status', sort_order: 3 },
    { section: 'Información y documentos a pedir', label: 'Recibos de suministros', item_type: 'status', sort_order: 4 },
    { section: 'Información y documentos a pedir', label: 'Información sobre cargas o deudas', item_type: 'status', sort_order: 5 },
    { section: 'Información y documentos a pedir', label: 'Facturas de reformas previas', item_type: 'status', sort_order: 6 },
    { section: 'Información y documentos a pedir', label: 'Planos o croquis', item_type: 'status', sort_order: 7 },
    { section: 'Información y documentos a pedir', label: 'Inventario de lo que se queda', item_type: 'status', sort_order: 8 },

    { section: 'Valoración final', label: 'Nota zona y entorno', item_type: 'rating', sort_order: 1 },
    { section: 'Valoración final', label: 'Nota tamaño y distribución', item_type: 'rating', sort_order: 2 },
    { section: 'Valoración final', label: 'Nota estado real', item_type: 'rating', sort_order: 3 },
    { section: 'Valoración final', label: 'Nota necesidad de inversión', item_type: 'rating', sort_order: 4 },
    { section: 'Valoración final', label: 'Nota encaje familiar', item_type: 'rating', sort_order: 5 },
    { section: 'Valoración final', label: 'Nota encaje económico', item_type: 'rating', sort_order: 6 },
    { section: 'Valoración final', label: 'Sensación final en caliente', item_type: 'textarea', sort_order: 7 },
    { section: 'Valoración final', label: 'Precio de compra observado', item_type: 'number', sort_order: 8 },
    { section: 'Valoración final', label: 'Obra estimada', item_type: 'number', sort_order: 9 },
    { section: 'Valoración final', label: 'Gastos de compra estimados', item_type: 'number', sort_order: 10 },
    { section: 'Valoración final', label: 'Coste total mental', item_type: 'number', sort_order: 11 },
  ];

  for (const item of globalItems) {
    await sql`
      INSERT INTO checklist_items (section_id, property_id, label, item_type, sort_order, is_default, is_active)
      VALUES (${sectionMap[item.section]}, ${null}, ${item.label}, ${item.item_type}, ${item.sort_order}, true, true)
      ON CONFLICT DO NOTHING
    `;
  }

  console.log('Checklist items seeded');
  console.log('Seed complete!');
}

seed().catch(console.error);
