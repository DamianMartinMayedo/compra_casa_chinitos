exports.up = (pgm) => {
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
};

exports.down = (pgm) => {
  pgm.dropTable('property_visits');
};
