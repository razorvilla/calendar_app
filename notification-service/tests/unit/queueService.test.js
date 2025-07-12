const queueService = require('../../src/services/queueService');
const Bull = require('bull');
const Notification = require('../../src/models/notification');
const notificationController = require('../../src/controllers/notification');
const logger = require('../../src/utils/logger');

jest.mock('bull');
jest.mock('../../src/models/notification');
jest.mock('../../src/controllers/notification');
jest.mock('../../src/utils/logger');

describe('Queue Service', () => {
    let mockNotificationQueue;
    let mockScheduledQueue;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.REDIS_HOST = 'localhost';
        process.env.REDIS_PORT = '6379';
        process.env.REDIS_PASSWORD = '';

        mockNotificationQueue = {
            add: jest.fn(),
            process: jest.fn(),
            on: jest.fn(),
            getJobs: jest.fn(),
            getJob: jest.fn(),
            clean: jest.fn(),
            getJobCounts: jest.fn(),
        };
        mockScheduledQueue = {
            add: jest.fn(),
            process: jest.fn(),
            on: jest.fn(),
            getJobs: jest.fn(),
            getJob: jest.fn(),
            clean: jest.fn(),
            getJobCounts: jest.fn(),
        };

        Bull.mockImplementation((name) => {
            if (name === 'notification-processing') {
                return mockNotificationQueue;
            } else if (name === 'notification-scheduled') {
                return mockScheduledQueue;
            }
            return null;
        });
    });

    describe('initialize', () => {
        it('should initialize both queues', () => {
            queueService.initialize();
            expect(Bull).toHaveBeenCalledTimes(2);
            expect(Bull).toHaveBeenCalledWith('notification-processing', expect.any(Object));
            expect(Bull).toHaveBeenCalledWith('notification-scheduled', expect.any(Object));
            expect(mockNotificationQueue.process).toHaveBeenCalledTimes(1);
            expect(mockScheduledQueue.process).toHaveBeenCalledTimes(1);
            expect(mockNotificationQueue.on).toHaveBeenCalledTimes(3);
            expect(logger.info).toHaveBeenCalledWith('Notification queue service initialized');
        });
    });

    describe('addToQueue', () => {
        it('should add a notification to the processing queue', async () => {
            queueService.initialize();
            mockNotificationQueue.add.mockResolvedValue({ id: 'job1' });

            const job = await queueService.addToQueue('notif1');

            expect(mockNotificationQueue.add).toHaveBeenCalledWith({
                notificationId: 'notif1',
                timestamp: expect.any(String),
            });
            expect(job).toEqual({ id: 'job1' });
            expect(logger.info).toHaveBeenCalledWith('Added notification notif1 to processing queue, job ID: job1');
        });
    });

    describe('scheduleInQueue', () => {
        it('should schedule a notification in the scheduled queue', async () => {
            queueService.initialize();
            const scheduledFor = new Date(Date.now() + 100000);
            mockScheduledQueue.add.mockResolvedValue({ id: 'job2' });

            const job = await queueService.scheduleInQueue('notif2', scheduledFor);

            expect(mockScheduledQueue.add).toHaveBeenCalledWith(
                {
                    notificationId: 'notif2',
                    scheduledFor: scheduledFor.toISOString(),
                    timestamp: expect.any(String),
                },
                {
                    delay: expect.any(Number),
                    jobId: 'scheduled:notif2',
                }
            );
            expect(job).toEqual({ id: 'job2' });
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Scheduled notification notif2'));
        });
    });

    describe('removeFromQueue', () => {
        it('should remove a notification from processing queue', async () => {
            queueService.initialize();
            const mockJob = { data: { notificationId: 'notif3' }, remove: jest.fn() };
            mockNotificationQueue.getJobs.mockResolvedValueOnce([mockJob]);
            mockScheduledQueue.getJob.mockResolvedValueOnce(null);

            const result = await queueService.removeFromQueue('notif3');

            expect(mockJob.remove).toHaveBeenCalledTimes(1);
            expect(logger.info).toHaveBeenCalledWith('Removed notification notif3 from processing queue, job ID: undefined');
            expect(result).toBe(true);
        });

        it('should remove a notification from scheduled queue', async () => {
            queueService.initialize();
            const mockJob = { data: { notificationId: 'notif4' }, remove: jest.fn() };
            mockNotificationQueue.getJobs.mockResolvedValueOnce([]);
            mockScheduledQueue.getJob.mockResolvedValueOnce(mockJob);

            const result = await queueService.removeFromQueue('notif4');

            expect(mockJob.remove).toHaveBeenCalledTimes(1);
            expect(logger.info).toHaveBeenCalledWith('Removed notification notif4 from scheduled queue, job ID: undefined');
            expect(result).toBe(true);
        });

        it('should return true if notification not found in any queue', async () => {
            queueService.initialize();
            mockNotificationQueue.getJobs.mockResolvedValueOnce([]);
            mockScheduledQueue.getJob.mockResolvedValueOnce(null);

            const result = await queueService.removeFromQueue('notif5');

            expect(result).toBe(true);
        });
    });

    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            queueService.initialize();
            mockNotificationQueue.getJobCounts.mockResolvedValueOnce({ completed: 5, failed: 1, active: 2, delayed: 0, waiting: 3 });
            mockScheduledQueue.getJobCounts.mockResolvedValueOnce({ completed: 1, failed: 0, active: 0, delayed: 2, waiting: 0 });

            const stats = await queueService.getQueueStats();

            expect(stats).toHaveProperty('processing');
            expect(stats).toHaveProperty('scheduled');
            expect(stats.processing.completed).toBe(5);
            expect(stats.scheduled.delayed).toBe(2);
        });
    });

    describe('cleanupOldJobs', () => {
        it('should clean up old jobs from both queues', async () => {
            queueService.initialize();
            mockNotificationQueue.clean.mockResolvedValue({});
            mockScheduledQueue.clean.mockResolvedValue({});

            const result = await queueService.cleanupOldJobs('1d');

            expect(mockNotificationQueue.clean).toHaveBeenCalledWith('1d', 'completed');
            expect(mockNotificationQueue.clean).toHaveBeenCalledWith('1d', 'failed');
            expect(mockScheduledQueue.clean).toHaveBeenCalledWith('1d', 'completed');
            expect(logger.info).toHaveBeenCalledWith('Cleaned up jobs older than 1d');
            expect(result).toBe(true);
        });
    });
});