const shareService = require('../../src/services/share');
const pool = require('../../src/db/pool');
const axios = require('axios');

jest.mock('../../src/db/pool');
jest.mock('axios');

describe('Share Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('shareCalendar', () => {
        it('should share a calendar and send an invitation', async () => {
            const shareData = { email: 'test@example.com', permission: 'view' };
            const mockShare = { id: '1', ...shareData };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'cal1', name: 'Test Cal', owner_id: 'user1' }] }); // owner check
            pool.query.mockResolvedValueOnce({ rows: [] }); // user check (simulating user not found, so invitation is sent)
            pool.query.mockResolvedValueOnce({ rows: [mockShare] }); // insert share
            axios.post.mockResolvedValue({ data: {} });

            const share = await shareService.shareCalendar('user1', 'cal1', shareData);

            expect(share).toEqual(mockShare);
            expect(pool.query).toHaveBeenCalledTimes(3);
            expect(axios.post).toHaveBeenCalledTimes(1);
        });
    });

    // Add more tests for other functions in share.js
});