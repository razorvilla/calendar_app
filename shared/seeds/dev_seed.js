const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
    // Clear existing data
    await knex('sync_tokens').del();
    await knex('attachments').del();
    await knex('reminders').del();
    await knex('event_attendees').del();
    await knex('event_instances').del();
    await knex('events').del();
    await knex('calendar_shares').del();
    await knex('calendars').del();
    await knex('refresh_tokens').del();
    await knex('user_preferences').del();
    await knex('users').del();

    // Create test user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('password123', 10);

    await knex('users').insert({
        id: userId,
        email: 'test@example.com',
        password_hash: hashedPassword,
        name: 'Test User',
        timezone: 'UTC',
        is_email_verified: true,
        created_at: new Date()
    });

    // Create user preferences
    await knex('user_preferences').insert({
        id: uuidv4(),
        user_id: userId,
        default_view: 'month',
        working_hours: JSON.stringify({
            start: '09:00',
            end: '17:00',
            days: [1, 2, 3, 4, 5]
        }),
        notification_settings: JSON.stringify({
            event_reminders: true,
            share_notifications: true,
            email_notifications: true
        }),
        created_at: new Date()
    });

    // Create calendars
    const workCalendarId = uuidv4();
    const personalCalendarId = uuidv4();

    await knex('calendars').insert([
        {
            id: workCalendarId,
            owner_id: userId,
            name: 'Work',
            color: '#4285F4',
            is_default: true,
            is_visible: true,
            created_at: new Date()
        },
        {
            id: personalCalendarId,
            owner_id: userId,
            name: 'Personal',
            color: '#0F9D58',
            is_default: false,
            is_visible: true,
            created_at: new Date()
        }
    ]);

    // Create sample events
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await knex('events').insert([
        {
            id: uuidv4(),
            calendar_id: workCalendarId,
            title: 'Team Meeting',
            description: 'Weekly team sync',
            location: 'Conference Room A',
            start_time: new Date(now.setHours(10, 0, 0, 0)),
            end_time: new Date(now.setHours(11, 0, 0, 0)),
            is_all_day: false,
            visibility: 'default',
            status: 'confirmed',
            created_by: userId,
            created_at: new Date(),
            version: 1
        },
        {
            id: uuidv4(),
            calendar_id: personalCalendarId,
            title: 'Dentist Appointment',
            location: 'Dental Clinic',
            start_time: new Date(tomorrow.setHours(14, 0, 0, 0)),
            end_time: new Date(tomorrow.setHours(15, 0, 0, 0)),
            is_all_day: false,
            visibility: 'default',
            status: 'confirmed',
            created_by: userId,
            created_at: new Date(),
            version: 1
        }
    ]);
};