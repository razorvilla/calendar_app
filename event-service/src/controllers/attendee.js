const attendeeService = require('../services/attendee');

/**
 * Get attendees for an event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getEventAttendees = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId } = req.params;
        const attendees = await attendeeService.getEventAttendees(userId, eventId);
        res.json(attendees);
    } catch (error) {
        console.error('Get attendees error:', error);
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
 * Add attendee to an event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addAttendee = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId } = req.params;
        const { email, name } = req.body;
        const attendee = await attendeeService.addAttendee(userId, eventId, email, name);
        res.status(201).json(attendee);
    } catch (error) {
        console.error('Add attendee error:', error);
        if (error.message.includes('Email is required')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('Event not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Permission denied')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('Attendee already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update attendee response
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAttendeeResponse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId, attendeeId } = req.params;
        const { responseStatus } = req.body;
        const updatedAttendee = await attendeeService.updateAttendeeResponse(userId, eventId, attendeeId, responseStatus);
        res.json(updatedAttendee);
    } catch (error) {
        console.error('Update attendee response error:', error);
        if (error.message.includes('Valid response status required')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('Attendee not found')) {
            return res.status(404).json({ error: error.message });
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
 * Remove attendee from event
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeAttendee = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId, attendeeId } = req.params;
        await attendeeService.removeAttendee(userId, eventId, attendeeId);
        res.json({ message: 'Attendee removed successfully' });
    } catch (error) {
        console.error('Remove attendee error:', error);
        if (error.message.includes('Event not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Attendee not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Permission denied')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getEventAttendees,
    addAttendee,
    updateAttendeeResponse,
    removeAttendee
};