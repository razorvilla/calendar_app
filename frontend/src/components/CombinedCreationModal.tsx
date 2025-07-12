
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarEvent } from '../types/calendar.types';

interface CombinedCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onSaveTask: (task: any) => void; // Replace with a proper Task type
  onSaveAppointmentSchedule: (schedule: any) => void; // Replace with a proper Schedule type
  initialDate?: Date;
  initialTab?: 'Event' | 'Task' | 'Appointment Schedule';
  userName?: string;
}

const CombinedCreationModal: React.FC<CombinedCreationModalProps> = ({
  isOpen,
  onClose,
  onSaveEvent,
  onSaveTask,
  onSaveAppointmentSchedule,
  initialDate = new Date(),
  initialTab = 'Event',
  userName = 'Prateek Mondal',
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Event State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(initialDate, 'HH:mm'));
  const [endDate, setEndDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(format(initialDate, 'HH:mm'));
  const [description, setDescription] = useState('');

  // Task State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  // Appointment Schedule State
  const [scheduleType, setScheduleType] = useState('existing');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Reset fields
      setTitle('');
      setStartDate(format(initialDate, 'yyyy-MM-dd'));
      setStartTime(format(initialDate, 'HH:mm'));
      setEndDate(format(initialDate, 'yyyy-MM-dd'));
      setEndTime(format(initialDate, 'HH:mm'));
      setDescription('');
      setTaskTitle('');
      setTaskDescription('');
      setScheduleType('existing');
    }
  }, [isOpen, initialDate, initialTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    switch (activeTab) {
      case 'Event':
        onSaveEvent({
          title,
          startTime: parseISO(`${startDate}T${startTime}`),
          endTime: parseISO(`${endDate}T${endTime}`),
          description,
          calendarId: 'cal1', // Placeholder, ideally selected by user
          isAllDay: false,
          color: 'bg-primary',
        } as CalendarEvent);
        break;
      case 'Task':
        onSaveTask({
          title: taskTitle,
          description: taskDescription,
          dueDate: initialDate.toISOString(),
        });
        break;
      case 'Appointment Schedule':
        onSaveAppointmentSchedule({
          calendarId: 'cal1', // Placeholder
          name: 'My Appointment Schedule',
          description: 'Automatically created schedule',
          durationMinutes: 30,
          slotIntervalMinutes: 30,
          availabilityRules: { days: [0, 1, 2, 3, 4], startTime: '09:00', endTime: '17:00' },
          // For now, we're not creating individual slots here, just the schedule
        });
        break;
    }
    onClose();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Event':
        return (
          <form className="space-y-4">
            <input type="text" placeholder="Add title" className="w-full p-2 text-2xl border-b-2" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex space-x-4">
              <input type="date" className="mt-1 block w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="time" className="mt-1 block w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex space-x-4">
              <input type="date" className="mt-1 block w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <input type="time" className="mt-1 block w-full" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <textarea placeholder="Add description" className="w-full p-2" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
          </form>
        );
      case 'Task':
        return (
          <form className="space-y-4">
            <input type="text" placeholder="Add title" className="w-full p-2 text-2xl border-b-2" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            <div className="flex items-center text-gray-700">
              <span>{format(initialDate, 'MMM d, yyyy, h:mm a')} &middot; Does not repeat</span>
            </div>
            <textarea placeholder="Add description" className="w-full p-2" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)}></textarea>
          </form>
        );
      case 'Appointment Schedule':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-white border rounded-full px-3 py-1 text-sm">{format(initialDate, 'EEEE, MMMM d')}</div>
              <div className="bg-white border rounded-full px-3 py-1 text-sm">8:30am</div>
              <div className="bg-white border rounded-full px-3 py-1 text-sm">9:30am</div>
            </div>
            <p className="text-xs text-gray-600">Add availability or create a new bookable appointment schedule. <a href="#" className="text-blue-600">Learn more</a></p>
            <div className="space-y-2">
                <label className="flex items-start p-3 rounded-lg border bg-white">
                    <input type="radio" name="scheduleType" value="existing" checked={scheduleType === 'existing'} onChange={() => setScheduleType('existing')} />
                    <div className="ml-3">
                        <span>Add availability to an existing schedule</span>
                    </div>
                </label>
                <label className="flex items-start p-3 rounded-lg border bg-white">
                    <input type="radio" name="scheduleType" value="new" checked={scheduleType === 'new'} onChange={() => setScheduleType('new')} />
                    <div className="ml-3">
                        <span>Create a new appointment schedule</span>
                    </div>
                </label>
            </div>
            <div className="flex items-center text-gray-700"><span>{userName}</span></div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-100 rounded-lg shadow-xl p-6 w-full max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create</h2>
          <button onClick={onClose} aria-label="Close">X</button>
        </div>
        <div className="flex border-b mb-4">
          <button onClick={() => setActiveTab('Event')} className={`px-4 py-2 ${activeTab === 'Event' ? 'border-b-2 border-blue-500' : ''}`}>Event</button>
          <button onClick={() => setActiveTab('Task')} className={`px-4 py-2 ${activeTab === 'Task' ? 'border-b-2 border-blue-500' : ''}`}>Task</button>
          <button onClick={() => setActiveTab('Appointment Schedule')} className={`px-4 py-2 ${activeTab === 'Appointment Schedule' ? 'border-b-2 border-blue-500' : ''}`}>Appointment Schedule</button>
        </div>
        <div>{renderContent()}</div>
        <div className="flex justify-end mt-6">
          <button onClick={handleSave} className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
};

export default CombinedCreationModal;
