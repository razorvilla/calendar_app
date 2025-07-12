const knex = require('../../../shared/knexfile');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = 'tasks';

const TaskRepository = {
  async create(task) {
    const [newTask] = await knex(TABLE_NAME).insert({
      id: uuidv4(),
      user_id: task.userId,
      title: task.title,
      description: task.description,
      due_date: task.dueDate || null,
      is_completed: task.isCompleted || false,
    }).returning('*');
    return newTask;
  },

  async findById(id) {
    return knex(TABLE_NAME).where({ id }).first();
  },

  async findByUserId(userId) {
    return knex(TABLE_NAME).where({ user_id: userId });
  },

  async update(id, updates) {
    const [updatedTask] = await knex(TABLE_NAME).where({ id }).update({
      title: updates.title,
      description: updates.description,
      due_date: updates.dueDate,
      is_completed: updates.isCompleted,
      updated_at: knex.fn.now(),
    }).returning('*');
    return updatedTask;
  },

  async delete(id) {
    return knex(TABLE_NAME).where({ id }).del();
  },
};

module.exports = TaskRepository;
