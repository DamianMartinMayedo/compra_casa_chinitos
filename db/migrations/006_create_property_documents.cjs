exports.up = (pgm) => {
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

exports.down = (pgm) => {
  pgm.dropTable('property_documents');
};
