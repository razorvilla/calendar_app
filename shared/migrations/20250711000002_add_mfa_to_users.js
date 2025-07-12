exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.text('mfa_secret').nullable();
    table.boolean('mfa_enabled').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('mfa_secret');
    table.dropColumn('mfa_enabled');
  });
};