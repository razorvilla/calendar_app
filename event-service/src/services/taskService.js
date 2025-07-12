const TaskRepository = require('../db/taskRepository');

const TaskService = {
  async createTask(taskData) {
    return TaskRepository.create(taskData);
  },

  async getTaskById(taskId) {
    return TaskRepository.findById(taskId);
  },

  async getTasksByUserId(userId) {
    return TaskRepository.findByUserId(userId);
  },

  async updateTask(taskId, updateData) {
    return TaskRepository.update(taskId, updateData);
  },

  async deleteTask(taskId) {
    return TaskRepository.delete(taskId);
  },
};

module.exports = TaskService;
