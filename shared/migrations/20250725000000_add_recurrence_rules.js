exports.up = function(knex) {
  return knex.schema.createTable('recurrence_rules', table => {
    table.uuid('event_id').primary().references('id').inTable('events').onDelete('CASCADE');
    table.string('frequency').notNullable();
    table.integer('interval');
    table.integer('count');
    table.timestamp('until');
    table.specificType('by_day', 'text[]');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('recurrence_rules');
};
