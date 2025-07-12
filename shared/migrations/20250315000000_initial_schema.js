exports.up = function(knex) {
    return knex.schema
        // Users table
        .createTable('users', function(table) {
            table.uuid('id').primary();
            table.string('email').notNullable().unique();
            table.string('password_hash').notNullable();
            table.string('name');
            table.string('profile_picture');
            table.string('timezone').notNullable().defaultTo('UTC');
            table.boolean('is_email_verified').notNullable().defaultTo(false);
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
        })

        // User preferences table
        .createTable('user_preferences', function(table) {
            table.uuid('id').primary();
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('default_calendar_id');
            table.string('default_view').notNullable().defaultTo('month');
            table.jsonb('working_hours').notNullable();
            table.jsonb('notification_settings').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.unique(['user_id']);
        })

        // Refresh tokens table
        .createTable('refresh_tokens', function(table) {
            table.uuid('id').primary();
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('token').notNullable().unique();
            table.timestamp('expires_at').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.index(['user_id', 'token']);
        })

        // Calendars table
        .createTable('calendars', function(table) {
            table.uuid('id').primary();
            table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('name').notNullable();
            table.text('description');
            table.string('color');
            table.boolean('is_default').notNullable().defaultTo(false);
            table.boolean('is_visible').notNullable().defaultTo(true);
            table.string('external_id');
            table.string('external_source');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.index(['owner_id']);
        })

        // Calendar shares table
        .createTable('calendar_shares', function(table) {
            table.uuid('id').primary();
            table.uuid('calendar_id').notNullable().references('id').inTable('calendars').onDelete('CASCADE');
            table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
            table.string('email');
            table.string('permission').notNullable().defaultTo('view');
            table.string('status').notNullable().defaultTo('pending');
            table.string('invite_token');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.index(['calendar_id']);
            table.index(['user_id']);
            table.unique(['calendar_id', 'user_id']);
            // Removing problematic check constraint
        })

        // Events table
        .createTable('events', function(table) {
            table.uuid('id').primary();
            table.uuid('calendar_id').notNullable().references('id').inTable('calendars').onDelete('CASCADE');
            table.string('title').notNullable();
            table.text('description');
            table.string('location');
            table.timestamp('start_time').notNullable();
            table.timestamp('end_time').notNullable();
            table.boolean('is_all_day').notNullable().defaultTo(false);
            table.string('recurrence_rule');
            table.jsonb('exception_dates');
            table.string('color');
            table.string('visibility').notNullable().defaultTo('default');
            table.string('status').notNullable().defaultTo('confirmed');
            table.uuid('created_by').notNullable().references('id').inTable('users');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.integer('version').notNullable().defaultTo(1);
            table.index(['calendar_id']);
            table.index(['start_time', 'end_time']);
            // Removed event_times_check constraint
        })

        // Event instances table
        .createTable('event_instances', function(table) {
            table.uuid('id').primary();
            table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
            table.date('instance_date').notNullable();
            table.timestamp('start_time').notNullable();
            table.timestamp('end_time').notNullable();
            table.boolean('is_exception').notNullable().defaultTo(false);
            table.jsonb('exception_data');
            table.string('status').notNullable().defaultTo('confirmed');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.unique(['event_id', 'instance_date']);
            table.index(['event_id']);
            table.index(['instance_date']);
        })

        // Event attendees table
        .createTable('event_attendees', function(table) {
            table.uuid('id').primary();
            table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
            table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
            table.string('email').notNullable();
            table.string('name');
            table.string('response_status').notNullable().defaultTo('pending');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.index(['event_id']);
            table.index(['user_id']);
            table.unique(['event_id', 'email']);
        })

        // Reminders table
        .createTable('reminders', function(table) {
            table.uuid('id').primary();
            table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.integer('minutes_before').notNullable();
            table.string('method').notNullable().defaultTo('notification');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.index(['event_id']);
            table.index(['user_id']);
            table.unique(['event_id', 'user_id', 'minutes_before', 'method']);
        })

        // Attachments table
        .createTable('attachments', function(table) {
            table.uuid('id').primary();
            table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
            table.string('name').notNullable();
            table.string('file_url').notNullable();
            table.string('mime_type').notNullable();
            table.integer('size_bytes').notNullable();
            table.uuid('created_by').notNullable().references('id').inTable('users');
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.index(['event_id']);
        })

        // Sync tokens table
        .createTable('sync_tokens', function(table) {
            table.uuid('id').primary();
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('device_id').notNullable();
            table.timestamp('last_sync_time').notNullable().defaultTo(knex.fn.now());
            table.string('token').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at');
            table.unique(['user_id', 'device_id']);
            table.index(['token']);
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('sync_tokens')
        .dropTableIfExists('attachments')
        .dropTableIfExists('reminders')
        .dropTableIfExists('event_attendees')
        .dropTableIfExists('event_instances')
        .dropTableIfExists('events')
        .dropTableIfExists('calendar_shares')
        .dropTableIfExists('calendars')
        .dropTableIfExists('refresh_tokens')
        .dropTableIfExists('user_preferences')
        .dropTableIfExists('users');
};