exports.up = (pgm) => {
  pgm.createTable('checklist_sections', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    sort_order: { type: 'integer', notNull: true },
    is_default: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('checklist_sections');
};
