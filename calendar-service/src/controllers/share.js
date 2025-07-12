const shareService = require('../services/share');

const shareCalendar = async (req, res) => {
    try {
        const share = await shareService.shareCalendar(req.user.userId, req.params.id, req.body);
        res.status(201).json(share);
    } catch (error) {
        console.error('Share calendar error:', error);
        if (error.message === 'Only the owner can share a calendar') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getCalendarShares = async (req, res) => {
    try {
        const shares = await shareService.getCalendarShares(req.user.userId, req.params.id);
        res.json(shares);
    } catch (error) {
        console.error('Get calendar shares error:', error);
        if (error.message === 'Only the owner can view calendar shares') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateShare = async (req, res) => {
    try {
        const share = await shareService.updateShare(req.user.userId, req.params.id, req.params.shareId, req.body);
        if (!share) {
            return res.status(404).json({ error: 'Share not found' });
        }
        res.json(share);
    } catch (error) {
        console.error('Update share error:', error);
        if (error.message === 'Permission denied') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteShare = async (req, res) => {
    try {
        const result = await shareService.deleteShare(req.user.userId, req.params.id, req.params.shareId);
        if (!result) {
            return res.status(404).json({ error: 'Share not found' });
        }
        res.json(result);
    } catch (error) {
        console.error('Delete share error:', error);
        if (error.message === 'Permission denied') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const acceptShareInvitation = async (req, res) => {
    try {
        const result = await shareService.acceptShareInvitation(req.params.token);
        if (!result) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }
        res.json(result);
    } catch (error) {
        console.error('Accept share invitation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resendShareInvitation = async (req, res) => {
    try {
        const result = await shareService.resendShareInvitation(req.user.userId, req.params.id, req.params.shareId);
        res.json(result);
    } catch (error) {
        console.error('Resend invitation error:', error);
        if (error.message.includes('Only the owner') || error.message.includes('not found')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
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
