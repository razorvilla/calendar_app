const reminderService = require('../services/reminder');

/**
 * Get reminders for an event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getEventReminders = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId } = req.params;
        const reminders = await reminderService.getEventReminders(userId, eventId);
        res.json(reminders);
    } catch (error) {
        console.error('Get reminders error:', error);
        if (error.message.includes('Event not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create a reminder for an event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createReminder = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId } = req.params;
        const { minutesBefore, method } = req.body;
        const reminder = await reminderService.createReminder(userId, eventId, minutesBefore, method);
        res.status(201).json(reminder);
    } catch (error) {
        console.error('Create reminder error:', error);
        if (error.message.includes('required') || error.message.includes('Method must be')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('Event not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('Reminder already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete a reminder
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteReminder = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        await reminderService.deleteReminder(userId, id);
        res.json({ message: 'Reminder deleted successfully' });
    } catch (error) {
        console.error('Delete reminder error:', error);
        if (error.message.includes('Reminder not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getEventReminders,
    createReminder,
    deleteReminder
};