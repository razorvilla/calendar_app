const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const axios = require('axios');

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const shareCalendar = async (ownerId, calendarId, shareData) => {
    const { email, permission } = shareData;

    const ownerCheck = await pool.query(
        'SELECT * FROM calendars WHERE id = $1 AND owner_id = $2',
        [calendarId, ownerId]
    );

    if (ownerCheck.rows.length === 0) {
        throw new Error('Only the owner can share a calendar');
    }

    const userCheck = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    const shareUserId = userCheck.rows.length > 0 ? userCheck.rows[0].id : null;

    if (shareUserId) {
        const shareCheck = await pool.query(
            'SELECT * FROM calendar_shares WHERE calendar_id = $1 AND user_id = $2',
            [calendarId, shareUserId]
        );

        if (shareCheck.rows.length > 0) {
            const updateResult = await pool.query(
                'UPDATE calendar_shares SET permission = $1, updated_at = NOW() WHERE calendar_id = $2 AND user_id = $3 RETURNING *',
                [permission, calendarId, shareUserId]
            );
            return updateResult.rows[0];
        }
    }

    const shareId = uuidv4();
    const inviteToken = Math.random().toString(36).substring(2, 15);

    const result = await pool.query(
        `INSERT INTO calendar_shares (
            id, calendar_id, user_id, email, permission, status, invite_token, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING *`,
        [shareId, calendarId, shareUserId, email, permission, shareUserId ? 'accepted' : 'pending', inviteToken]
    );

    if (!shareUserId) {
        try {
            await axios.post(`${NOTIFICATION_SERVICE_URL}/v1/notifications/send-email`, {
                to: email,
                subject: `You have been invited to the calendar: ${ownerCheck.rows[0].name}`,
                template: 'calendar-share-invitation',
                context: {
                    calendarName: ownerCheck.rows[0].name,
                    invitationLink: `http://localhost:5173/accept-share/${inviteToken}`
                }
            });
        } catch (error) {
            console.error('Error sending invitation email:', error.message);
            // Continue even if email fails
        }
    }

    return result.rows[0];
};

const getCalendarShares = async (userId, calendarId) => {
    const ownerCheck = await pool.query(
        'SELECT * FROM calendars WHERE id = $1 AND owner_id = $2',
        [calendarId, userId]
    );

    if (ownerCheck.rows.length === 0) {
        throw new Error('Only the owner can view calendar shares');
    }

    const result = await pool.query(
        'SELECT * FROM calendar_shares WHERE calendar_id = $1 ORDER BY created_at DESC',
        [calendarId]
    );
    return result.rows;
};

const updateShare = async (userId, calendarId, shareId, shareData) => {
    const { permission, status } = shareData;

    const ownerCheck = await pool.query(
        'SELECT * FROM calendars WHERE id = $1 AND owner_id = $2',
        [calendarId, userId]
    );

    const shareCheck = await pool.query(
        'SELECT * FROM calendar_shares WHERE id = $1 AND calendar_id = $2',
        [shareId, calendarId]
    );

    if (shareCheck.rows.length === 0) {
        return null;
    }

    const share = shareCheck.rows[0];
    const isOwner = ownerCheck.rows.length > 0;
    const isRecipient = share.user_id === userId;

    if ((!isOwner && !isRecipient) || (isOwner && !permission) || (isRecipient && !status)) {
        throw new Error('Permission denied');
    }

    let updateField, updateValue;

    if (isOwner && permission) {
        updateField = 'permission';
        updateValue = permission;
    } else if (isRecipient && status) {
        updateField = 'status';
        updateValue = status;
    }

    const updateResult = await pool.query(
        `UPDATE calendar_shares SET ${updateField} = $1, updated_at = NOW() 
           WHERE id = $2 AND calendar_id = $3 RETURNING *`,
        [updateValue, shareId, calendarId]
    );

    return updateResult.rows[0];
};

const deleteShare = async (userId, calendarId, shareId) => {
    const ownerCheck = await pool.query(
        'SELECT * FROM calendars WHERE id = $1 AND owner_id = $2',
        [calendarId, userId]
    );

    const shareCheck = await pool.query(
        'SELECT * FROM calendar_shares WHERE id = $1 AND calendar_id = $2',
        [shareId, calendarId]
    );

    if (shareCheck.rows.length === 0) {
        return null;
    }

    const share = shareCheck.rows[0];
    const isOwner = ownerCheck.rows.length > 0;
    const isRecipient = share.user_id === userId;

    if (!isOwner && !isRecipient) {
        throw new Error('Permission denied');
    }

    await pool.query(
        'DELETE FROM calendar_shares WHERE id = $1 AND calendar_id = $2',
        [shareId, calendarId]
    );

    return { message: 'Share deleted successfully' };
};

const acceptShareInvitation = async (token) => {
    const tokenCheck = await pool.query(
        'SELECT * FROM calendar_shares WHERE invite_token = $1 AND status = $2',
        [token, 'pending']
    );

    if (tokenCheck.rows.length === 0) {
        return null;
    }

    const share = tokenCheck.rows[0];

    const updateResult = await pool.query(
        'UPDATE calendar_shares SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['accepted', share.id]
    );

    return {
        message: 'Calendar share accepted successfully',
        share: updateResult.rows[0]
    };
};

const resendShareInvitation = async (userId, calendarId, shareId) => {
    const ownerCheck = await pool.query(
        'SELECT * FROM calendars WHERE id = $1 AND owner_id = $2',
        [calendarId, userId]
    );

    if (ownerCheck.rows.length === 0) {
        throw new Error('Only the owner can resend invitations');
    }

    const shareCheck = await pool.query(
        'SELECT * FROM calendar_shares WHERE id = $1 AND calendar_id = $2 AND status = $3',
        [shareId, calendarId, 'pending']
    );

    if (shareCheck.rows.length === 0) {
        throw new Error('Share not found or invitation already accepted');
    }

    const share = shareCheck.rows[0];

    try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/v1/notifications/send-email`, {
            to: share.email,
            subject: `Reminder: You have been invited to the calendar: ${ownerCheck.rows[0].name}`,
            template: 'calendar-share-invitation',
            context: {
                calendarName: ownerCheck.rows[0].name,
                invitationLink: `http://localhost:5173/accept-share/${share.invite_token}`
            }
        });
    } catch (error) {
        console.error('Error resending invitation email:', error.message);
        throw new Error('Failed to resend invitation');
    }

    return { message: 'Invitation resent successfully' };
};

module.exports = {
    shareCalendar,
    getCalendarShares,
    updateShare,
    deleteShare,
    acceptShareInvitation,
    resendShareInvitation
};