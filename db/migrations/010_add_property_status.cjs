// Añade el ciclo de vida de cada casa: en estudio -> visitada -> descartada
// (descartada = archivada, se mantiene en BD, no se borra). Además guarda la
// fecha de visita y relaja precio/dirección a opcionales para poder dar de alta
// una ficha en cuanto se encuentra el anuncio, aunque falten datos.

exports.up = (pgm) => {
  pgm.addColumns('properties', {
    status: { type: 'text', notNull: true, default: 'en_estudio' },
    visit_date: { type: 'date' },
  });

  pgm.addConstraint('properties', 'properties_status_check', {
    check: "status IN ('en_estudio', 'visitada', 'descartada')",
  });

  // Permitir altas rápidas sin todos los datos del anuncio todavía.
  pgm.alterColumn('properties', 'price_eur', { notNull: false });
  pgm.alterColumn('properties', 'google_address', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('properties', 'google_address', { notNull: true });
  pgm.alterColumn('properties', 'price_eur', { notNull: true });
  pgm.dropConstraint('properties', 'properties_status_check');
  pgm.dropColumns('properties', ['status', 'visit_date']);
};
