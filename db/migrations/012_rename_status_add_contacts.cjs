exports.up = async (pgm) => {
  // 1. Drop old CHECK constraint on status
  pgm.sql(`ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check`);

  // 2. Add new status values and rename en_estudio → por_visitar
  pgm.sql(`UPDATE properties SET status = 'por_visitar' WHERE status = 'en_estudio'`);

  // 3. Add new CHECK constraint with all four statuses
  pgm.sql(`
    ALTER TABLE properties
      ADD CONSTRAINT properties_status_check
      CHECK (status IN ('de_interes', 'por_visitar', 'visitada', 'descartada'))
  `);

  // 4. Change default to de_interes
  pgm.sql(`ALTER TABLE properties ALTER COLUMN status SET DEFAULT 'de_interes'`);

  // 5. Create contacts table
  pgm.createTable('property_contacts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    property_id: {
      type: 'uuid',
      notNull: true,
      references: '"properties"',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    role: { type: 'text' }, // agente, propietario, etc.
    phone: { type: 'text' },
    email: { type: 'text' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('property_contacts');
  pgm.sql(`ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check`);
  pgm.sql(`UPDATE properties SET status = 'en_estudio' WHERE status = 'por_visitar'`);
  pgm.sql(`
    ALTER TABLE properties
      ADD CONSTRAINT properties_status_check
      CHECK (status IN ('en_estudio', 'visitada', 'descartada'))
  `);
  pgm.sql(`ALTER TABLE properties ALTER COLUMN status SET DEFAULT 'en_estudio'`);
};
