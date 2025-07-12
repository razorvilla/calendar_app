const calendarService = require('../services/calendar');

const getCalendars = async (req, res) => {
    try {
        const calendars = await calendarService.getCalendars(req.user.userId);
        res.json(calendars);
    } catch (error) {
        console.error('Get calendars error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createCalendar = async (req, res) => {
    try {
        const calendar = await calendarService.createCalendar(req.user.userId, req.body);
        res.status(201).json(calendar);
    } catch (error) {
        console.error('Create calendar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getCalendar = async (req, res) => {
    try {
        const calendar = await calendarService.getCalendarById(req.user.userId, req.params.id);
        if (!calendar) {
            return res.status(404).json({ error: 'Calendar not found or access denied' });
        }
        res.json(calendar);
    } catch (error) {
        console.error('Get calendar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateCalendar = async (req, res) => {
    try {
        const calendar = await calendarService.updateCalendar(req.user.userId, req.params.id, req.body);
        if (!calendar) {
            return res.status(404).json({ error: 'Calendar not found or permission denied' });
        }
        res.json(calendar);
    } catch (error) {
        console.error('Update calendar error:', error);
        if (error.message === 'Permission denied' || error.message === 'Only the owner can change default status and visibility') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteCalendar = async (req, res) => {
    try {
        await calendarService.deleteCalendar(req.user.userId, req.params.id);
        res.json({ message: 'Calendar deleted successfully' });
    } catch (error) {
        console.error('Delete calendar error:', error);
        if (error.message === 'Only the owner can delete a calendar') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getCalendars,
    createCalendar,
    getCalendar,
    updateCalendar,
    deleteCalendar
};

