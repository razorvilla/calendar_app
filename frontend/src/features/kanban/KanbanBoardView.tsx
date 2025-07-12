import React, { useState } from 'react';

interface Task {
  id: string;
  content: string;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    tasks: [
      { id: '1', content: 'Design UI Mockups' },
      { id: '2', content: 'Set up API Gateway' },
      { id: '3', content: 'Implement Auth Service' },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    tasks: [
      { id: '4', content: 'Develop Calendar View' },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    tasks: [
      { id: '5', content: 'Project Initialization' },
      { id: '6', content: 'Basic Layout Setup' },
    ],
  },
];

const KanbanBoardView: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [newTaskContent, setNewTaskContent] = useState('');

  const handleDragStart = (e: React.DragEvent, taskId: string, columnId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('columnId', columnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const sourceColumnId = e.dataTransfer.getData('columnId');

    if (sourceColumnId === targetColumnId) {
      return;
    }

    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const sourceColumnIndex = newColumns.findIndex(col => col.id === sourceColumnId);
      const targetColumnIndex = newColumns.findIndex(col => col.id === targetColumnId);

      const taskToMoveIndex = newColumns[sourceColumnIndex].tasks.findIndex(task => task.id === taskId);
      const [taskToMove] = newColumns[sourceColumnIndex].tasks.splice(taskToMoveIndex, 1);

      newColumns[targetColumnIndex].tasks.push(taskToMove);

      return newColumns;
    });
  };

  const handleAddTask = (columnId: string) => {
    if (newTaskContent.trim() === '') return;

    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const targetColumnIndex = newColumns.findIndex(col => col.id === columnId);
      newColumns[targetColumnIndex].tasks.push({
        id: Date.now().toString(),
        content: newTaskContent.trim(),
      });
      return newColumns;
    });
    setNewTaskContent('');
  };

  const handleDeleteTask = (columnId: string, taskId: string) => {
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const targetColumnIndex = newColumns.findIndex(col => col.id === columnId);
      newColumns[targetColumnIndex].tasks = newColumns[targetColumnIndex].tasks.filter(task => task.id !== taskId);
      return newColumns;
    });
  };

  return (
    <div className="bg-surfaceContainer rounded-lg shadow-md p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-onSurface mb-4">Kanban Board</h2>
      <div className="flex space-x-4 h-full overflow-x-auto">
        {columns.map(column => (
          <div
            key={column.id}
            className="flex-1 bg-surfaceContainerLow rounded-lg p-4 min-w-[280px] flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <h3 className="text-lg font-semibold text-onSurface mb-3">{column.title}</h3>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {column.tasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id, column.id)}
                  className="bg-surface rounded-md p-3 shadow-sm text-onSurface cursor-grab flex justify-between items-center"
                >
                  <span>{task.content}</span>
                  <button
                    onClick={() => handleDeleteTask(column.id, task.id)}
                    className="text-onSurfaceVariant hover:text-error ml-2"
                    aria-label="Delete task"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {column.id === 'todo' && (
              <div className="mt-4 flex">
                <input
                  type="text"
                  className="flex-1 rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary px-3 py-2"
                  placeholder="Add new task..."
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTask(column.id);
                    }
                  }}
                />
                <button
                  onClick={() => handleAddTask(column.id)}
                  className="ml-2 px-4 py-2 rounded-md bg-primary text-onPrimary hover:bg-primaryContainer"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoardView;
