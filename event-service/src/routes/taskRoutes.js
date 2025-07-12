const express = require('express');
const TaskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, TaskController.createTask);
router.get('/', authenticate, TaskController.getTasksByUserId);
router.get('/:id', authenticate, TaskController.getTaskById);
router.put('/:id', authenticate, TaskController.updateTask);
router.delete('/:id', authenticate, TaskController.deleteTask);

module.exports = router;
