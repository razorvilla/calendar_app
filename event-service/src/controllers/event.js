const eventService = require('../services/event');

/**
 * Get events for a given time range and calendar IDs
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getEvents = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { start, end, calendarIds } = req.query;
        const events = await eventService.getEvents(userId, start, end, calendarIds);
        res.json(events);
    } catch (error) {
        console.error('Get events error:', error);
        if (error.message.includes('date') || error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create a new event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createEvent = async (req, res) => {
    try {
        const userId = req.user.userId;
        const event = await eventService.createEvent(userId, req.body);
        res.status(201).json(event);
    } catch (error) {
        console.error('Create event error:', error);
        if (error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('Calendar not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Permission denied')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get a specific event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getEvent = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const event = await eventService.getEvent(userId, id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        console.error('Get event error:', error);
        if (error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('Event not recurring') || error.message.includes('Event instance not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update an event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateEvent = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const updatedEvent = await eventService.updateEvent(userId, id, req.body);
        if (!updatedEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(updatedEvent);
    } catch (error) {
        console.error('Update event error:', error);
        if (error.message.includes('Cannot update recurring instance directly')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('Event not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Permission denied')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('No fields to update')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update a specific instance of a recurring event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateEventInstance = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, date } = req.params;
        const updatedInstance = await eventService.updateEventInstance(userId, id, date, req.body);
        if (!updatedInstance) {
            return res.status(404).json({ error: 'Event or instance not found' });
        }
        res.json(updatedInstance);
    } catch (error) {
        console.error('Update event instance error:', error);
        if (error.message.includes('Invalid date format') || error.message.includes('Event is not recurring')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('Event not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Permission denied')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete an event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteEvent = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { recurring } = req.query; // all, future, this
        await eventService.deleteEvent(userId, id, recurring);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        if (error.message.includes('Event not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Permission denied')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('Error modifying recurrence rule')) {
            return res.status(500).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getEvents,
    createEvent,
    getEvent,
    updateEvent,
    updateEventInstance,
    deleteEvent
};