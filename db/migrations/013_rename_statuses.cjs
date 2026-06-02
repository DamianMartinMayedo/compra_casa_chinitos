exports.up = async (pgm) => {
  pgm.sql(`ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check`);
  pgm.sql(`UPDATE properties SET status = 'nueva'       WHERE status = 'de_interes'`);
  pgm.sql(`UPDATE properties SET status = 'me_interesa' WHERE status = 'visitada'`);
  pgm.sql(`
    ALTER TABLE properties ADD CONSTRAINT properties_status_check
    CHECK (status IN ('nueva', 'por_visitar', 'me_interesa', 'descartada'))
  `);
  pgm.sql(`ALTER TABLE properties ALTER COLUMN status SET DEFAULT 'nueva'`);
};

exports.down = async (pgm) => {
  pgm.sql(`ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check`);
  pgm.sql(`UPDATE properties SET status = 'de_interes' WHERE status = 'nueva'`);
  pgm.sql(`UPDATE properties SET status = 'visitada'   WHERE status = 'me_interesa'`);
  pgm.sql(`
    ALTER TABLE properties ADD CONSTRAINT properties_status_check
    CHECK (status IN ('de_interes', 'por_visitar', 'visitada', 'descartada'))
  `);
  pgm.sql(`ALTER TABLE properties ALTER COLUMN status SET DEFAULT 'de_interes'`);
};
