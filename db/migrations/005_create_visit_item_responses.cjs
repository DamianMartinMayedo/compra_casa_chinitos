exports.up = (pgm) => {
  pgm.createTable('visit_item_responses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    visit_id: { type: 'uuid', notNull: true, references: 'property_visits(id)', onDelete: 'CASCADE' },
    checklist_item_id: { type: 'uuid', notNull: true, references: 'checklist_items(id)', onDelete: 'CASCADE' },
    checked: { type: 'boolean' },
    text_value: { type: 'text' },
    number_value: { type: 'numeric' },
    rating_value: { type: 'integer' },
    status_value: { type: 'text' },
    pending_note: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('visit_item_responses');
};
