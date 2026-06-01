// Elimina el concepto "visitas". El checklist se rellena directamente sobre la
// casa (ver property_item_responses). down() recrea las tablas por reproducibilidad.

exports.up = (pgm) => {
  pgm.dropTable('visit_item_responses');
  pgm.dropTable('property_visits');
};

exports.down = (pgm) => {
  pgm.createTable('property_visits', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    property_id: { type: 'uuid', notNull: true, references: 'properties(id)', onDelete: 'CASCADE' },
    visited_at: { type: 'timestamp' },
    visitor_name: { type: 'text' },
    general_notes: { type: 'text' },
    overall_feeling: { type: 'text' },
    offer_price_considered_eur: { type: 'integer' },
    estimated_purchase_cost_eur: { type: 'integer' },
    estimated_initial_investment_eur: { type: 'integer' },
    estimated_total_cost_eur: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

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
