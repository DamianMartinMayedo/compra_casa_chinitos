exports.up = (pgm) => {
  pgm.createTable('property_item_responses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    property_id: { type: 'uuid', notNull: true, references: 'properties(id)', onDelete: 'CASCADE' },
    checklist_item_id: { type: 'uuid', notNull: true, references: 'checklist_items(id)', onDelete: 'CASCADE' },
    checked: { type: 'boolean' },
    text_value: { type: 'text' },
    number_value: { type: 'numeric' },
    rating_value: { type: 'integer' },
    status_value: { type: 'text' },
    note: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Una sola respuesta por casa + item (habilita upsert idempotente)
  pgm.addConstraint('property_item_responses', 'property_item_responses_property_item_unique', {
    unique: ['property_id', 'checklist_item_id'],
  });
};

exports.down = (pgm) => {
  pgm.dropTable('property_item_responses');
};
