const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const getCalendars = async (userId) => {
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
    return result.rows;
};

const createCalendar = async (userId, calendarData) => {
    console.log('Calendar Service: createCalendar received userId:', userId, 'calendarData:', calendarData);
    const { name, description, color, isDefault, isVisible } = calendarData;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const calendarId = uuidv4();
        console.log('Calendar Service: Executing INSERT query for calendar:', {
            calendarId, userId, name, description, color, isDefault: isDefault || false, isVisible: isVisible !== undefined ? isVisible : true
        });
        const insertResult = await client.query(
            `INSERT INTO calendars (
                id, owner_id, name, description, color, is_default, is_visible, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *`,
            [calendarId, userId, name, description, color, isDefault || false, isVisible !== undefined ? isVisible : true]
        );
        const calendar = insertResult.rows[0];
        console.log('Calendar Service: INSERT query result for calendar:', calendar);
        if (isDefault) {
            await client.query(
                'UPDATE calendars SET is_default = false WHERE owner_id = $1 AND id != $2',
                [userId, calendarId]
            );
        }
        await client.query('COMMIT');
        calendar.is_owner = true;
        calendar.role = 'owner';
        return calendar;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getCalendarById = async (userId, calendarId) => {
    const query = `
        SELECT c.*, 
            CASE WHEN c.owner_id = $1 THEN true ELSE false END as is_owner,
            CASE WHEN c.owner_id = $1 THEN 'owner' ELSE cs.permission END as role
        FROM calendars c
        LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
        WHERE c.id = $2 AND (c.owner_id = $1 OR (cs.user_id = $1 AND cs.status = 'accepted'))
    `;
    const result = await pool.query(query, [userId, calendarId]);
    if (result.rows.length === 0) {
        return null;
    }
    const calendar = result.rows[0];
    if (calendar.is_owner) {
        const sharesResult = await pool.query(
            'SELECT * FROM calendar_shares WHERE calendar_id = $1',
            [calendarId]
        );
        calendar.shares = sharesResult.rows;
    }
    return calendar;
};

const updateCalendar = async (userId, calendarId, calendarData) => {
    console.log('Calendar Service: updateCalendar received userId:', userId, 'calendarId:', calendarId, 'calendarData:', calendarData);
    const { name, description, color, isDefault, isVisible } = calendarData;
    const accessCheck = await pool.query(
        `SELECT c.*, 
            CASE WHEN c.owner_id = $1 THEN 'owner' ELSE cs.permission END as role
           FROM calendars c
           LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
           WHERE c.id = $2`,
        [userId, calendarId]
    );

    if (accessCheck.rows.length === 0) {
        return null; // Or throw a not found error
    }

    const calendar = accessCheck.rows[0];
    const isOwner = calendar.owner_id === userId;

    if (!isOwner && calendar.role !== 'edit') {
        throw new Error('Permission denied');
    }

    if ((isDefault !== undefined || isVisible !== undefined) && !isOwner) {
        throw new Error('Only the owner can change default status and visibility');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        if (name !== undefined && isOwner) {
            updateFields.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (color !== undefined) {
            updateFields.push(`color = $${paramCount++}`);
            values.push(color);
        }
        if (isVisible !== undefined && isOwner) {
            updateFields.push(`is_visible = $${paramCount++}`);
            values.push(isVisible);
        }
        if (isDefault !== undefined && isOwner) {
            updateFields.push(`is_default = $${paramCount++}`);
            values.push(isDefault);
        }

        if (updateFields.length === 0) {
            return calendar; // No fields to update
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(calendarId);

        console.log('Calendar Service: Executing UPDATE query for calendar:', {
            calendarId, updateFields, values
        });
        const updateResult = await client.query(
            `UPDATE calendars SET ${updateFields.join(', ')} WHERE id = ${paramCount} RETURNING *`,
            values
        );

        console.log('Calendar Service: UPDATE query result for calendar:', updateResult.rows[0]);

        if (isDefault && isOwner) {
            await client.query(
                'UPDATE calendars SET is_default = false WHERE owner_id = $1 AND id != $2',
                [userId, calendarId]
            );
        }

        await client.query('COMMIT');
        const updatedCalendar = updateResult.rows[0];
        updatedCalendar.is_owner = isOwner;
        updatedCalendar.role = isOwner ? 'owner' : calendar.role;
        return updatedCalendar;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteCalendar = async (userId, calendarId) => {
    const ownerCheck = await pool.query(
        'SELECT * FROM calendars WHERE id = $1 AND owner_id = $2',
        [calendarId, userId]
    );

    if (ownerCheck.rows.length === 0) {
        throw new Error('Only the owner can delete a calendar');
    }

    await pool.query('DELETE FROM calendars WHERE id = $1', [calendarId]);
    return { message: 'Calendar deleted successfully' };
};

module.exports = {
    getCalendars,
    createCalendar,
    getCalendarById,
    updateCalendar,
    deleteCalendar,
};