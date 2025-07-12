
import React, { useState } from 'react';
import { format } from 'date-fns';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: any) => void; // Replace 'any' with a proper Task type
  initialDate?: Date;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate = new Date(),
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskList, setTaskList] = useState('My Tasks');

  if (!isOpen) return null;

  const handleSave = () => {
    const newTask = {
      title,
      description,
      taskList,
      date: initialDate,
    };
    onSave(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Create Task</h2>
          <button
            className="text-gray-500 hover:text-gray-800"
            onClick={onClose}
            aria-label="Close task form"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Title Input */}
        <input
          type="text"
          placeholder="Add title"
          className="w-full p-2 text-2xl border-b-2 border-gray-300 bg-transparent text-gray-800 focus:outline-none focus:border-blue-500 mb-4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Tab Selector */}
        <div className="flex space-x-2 mb-4">
          <button className="px-3 py-1 rounded-full text-sm text-gray-600 bg-gray-200">Event</button>
          <button className="px-3 py-1 rounded-full text-sm text-white bg-blue-500">Task</button>
          <button className="px-3 py-1 rounded-full text-sm text-gray-600 bg-gray-200">Appointment schedule</button>
        </div>

        {/* Date/Time Section */}
        <div className="flex items-center text-gray-700 mb-4">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>{format(initialDate, 'MMM d, yyyy, h:mm a')} &middot; Does not repeat</span>
        </div>

        {/* Description Field */}
        <textarea
          placeholder="Add description"
          className="w-full p-2 rounded-md border border-gray-300 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        {/* Dropdown Section */}
        <div className="flex items-center mb-6">
          <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          <div className="relative w-full">
            <select
              className="w-full appearance-none bg-transparent text-gray-800 py-2 pr-8 rounded-md focus:outline-none"
              value={taskList}
              onChange={(e) => setTaskList(e.target.value)}
            >
              <option>My Tasks</option>
              <option>Work</option>
              <option>Personal</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
