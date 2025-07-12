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

        // Mock pool.query to handle different queries based on SQL content
                pool.query.mockImplementation((sql, params) => {
            if (sql.includes('SELECT')) {
                // Generic select mock
                if (sql.includes('FROM calendars') && sql.includes('owner_id = $1')) {
                    return Promise.resolve({ rows: [{ id: 'cal1' }] });
                }
                if (sql.includes('FROM events') && sql.includes('recurrence_rule IS NULL')) {
                    return Promise.resolve({ rows: [{ id: 'event1', recurrence_rule: null, calendar_id: 'cal1', start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z' }] });
                }
                if (sql.includes('FROM events') && sql.includes('recurrence_rule IS NOT NULL')) {
                    return Promise.resolve({ rows: [{ id: 'event2', recurrence_rule: 'FREQ=DAILY', start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', calendar_id: 'cal1', exception_dates: [] }] });
                }
                if (sql.includes('FROM calendars WHERE id = $1')) {
                    return Promise.resolve({ rows: [{ name: 'Calendar 1', color: 'blue' }] });
                }
                if (sql.includes('FROM reminders')) {
                    return Promise.resolve({ rows: [] });
                }
                if (sql.includes('FROM event_attendees')) {
                    return Promise.resolve({ rows: [] });
                }
                if (sql.includes('FROM event_instances')) {
                    return Promise.resolve({ rows: [] });
                }
                return Promise.resolve({ rows: [] }); // Default for other SELECTs
            } else if (sql.includes('INSERT')) {
                return Promise.resolve({ rows: [{ id: 'mock-uuid', ...params }] });
            } else if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [{ id: params[params.length - 1], ...params }] });
            } else if (sql.includes('DELETE')) {
                return Promise.resolve({});
            }
            return Promise.resolve({ rowCount: 1 }); // Default for other operations
        });

        // Mock pool.connect for transactions
        pool.connect.mockResolvedValue({
            query: jest.fn().mockImplementation((sql, params) => {
                if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                    return Promise.resolve({});
                } else if (sql.includes('INSERT INTO events')) {
                    return Promise.resolve({ rows: [{ id: 'event1', calendar_id: params[1], title: params[2] }] });
                } else if (sql.includes('INSERT INTO reminders')) {
                    return Promise.resolve({});
                } else if (sql.includes('INSERT INTO event_attendees')) {
                    return Promise.resolve({});
                } else if (sql.includes('UPDATE event_instances SET') || sql.includes('INSERT INTO event_instances')) {
                    return Promise.resolve({ rows: [{ id: 'instance1', event_id: 'event1', instance_date: '2024-01-01', start_time: '2024-01-01T12:00:00Z', end_time: '2024-01-01T13:00:00Z' }] });
                } else if (sql.includes('UPDATE events SET exception_dates')) {
                    return Promise.resolve({});
                } else if (sql.includes('DELETE FROM event_instances')) {
                    return Promise.resolve({});
                } else if (sql.includes('DELETE FROM events')) {
                    return Promise.resolve({});
                } else if (sql.includes('UPDATE events SET recurrence_rule')) {
                    return Promise.resolve({});
                }
                return Promise.resolve({ rows: [] });
            }),
            release: jest.fn()
        });

        // Mock recurrence utils
        getEventOccurrences.mockReturnValue([]); // Default to empty array
        calculateOccurrenceEnd.mockImplementation((start, originalStart, originalEnd) => {
            const duration = originalEnd.getTime() - originalStart.getTime();
            return new Date(start.getTime() + duration);
        });
    });

    describe('getEvents', () => {
        it('should return events for a given user and date range', async () => {
            // Specific mocks for this test
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'cal1' }] }); // Accessible calendars
            pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Calendar access check
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', recurrence_rule: null, calendar_id: 'cal1', start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z' }] }); // Non-recurring events
            pool.query.mockResolvedValueOnce({ rows: [] }); // Recurring events

            const events = await eventService.getEvents('user1', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', 'cal1');
            expect(events).toHaveLength(1);
            expect(events[0].id).toBe('event1');
        });

        it('should process recurring events and their instances', async () => {
            // Specific mocks for this test
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'cal1' }] }); // Accessible calendars
            pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Calendar access check
            pool.query.mockResolvedValueOnce({ rows: [] }); // Non-recurring events
            pool.query.mockResolvedValueOnce({ // Recurring events
                rows: [{ id: 'event2', recurrence_rule: 'FREQ=DAILY', start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', calendar_id: 'cal1', exception_dates: [] }]
            });
            getEventOccurrences.mockReturnValue([ // Mock occurrences
                new Date('2024-01-01T10:00:00Z'),
                new Date('2024-01-02T10:00:00Z')
            ]);
            pool.query.mockResolvedValueOnce({ rows: [] }); // No instances

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
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'cal1' }] }); // Accessible calendars
            pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Calendar access check denied

            await expect(eventService.getEvents('user1', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', 'cal1')).rejects.toThrow('Access denied to calendar cal1');
        });
    });

    describe('createEvent', () => {
        it('should create a new event and return it', async () => {
            const eventData = { calendarId: 'cal1', title: 'New Event', startTime: '2024-01-01T10:00:00Z', endTime: '2024-01-01T11:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [{ access_role: 'owner' }] }); // Calendar access
            pool.connect.mockResolvedValue({
                query: jest.fn(sql => {
                    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                        return Promise.resolve({});
                    } else if (sql.includes('INSERT INTO events')) {
                        return Promise.resolve({ rows: [{ id: 'event1', calendar_id: 'cal1' }] });
                    } else if (sql.includes('SELECT name, color FROM calendars WHERE id = $1')) {
                        return Promise.resolve({ rows: [{ name: 'Calendar 1', color: 'blue' }] });
                    }
                    return Promise.resolve({ rows: [] });
                }),
                release: jest.fn()
            });

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
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', calendar_id: 'cal1', access_role: 'owner' }] }); // Event access
            pool.query.mockResolvedValueOnce({ rows: [] }); // Reminders
            pool.query.mockResolvedValueOnce({ rows: [] }); // Attendees

            const event = await eventService.getEvent('user1', 'event1');
            expect(event).toHaveProperty('id', 'event1');
        });

        it('should return a recurring event instance', async () => {
            const originalEvent = { id: 'event1', recurrence_rule: 'FREQ=DAILY', start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', exception_dates: [] };
            pool.query.mockResolvedValueOnce({ rows: [{ ...originalEvent, access_role: 'owner' }] }); // Event access
            pool.query.mockResolvedValueOnce({ rows: [] }); // No instance override
            getEventOccurrences.mockReturnValue([new Date('2024-01-02T10:00:00Z')]);
            calculateOccurrenceEnd.mockImplementation((start, originalStart, originalEnd) => {
                const duration = originalEnd.getTime() - originalStart.getTime();
                return new Date(start.getTime() + duration);
            });
            pool.query.mockResolvedValueOnce({ rows: [] }); // Reminders
            pool.query.mockResolvedValueOnce({ rows: [] }); // Attendees

            const event = await eventService.getEvent('user1', 'event1_2024-01-02');
            expect(event).toHaveProperty('original_event_id', 'event1');
            expect(event).toHaveProperty('is_recurring_instance', true);
        });

        it('should throw error if event not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(eventService.getEvent('user1', 'nonexistent-event')).rejects.toThrow('Event not found');
        });

        it('should throw error if access denied to event', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'none' }] }); // Access denied
            await expect(eventService.getEvent('user1', 'event1')).rejects.toThrow('Access denied');
        });
    });

    describe('updateEvent', () => {
        it('should update an event and return it', async () => {
            const eventData = { title: 'Updated Title' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', calendar_id: 'cal1', access_role: 'owner' }] }); // Event access
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', calendar_id: 'cal1', title: 'Updated Title' }] }); // Update event
            pool.query.mockResolvedValueOnce({ rows: [{ name: 'Calendar 1', color: 'blue' }] }); // Calendar info

            const updatedEvent = await eventService.updateEvent('user1', 'event1', eventData);
            expect(updatedEvent).toHaveProperty('title', 'Updated Title');
        });

        it('should throw error if updating recurring instance directly', async () => {
            const eventData = { title: 'Updated Title' };
            await expect(eventService.updateEvent('user1', 'event1_2024-01-01', eventData)).rejects.toThrow('Cannot update recurring instance directly. Use /events/:id/instance/:date endpoint');
        });

        it('should throw error if event not found', async () => {
            const eventData = { title: 'Updated Title' };
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(eventService.updateEvent('user1', 'nonexistent-event', eventData)).rejects.toThrow('Event not found');
        });

        it('should throw error if permission denied to update event', async () => {
            const eventData = { title: 'Updated Title' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'view' }] }); // View permission only
            await expect(eventService.updateEvent('user1', 'event1', eventData)).rejects.toThrow('Permission denied');
        });
    });

    describe('updateEventInstance', () => {
        it('should update an event instance and return it', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            const originalEvent = { id: 'event1', recurrence_rule: 'FREQ=DAILY', start_time: '2024-01-01T10:00:00Z', end_time: '2024-01-01T11:00:00Z', exception_dates: [] };
            pool.query.mockResolvedValueOnce({ rows: [{ ...originalEvent, access_role: 'owner' }] }); // Event access
            pool.connect.mockResolvedValue({
                query: jest.fn(sql => {
                    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                        return Promise.resolve({});
                    } else if (sql.includes('SELECT * FROM event_instances')) {
                        return Promise.resolve({ rows: [] }); // Instance check (not found)
                    } else if (sql.includes('UPDATE event_instances SET') || sql.includes('INSERT INTO event_instances')) {
                        return Promise.resolve({ rows: [{ id: 'instance1', event_id: 'event1', instance_date: '2024-01-01', start_time: '2024-01-01T12:00:00Z', end_time: '2024-01-01T13:00:00Z' }] });
                    } else if (sql.includes('UPDATE events SET exception_dates')) {
                        return Promise.resolve({});
                    }
                    return Promise.resolve({ rows: [] });
                }),
                release: jest.fn()
            });

            const updatedInstance = await eventService.updateEventInstance('user1', 'event1', '2024-01-01', eventData);
            expect(updatedInstance).toHaveProperty('start_time', '2024-01-01T12:00:00.000Z');
            expect(updatedInstance).toHaveProperty('is_exception', true);
        });

        it('should throw error for invalid date format', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            await expect(eventService.updateEventInstance('user1', 'event1', 'invalid-date', eventData)).rejects.toThrow('Invalid date format');
        });

        it('should throw error if event not found', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(eventService.updateEventInstance('user1', 'nonexistent-event', '2024-01-01', eventData)).rejects.toThrow('Event not found');
        });

        it('should throw error if permission denied to update instance', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'view' }] }); // View permission only
            await expect(eventService.updateEventInstance('user1', 'event1', '2024-01-01', eventData)).rejects.toThrow('Permission denied');
        });

        it('should throw error if event is not recurring', async () => {
            const eventData = { startTime: '2024-01-01T12:00:00Z' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', recurrence_rule: null, access_role: 'owner' }] }); // Not recurring
            await expect(eventService.updateEventInstance('user1', 'event1', '2024-01-01', eventData)).rejects.toThrow('Event is not recurring');
        });
    });

    describe('deleteEvent', () => {
        it('should delete a non-recurring event', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', recurrence_rule: null, access_role: 'owner' }] }); // Event access
            pool.connect.mockResolvedValue({
                query: jest.fn().mockResolvedValueOnce({}), // Delete event
                release: jest.fn()
            });

            const result = await eventService.deleteEvent('user1', 'event1', null);
            expect(result).toEqual({ message: 'Event deleted successfully' });
        });

        it('should delete a recurring event instance', async () => {
            const originalEvent = { id: 'event1', recurrence_rule: 'FREQ=DAILY', exception_dates: [], access_role: 'owner' };
            pool.query.mockResolvedValueOnce({ rows: [originalEvent] }); // Event access
            pool.connect.mockResolvedValue({
                query: jest.fn()
                    .mockResolvedValueOnce({}) // Update exception dates
                    .mockResolvedValueOnce({}), // Delete instance
                release: jest.fn()
            });

            const result = await eventService.deleteEvent('user1', 'event1_2024-01-01', null);
            expect(result).toEqual({ message: 'Event deleted successfully' });
        });

        it('should delete future occurrences of a recurring event', async () => {
            const originalEvent = { id: 'event1', recurrence_rule: 'FREQ=DAILY', access_role: 'owner' };
            pool.query.mockResolvedValueOnce({ rows: [originalEvent] }); // Event access
            pool.connect.mockResolvedValue({
                query: jest.fn().mockResolvedValueOnce({}), // Update recurrence rule
                release: jest.fn()
            });
            getEventOccurrences.mockReturnValue([]); // No future occurrences

            const result = await eventService.deleteEvent('user1', 'event1', 'future');
            expect(result).toEqual({ message: 'Event deleted successfully' });
        });

        it('should delete the entire recurring event series', async () => {
            const originalEvent = { id: 'event1', recurrence_rule: 'FREQ=DAILY', access_role: 'owner' };
            pool.query.mockResolvedValueOnce({ rows: [originalEvent] }); // Event access
            pool.connect.mockResolvedValue({
                query: jest.fn().mockResolvedValueOnce({}), // Delete event
                release: jest.fn()
            });

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