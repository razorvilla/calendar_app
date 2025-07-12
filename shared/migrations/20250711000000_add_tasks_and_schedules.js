exports.up = function(knex) {
    return knex.schema
        .createTable('tasks', function(table) {
            table.uuid('id').primary();
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('title').notNullable();
            table.text('description');
            table.timestamp('due_date');
            table.boolean('is_completed').notNullable().defaultTo(false);
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.index(['user_id']);
        })
        .createTable('appointment_schedules', function(table) {
            table.uuid('id').primary();
            table.uuid('calendar_id').notNullable().references('id').inTable('calendars').onDelete('CASCADE');
            table.string('name').notNullable();
            table.text('description');
            table.integer('duration_minutes').notNullable();
            table.integer('slot_interval_minutes').notNullable();
            table.jsonb('availability_rules').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.index(['calendar_id']);
        })
        .createTable('appointment_slots', function(table) {
            table.uuid('id').primary();
            table.uuid('schedule_id').notNullable().references('id').inTable('appointment_schedules').onDelete('CASCADE');
            table.timestamp('start_time').notNullable();
            table.timestamp('end_time').notNullable();
            table.boolean('is_booked').notNullable().defaultTo(false);
            table.uuid('booked_by_user_id').references('id').inTable('users').onDelete('SET NULL');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.index(['schedule_id']);
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('appointment_slots')
        .dropTableIfExists('appointment_schedules')
        .dropTableIfExists('tasks');
};