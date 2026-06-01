exports.up = (pgm) => {
  pgm.createTable('checklist_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    section_id: { type: 'uuid', notNull: true, references: 'checklist_sections(id)', onDelete: 'CASCADE' },
    property_id: { type: 'uuid', references: 'properties(id)', onDelete: 'CASCADE' },
    label: { type: 'text', notNull: true },
    item_type: { type: 'text', notNull: true },
    placeholder: { type: 'text' },
    help_text: { type: 'text' },
    is_required: { type: 'boolean', default: false },
    is_default: { type: 'boolean', default: true },
    sort_order: { type: 'integer', notNull: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('checklist_items');
};
