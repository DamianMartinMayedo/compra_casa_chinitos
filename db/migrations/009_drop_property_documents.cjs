// La tabla property_documents no se usa: el control de documentos a pedir se hace
// con la sección "Información y documentos a pedir" del checklist (items 'status').
// down() la recrea por reproducibilidad.

exports.up = (pgm) => {
  pgm.dropTable('property_documents');
};

exports.down = (pgm) => {
  pgm.createTable('property_documents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    property_id: { type: 'uuid', notNull: true, references: 'properties(id)', onDelete: 'CASCADE' },
    document_name: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
    note: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};
