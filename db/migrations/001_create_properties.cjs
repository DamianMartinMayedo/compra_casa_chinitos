exports.up = (pgm) => {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
  
  pgm.createTable('properties', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'text', notNull: true },
    google_address: { type: 'text', notNull: true },
    price_eur: { type: 'integer', notNull: true },
    municipality: { type: 'text' },
    idealista_url: { type: 'text' },
    type: { type: 'text' },
    built_area_m2: { type: 'integer' },
    plot_area_m2: { type: 'integer' },
    bedrooms: { type: 'integer' },
    bathrooms: { type: 'integer' },
    floors: { type: 'integer' },
    year_built: { type: 'integer' },
    initial_state_summary: { type: 'text' },
    additional_notes: { type: 'text' },
    budget_min_eur: { type: 'integer' },
    budget_max_eur: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('properties');
};
