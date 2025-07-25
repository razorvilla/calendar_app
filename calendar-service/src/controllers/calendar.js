const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const getCalendars = async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = `
            SELECT c.*,
            CASE WHEN c.owner_id = $1 THEN true ELSE false END as is_owner,
            CASE WHEN c.owner_id = $1 THEN 'owner' ELSE cs.permission END as role
            FROM calendars c
            LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
            WHERE c.owner_id = $1
            OR (cs.user_id = $1 AND cs.status = 'accepted')
            ORDER BY c.is_default DESC, c.name ASC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get calendars error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const createCalendar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, description, color, isDefault, isVisible } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Calendar name is required' });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const calendarId = uuidv4();
            const insertResult = await client.query(
                `INSERT INTO calendars (
                    id, owner_id, name, description, color, is_default, is_visible, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING *`,
                [calendarId, userId, name, description, color, isDefault || false, isVisible !== undefined ? isVisible : true]
            );
            const calendar = insertResult.rows[0];
            if (isDefault) {
                await client.query(
                    'UPDATE calendars SET is_default = false WHERE owner_id = $1 AND id != $2',
                    [userId, calendarId]
                );
            }
            await client.query('COMMIT');
            calendar.is_owner = true;
            calendar.role = 'owner';
            res.status(201).json(calendar);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Create calendar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const getCalendar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const query = `
            SELECT c.*,
            CASE WHEN c.owner_id = $1 THEN true ELSE false END as is_owner,
            CASE WHEN c.owner_id = $1 THEN 'owner' ELSE cs.permission END as role
            FROM calendars c
            LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
            WHERE c.id = $2 AND (c.owner_id = $1 OR (cs.user_id = $1 AND cs.status = 'accepted'))
        `;
        const result = await pool.query(query, [userId, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Calendar not found or access denied' });
        }
        const calendar = result.rows[0];
        if (calendar.is_owner) {
            const sharesResult = await pool.query(
                'SELECT * FROM calendar_shares WHERE calendar_id = $1',
                [id]
            );
            calendar.shares = sharesResult.rows;
        }
        res.json(calendar);
    } catch (error) {
        console.error('Get calendar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const updateCalendar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { name, description, color, isDefault, isVisible } = req.body;
        const accessCheck = await pool.query(
            `SELECT c.*,
            CASE WHEN c.owner_id = $1 THEN 'owner' ELSE cs.permission END as role
            FROM calendars c
            LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
            WHERE c.id = $2`,
            [userId, id]
        );
        if (accessCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Calendar not found' });
        }
        const calendar = accessCheck.rows[0];
        const isOwner = calendar.owner_id === userId;
        if (!isOwner && calendar.role !== 'edit') {
            return res.status(403).json({ error: 'Permission denied' });
        }
        if ((isDefault !== undefined || isVisible !== undefined) && !isOwner) {
            return res.status(403).json({ error: 'Only the owner can change default status and visibility' });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let updateFields = [];
            let values = [];
            let paramCount = 1;
            if (name !== undefined && isOwner) {
                updateFields.push(`name = $${paramCount}`);
                values.push(name);
                paramCount++;
            }
            if (description !== undefined) {
                updateFields.push(`description = $${paramCount}`);
                values.push(description);
                paramCount++;
            }
            if (color !== undefined) {
                updateFields.push(`color = $${paramCount}`);
                values.push(color);
                paramCount++;
            }
            if (isVisible !== undefined && isOwner) {
                updateFields.push(`is_visible = $${paramCount}`);
                values.push(isVisible);
                paramCount++;
            }
            if (isDefault !== undefined && isOwner) {
                updateFields.push(`is_default = $${paramCount}`);
                values.push(isDefault);
                paramCount++;
            }
            updateFields.push(`updated_at = NOW()`);
            if (updateFields.length <= 1) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'No fields to update' });
            }
            values.push(id);
            const updateResult = await client.query(
                `UPDATE calendars SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );
            if (isDefault && isOwner) {
                await client.query(
                    'UPDATE calendars SET is_default = false WHERE owner_id = $1 AND id != $2',
                    [userId, id]
                );
            }
            await client.query('COMMIT');
            const updatedCalendar = updateResult.rows[0];
            updatedCalendar.is_owner = isOwner;
            updatedCalendar.role = isOwner ? 'owner' : calendar.role;
            res.json(updatedCalendar);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Update calendar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const deleteCalendar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const ownerCheck = await pool.query(
            'SELECT * FROM calendars WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );
        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Only the owner can delete a calendar' });
        }
        await pool.query('DELETE FROM calendars WHERE id = $1', [id]);
        res.json({ message: 'Calendar deleted successfully' });
    } catch (error) {
        console.error('Delete calendar error:', error);
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