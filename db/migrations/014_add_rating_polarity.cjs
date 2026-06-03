// rating_high_is_good: true = mayor es mejor (zona, luz…)
//                      false = mayor es peor (obra, ruido…)
//                      null  = sin polaridad (escala neutral)
exports.up = (pgm) => {
  pgm.addColumns('checklist_items', {
    rating_high_is_good: { type: 'boolean', default: null },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('checklist_items', ['rating_high_is_good']);
};
