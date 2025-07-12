const TaskService = require('../services/taskService');

const TaskController = {
  async createTask(req, res, next) {
    try {
      const userId = req.user.id; // Assuming user ID is available from authentication middleware
      const task = await TaskService.createTask({ ...req.body, userId });
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  },

  async getTaskById(req, res, next) {
    try {
      const { id } = req.params;
      const task = await TaskService.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  },

  async getTasksByUserId(req, res, next) {
    try {
      const userId = req.user.id; // Assuming user ID is available from authentication middleware
      const tasks = await TaskService.getTasksByUserId(userId);
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const updatedTask = await TaskService.updateTask(id, req.body);
      if (!updatedTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.status(200).json(updatedTask);
    } catch (error) {
      next(error);
    }
  },

  async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await TaskService.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = TaskController;
