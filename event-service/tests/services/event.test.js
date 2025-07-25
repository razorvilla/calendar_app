const eventService = require('../../src/services/event');
const pool = require('../../src/db/pool');
const { getEventOccurrences, calculateOccurrenceEnd } = require('../../src/utils/recurrence');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/db/pool');
jest.mock('../../src/utils/recurrence');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid')
}));

describe('Event Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock for pool.connect
        pool.connect.mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn(),
        });
    });

    describe('getEvents', () => {
        it('should return events for a given user and date range', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Calendar access check
                .mockResolvedValueOnce({ rows: [{ id: 'event1', recurrence_rule: null, calendar_id: 'cal1', start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', calendar_name: 'Calendar 1', calendar_color: 'blue' }] }) // Non-recurring events
                .mockResolvedValueOnce({ rows: [] }); // Recurring events

            const events = await eventService.getEvents('user1', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', 'cal1');
            expect(events).toHaveLength(1);
            expect(events[0].id).toBe('event1');
        });

        it('should process recurring events and their instances', async () => {
            const recurringEvent = { id: 'event2', frequency: 'DAILY', interval: 1, count: null, until: null, by_day: null, start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', calendar_name: 'Calendar 2', calendar_color: 'red' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Calendar access check
                .mockResolvedValueOnce({ rows: [] }) // Non-recurring events
                .mockResolvedValueOnce({ rows: [recurringEvent] }) // Recurring events
                .mockResolvedValueOnce({ rows: [] }); // No modified instances

            getEventOccurrences.mockReturnValue([
                new Date('2024-01-01T10:00:00Z'),
                new Date('2024-01-02T10:00:00Z')
            ]);

            calculateOccurrenceEnd.mockImplementation((occurrenceStart, originalStart, originalEnd) => {
                const duration = originalEnd.getTime() - originalStart.getTime();
                return new Date(occurrenceStart.getTime() + duration);
            });

            const events = await eventService.getEvents('user1', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', 'cal1');
            expect(events).toHaveLength(2);
            expect(events[0].original_event_id).toBe('event2');
            expect(events[1].original_event_id).toBe('event2');
        });

        it('should throw error if start or end dates are missing', async () => {
            await expect(eventService.getEvents('user1', null, '2024-01-31T23:59:59Z', 'cal1')).rejects.toThrow('Start and end dates are required');
        });

        it('should throw error if date format is invalid', async () => {
            await expect(eventService.getEvents('user1', 'invalid-date', '2024-01-31T23:59:59Z', 'cal1')).rejects.toThrow('Invalid date format');
        });

        it('should throw error if access to calendar is denied', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Calendar access check denied

            await expect(eventService.getEvents('user1', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', 'cal1')).rejects.toThrow('Access denied to calendar cal1');
        });
    });

    describe('createEvent', () => {
        it('should create a new event and return it', async () => {
            const eventData = { calendarId: 'cal1', title: 'New Event', startTime: '2024-01-01T10:00:00Z', endTime: '2024-01-01T11:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [{ access_role: 'owner' }] }); // Calendar access

            const client = {
                query: jest.fn((sql) => {
                    if (sql.includes('INSERT INTO events')) {
                        return Promise.resolve({ rows: [{ id: 'event1', calendar_id: 'cal1' }] });
                    }
                    return Promise.resolve({ rows: [] });
                }),
                release: jest.fn(),
            };
            pool.connect.mockResolvedValue(client);
            pool.query.mockResolvedValueOnce({ rows: [{ name: 'Calendar 1', color: 'blue' }] });


            const event = await eventService.createEvent('user1', eventData);
            expect(event).toHaveProperty('id', 'event1');
            expect(event).toHaveProperty('calendar_name', 'Calendar 1');
        });

        it('should throw error if required fields are missing', async () => {
            const eventData = { calendarId: 'cal1', title: 'New Event' };
            await expect(eventService.createEvent('user1', eventData)).rejects.toThrow('Calendar ID, title, start time, and end time are required');
        });

        it('should throw error if calendar not found', async () => {
            const eventData = { calendarId: 'cal1', title: 'New Event', startTime: '2024-01-01T10:00:00Z', endTime: '2024-01-01T11:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [] }); // Calendar not found
            await expect(eventService.createEvent('user1', eventData)).rejects.toThrow('Calendar not found');
        });

        it('should throw error if permission denied to create event', async () => {
            const eventData = { calendarId: 'cal1', title: 'New Event', startTime: '2024-01-01T10:00:00Z', endTime: '2024-01-01T11:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [{ access_role: 'view' }] }); // View permission only
            await expect(eventService.createEvent('user1', eventData)).rejects.toThrow('Permission denied');
        });
    });

    describe('getEvent', () => {
        it('should return a single event by ID', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 'event1', calendar_id: 'cal1', access_role: 'owner' }] }) // Event access
                .mockResolvedValueOnce({ rows: [] }) // Reminders
                .mockResolvedValueOnce({ rows: [] }); // Attendees

            const event = await eventService.getEvent('user1', 'event1');
            expect(event).toHaveProperty('id', 'event1');
        });

        it('should return a recurring event instance', async () => {
            const originalEvent = { id: 'event1', frequency: 'DAILY', interval: 1, count: null, until: null, by_day: null, start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', exception_dates: [] };
            pool.query
                .mockResolvedValueOnce({ rows: [{ ...originalEvent, access_role: 'owner' }] }) // Event access
                .mockResolvedValueOnce({ rows: [] }); // No instance override

            getEventOccurrences.mockReturnValue([new Date('2024-01-02T10:00:00Z')]);
            calculateOccurrenceEnd.mockImplementation((start, originalStart, originalEnd) => {
                const duration = originalEnd.getTime() - originalStart.getTime();
                return new Date(start.getTime() + duration);
            });

            pool.query
                .mockResolvedValueOnce({ rows: [] }) // Reminders
                .mockResolvedValueOnce({ rows: [] }); // Attendees

            const event = await eventService.getEvent('user1', 'event1_2024-01-02');
            expect(event).toHaveProperty('original_event_id', 'event1');
            expect(event).toHaveProperty('is_recurring_instance', true);
        });

        it('should return null if event not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(eventService.getEvent('user1', 'nonexistent-event')).resolves.toBeNull();
        });

        it('should throw error if access denied to event', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'none' }] }); // Access denied
            await expect(eventService.getEvent('user1', 'event1')).rejects.toThrow('Access denied');
        });
    });

    describe('updateEvent', () => {
        it('should update an event and return it', async () => {
            const eventData = { title: 'Updated Title' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 'event1', calendar_id: 'cal1', access_role: 'owner' }] }) // Event access
                .mockResolvedValueOnce({ rows: [{ id: 'event1', calendar_id: 'cal1', title: 'Updated Title' }] }) // Update event
                .mockResolvedValueOnce({ rows: [{ name: 'Calendar 1', color: 'blue' }] }); // Calendar info

            const updatedEvent = await eventService.updateEvent('user1', 'event1', eventData);
            expect(updatedEvent).toHaveProperty('title', 'Updated Title');
        });

        it('should throw error if updating recurring instance directly', async () => {
            const eventData = { title: 'Updated Title' };
            await expect(eventService.updateEvent('user1', 'event1_2024-01-01', eventData)).rejects.toThrow('Cannot update recurring instance directly. Use /events/:id/instance/:date endpoint');
        });

        it('should return null if event not found', async () => {
            const eventData = { title: 'Updated Title' };
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(eventService.updateEvent('user1', 'nonexistent-event', eventData)).resolves.toBeNull();
        });

        it('should throw error if permission denied to update event', async () => {
            const eventData = { title: 'Updated Title' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'view' }] }); // View permission only
            await expect(eventService.updateEvent('user1', 'event1', eventData)).rejects.toThrow('Permission denied');
        });
    });

    describe('updateEventInstance', () => {
        it('should update an event instance and return it', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00.000Z' };
            const originalEvent = { id: 'event1', frequency: 'DAILY', interval: 1, count: null, until: null, by_day: null, start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', exception_dates: [] };
            pool.query.mockResolvedValueOnce({ rows: [{ ...originalEvent, access_role: 'owner' }] }); // Event access

            const client = {
                query: jest.fn((sql) => {
                    if (sql.includes('SELECT * FROM event_instances')) {
                        return Promise.resolve({ rows: [] }); // Instance check (not found)
                    } else if (sql.includes('INSERT INTO event_instances')) {
                        return Promise.resolve({ rows: [{ id: 'instance1', event_id: 'event1', instance_date: '2024-01-01', start_time: '2024-01-01T12:00:00.000Z', end_time: '2024-01-01T13:00:00.000Z' }] });
                    } else if (sql.includes('UPDATE events SET exception_dates')) {
                        return Promise.resolve({});
                    }
                    return Promise.resolve({ rows: [] });
                }),
                release: jest.fn(),
            };
            pool.connect.mockResolvedValue(client);

            const updatedInstance = await eventService.updateEventInstance('user1', 'event1', '2024-01-01', eventData);
            expect(updatedInstance).toHaveProperty('start_time', '2024-01-01T12:00:00.000Z');
            expect(updatedInstance).toHaveProperty('is_exception', true);
        });

        it('should throw error for invalid date format', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            await expect(eventService.updateEventInstance('user1', 'event1', 'invalid-date', eventData)).rejects.toThrow('Invalid date format');
        });

        it('should return null if event not found', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(eventService.updateEventInstance('user1', 'nonexistent-event', '2024-01-01', eventData)).resolves.toBeNull();
        });

        it('should throw error if permission denied to update instance', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'view' }] }); // View permission only
            await expect(eventService.updateEventInstance('user1', 'event1', '2024-01-01', eventData)).rejects.toThrow('Permission denied');
        });

        it('should throw error if event is not recurring', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', frequency: null, access_role: 'owner' }] }); // Not recurring
            await expect(eventService.updateEventInstance('user1', 'event1', '2024-01-01', eventData)).rejects.toThrow('Event is not recurring');
        });
    });

    describe('deleteEvent', () => {
        it('should delete a non-recurring event', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', frequency: null, access_role: 'owner' }] }); // Event access
            const client = {
                query: jest.fn().mockResolvedValueOnce({}), // Delete event
                release: jest.fn(),
            };
            pool.connect.mockResolvedValue(client);

            const result = await eventService.deleteEvent('user1', 'event1', null);
            expect(result).toEqual({ message: 'Event deleted successfully' });
        });

        it('should delete a recurring event instance', async () => {
            const originalEvent = { id: 'event1', frequency: 'DAILY', exception_dates: [], access_role: 'owner' };
            pool.query.mockResolvedValueOnce({ rows: [originalEvent] }); // Event access
            const client = {
                query: jest.fn()
                    .mockResolvedValueOnce({}) // Update exception dates
                    .mockResolvedValueOnce({}), // Delete instance
                release: jest.fn(),
            };
            pool.connect.mockResolvedValue(client);

            const result = await eventService.deleteEvent('user1', 'event1_2024-01-01', null);
            expect(result).toEqual({ message: 'Event deleted successfully' });
        });

        it('should delete future occurrences of a recurring event', async () => {
            const originalEvent = { id: 'event1', frequency: 'DAILY', access_role: 'owner' };
            pool.query.mockResolvedValueOnce({ rows: [originalEvent] }); // Event access
            const client = {
                query: jest.fn().mockResolvedValueOnce({}), // Update recurrence rule
                release: jest.fn(),
            };
            pool.connect.mockResolvedValue(client);
            getEventOccurrences.mockReturnValue([]); // No future occurrences

            const result = await eventService.deleteEvent('user1', 'event1', 'future');
            expect(result).toEqual({ message: 'Event deleted successfully' });
        });

        it('should delete the entire recurring event series', async () => {
            const originalEvent = { id: 'event1', frequency: 'DAILY', access_role: 'owner' };
            pool.query.mockResolvedValueOnce({ rows: [originalEvent] }); // Event access
            const client = {
                query: jest.fn().mockResolvedValueOnce({}), // Delete event
                release: jest.fn(),
            };
            pool.connect.mockResolvedValue(client);

            const result = await eventService.deleteEvent('user1', 'event1', 'all');
            expect(result).toEqual({ message: 'Event deleted successfully' });
        });

        it('should throw error if event not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(eventService.deleteEvent('user1', 'nonexistent-event', null)).rejects.toThrow('Event not found');
        });

        it('should throw error if permission denied to delete event', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'view' }] }); // View permission only
            await expect(eventService.deleteEvent('user1', 'event1', null)).rejects.toThrow('Permission denied');
        });
    });
});
