const reminderService = require('../../src/services/reminder');
const pool = require('../../src/db/pool');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/db/pool');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid')
}));

describe('Reminder Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getEventReminders', () => {
        it('should return reminders for a given event and user', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'owner' }] }); // Event access
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'reminder1', event_id: 'event1', user_id: 'user1' }] }); // Reminders

            const reminders = await reminderService.getEventReminders('user1', 'event1');
            expect(reminders).toHaveLength(1);
            expect(reminders[0].id).toBe('reminder1');
        });

        it('should throw error if event not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(reminderService.getEventReminders('user1', 'nonexistent-event')).rejects.toThrow('Event not found');
        });

        it('should throw error if access denied to event', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'none' }] }); // Access denied
            await expect(reminderService.getEventReminders('user1', 'event1')).rejects.toThrow('Access denied');
        });
    });

    describe('createReminder', () => {
        it('should create a new reminder and return it', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'owner' }] }); // Event access
            pool.query.mockResolvedValueOnce({ rows: [] }); // Reminder check (not exists)
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'mock-uuid', event_id: 'event1', user_id: 'user1', minutes_before: 10, method: 'notification' }] }); // Insert reminder

            const reminder = await reminderService.createReminder('user1', 'event1', 10, 'notification');
            expect(reminder).toHaveProperty('id', 'mock-uuid');
            expect(reminder).toHaveProperty('minutes_before', 10);
        });

        it('should throw error if required fields are missing', async () => {
            await expect(reminderService.createReminder('user1', 'event1', null, 'notification')).rejects.toThrow('Minutes before and method are required');
        });

        it('should throw error if method is invalid', async () => {
            await expect(reminderService.createReminder('user1', 'event1', 10, 'invalid-method')).rejects.toThrow('Method must be notification or email');
        });

        it('should throw error if event not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Event not found
            await expect(reminderService.createReminder('user1', 'nonexistent-event', 10, 'notification')).rejects.toThrow('Event not found');
        });

        it('should throw error if access denied to create reminder', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'none' }] }); // Access denied
            await expect(reminderService.createReminder('user1', 'event1', 10, 'notification')).rejects.toThrow('Access denied');
        });

        it('should throw error if reminder already exists', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'owner' }] }); // Event access
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'reminder1' }] }); // Reminder already exists
            await expect(reminderService.createReminder('user1', 'event1', 10, 'notification')).rejects.toThrow('Reminder already exists');
        });
    });

    describe('deleteReminder', () => {
        it('should delete a reminder', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'reminder1', user_id: 'user1' }] }); // Reminder ownership
            pool.query.mockResolvedValueOnce({}); // Delete reminder

            const result = await reminderService.deleteReminder('user1', 'reminder1');
            expect(result).toEqual({ message: 'Reminder deleted successfully' });
        });

        it('should throw error if reminder not found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // Reminder not found
            await expect(reminderService.deleteReminder('user1', 'nonexistent-reminder')).rejects.toThrow('Reminder not found');
        });
    });
});