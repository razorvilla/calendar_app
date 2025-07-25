const shareService = require('../services/share');

const shareCalendar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { email, permission } = req.body;
        const result = await shareService.shareCalendar(userId, id, { email, permission });
        res.status(201).json(result);
    } catch (error) {
        console.error('Share calendar error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getCalendarShares = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const shares = await shareService.getCalendarShares(userId, id);
        res.json(shares);
    } catch (error) {
        console.error('Get calendar shares error:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateShare = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, shareId } = req.params;
        const { permission, status } = req.body;
        const updatedShare = await shareService.updateShare(userId, id, shareId, { permission, status });
        if (!updatedShare) {
            return res.status(404).json({ error: 'Share not found' });
        }
        res.json(updatedShare);
    } catch (error) {
        console.error('Update share error:', error);
        res.status(500).json({ error: error.message });
    }
};

const deleteShare = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, shareId } = req.params;
        const result = await shareService.deleteShare(userId, id, shareId);
        if (!result) {
            return res.status(404).json({ error: 'Share not found' });
        }
        res.json(result);
    } catch (error) {
        console.error('Delete share error:', error);
        res.status(500).json({ error: error.message });
    }
};

const acceptShareInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        const result = await shareService.acceptShareInvitation(token);
        res.json(result);
    } catch (error) {
        console.error('Accept share invitation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resendShareInvitation = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { calendarId, shareId } = req.params;
        const result = await shareService.resendShareInvitation(userId, calendarId, shareId);
        res.json(result);
    } catch (error) {
        console.error('Resend share invitation error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    shareCalendar,
    getCalendarShares,
    updateShare,
    deleteShare,
    acceptShareInvitation,
    resendShareInvitation
};