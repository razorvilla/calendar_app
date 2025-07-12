exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('lockout_until');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('failed_login_attempts');
    table.dropColumn('lockout_until');
  });
};