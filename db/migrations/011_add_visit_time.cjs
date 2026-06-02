exports.up = (pgm) => {
  pgm.addColumns('properties', {
    visit_time: { type: 'time' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('properties', ['visit_time']);
};
