
import React, { useState } from 'react';
import { format } from 'date-fns';

interface AppointmentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: any) => void; // Replace 'any' with a proper Schedule type
  initialDate?: Date;
  userName?: string;
}

const AppointmentScheduleModal: React.FC<AppointmentScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate = new Date(),
  userName = 'Prateek Mondal',
}) => {
  const [scheduleType, setScheduleType] = useState('existing');

  if (!isOpen) return null;

  const handleSave = () => {
    const newSchedule = {
      date: initialDate,
      startTime: '8:30am',
      endTime: '9:30am',
      scheduleType,
    };
    onSave(newSchedule);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-100 rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-500">Appointment times</h2>
          <button
            className="text-gray-500 hover:text-gray-800"
            onClick={onClose}
            aria-label="Close appointment schedule form"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex space-x-2 mb-4">
          <button className="px-3 py-1 rounded-full text-sm text-gray-600 bg-gray-200">Event</button>
          <button className="px-3 py-1 rounded-full text-sm text-gray-600 bg-gray-200">Task</button>
          <button className="px-3 py-1 rounded-full text-sm text-blue-700 bg-blue-200">Appointment schedule</button>
        </div>

        {/* Date and Time Picker Row */}
        <div className="flex items-center space-x-2 mb-4">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div className="flex space-x-2">
            <div className="bg-white border border-gray-300 rounded-full px-3 py-1 text-sm">{format(initialDate, 'EEEE, MMMM d')}</div>
            <div className="bg-white border border-gray-300 rounded-full px-3 py-1 text-sm">8:30am</div>
            <div className="bg-white border border-gray-300 rounded-full px-3 py-1 text-sm">9:30am</div>
          </div>
        </div>

        {/* Description/Info Section */}
        <p className="text-xs text-gray-600 mb-4">
          Add availability or create a new bookable appointment schedule you share with others. <a href="#" className="text-blue-600">Learn more</a>
        </p>

        {/* Schedule Options Section */}
        <div className="space-y-4 mb-6">
          <label className="flex items-start p-3 rounded-lg border border-gray-300 bg-white">
            <input type="radio" name="scheduleType" value="existing" checked={scheduleType === 'existing'} onChange={() => setScheduleType('existing')} className="mt-1" />
            <div className="ml-3">
              <span className="font-semibold text-gray-800">Add availability to an existing schedule</span>
              <div className="flex items-center mt-2">
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">Appointment times</span>
                <button className="ml-2 text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg></button>
                <button className="ml-2 text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
              </div>
            </div>
          </label>
          <label className="flex items-start p-3 rounded-lg border border-gray-300 bg-white">
            <input type="radio" name="scheduleType" value="new" checked={scheduleType === 'new'} onChange={() => setScheduleType('new')} className="mt-1" />
            <div className="ml-3">
              <span className="font-semibold text-gray-800">Create a new appointment schedule</span>
              <p className="text-sm text-gray-600">Starting the week of July 27</p>
            </div>
            <svg className="w-5 h-5 text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </label>
        </div>

        {/* User Info Row */}
        <div className="flex items-center text-gray-700 mb-6">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span>{userName}</span>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add to existing schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScheduleModal;
