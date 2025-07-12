const calendarService = require('../../src/services/calendar');
const pool = require('../../src/db/pool');

jest.mock('../../src/db/pool');

describe('Calendar Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getCalendars', () => {
        it('should return calendars for a user', async () => {
            const mockCalendars = [{ id: '1', name: 'Test Calendar' }];
            pool.query.mockResolvedValue({ rows: mockCalendars });

            const calendars = await calendarService.getCalendars('user1');

            expect(calendars).toEqual(mockCalendars);
            expect(pool.query).toHaveBeenCalledTimes(1);
        });
    });

    describe('createCalendar', () => {
        it('should create a new calendar', async () => {
            const newCalendar = { name: 'New Calendar' };
            const mockCalendar = { id: '2', ...newCalendar };
            pool.connect.mockResolvedValue({
                query: jest.fn().mockResolvedValue({ rows: [mockCalendar] }),
                release: jest.fn(),
            });

            const calendar = await calendarService.createCalendar('user1', newCalendar);

            expect(calendar).toEqual(expect.objectContaining(newCalendar));
            expect(pool.connect).toHaveBeenCalledTimes(1);
        });
    });

    // Add more tests for other functions in calendar.js
});