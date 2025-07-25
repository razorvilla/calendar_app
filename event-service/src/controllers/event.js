const eventService = require('../services/event');
const pool = require('../db/pool');
const getEvents = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { start, end, calendarIds } = req.query;
        const events = await eventService.getEvents(userId, start, end, calendarIds);
        res.json(events);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const createEvent = async (req, res) => {
    try {
        const userId = req.user.userId;
        const event = await eventService.createEvent(userId, req.body);
        res.status(201).json(event);
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
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
        res.status(500).json({ error: 'Internal server error' });
    }
};
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
        res.status(500).json({ error: 'Internal server error' });
    }
};
const updateEventInstance = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, date } = req.params;
        const response = await eventService.updateEventInstance(userId, id, date, req.body);
        res.json(response);
    } catch (error) {
        console.error('Update event instance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const deleteEvent = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { recurring } = req.query;
        const result = await eventService.deleteEvent(userId, id, recurring);
        res.json(result);
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getRecurrenceRule = async (req, res) => {
    try {
        const { id } = req.params;
        const recurrenceRule = await pool.query(
            'SELECT * FROM recurrence_rules WHERE event_id = $1',
            [id]
        );
        if (recurrenceRule.rows.length === 0) {
            return res.status(404).json({ error: 'Recurrence rule not found' });
        }
        res.json(recurrenceRule.rows[0]);
    } catch (error) {
        console.error('Get recurrence rule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    getEvents,
    createEvent,
    getEvent,
    updateEvent,
    updateEventInstance,
    deleteEvent,
    getRecurrenceRule
};