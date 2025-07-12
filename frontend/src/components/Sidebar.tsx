import React, { useState } from 'react';
import MiniCalendar from './MiniCalendar';
import { CalendarEvent, Calendar } from '../types/calendar.types';

interface SidebarProps {
  isOpen: boolean;
  onOpenUnifiedCreationModal: (initialTab: 'Event' | 'Task' | 'Appointment Schedule') => void; // New prop
  allEvents: CalendarEvent[];
  calendars: Calendar[];
  activeCalendarIds: string[];
  onToggleCalendar: (calendarId: string) => void;
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onOpenUnifiedCreationModal, // Use new prop
  allEvents,
  calendars,
  activeCalendarIds,
  onToggleCalendar,
  currentDate,
  onDateSelect,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCreateClick = (type: 'Event' | 'Task' | 'Appointment Schedule') => {
    onOpenUnifiedCreationModal(type); // Call new prop
    setIsDropdownOpen(false);
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-20 bg-surfaceContainerHigh shadow-md p-2 flex flex-col
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 max-w-64' : '-translate-x-full max-w-0 overflow-hidden'}
        md:relative md:top-0
        ${isOpen ? 'md:max-w-64' : 'md:max-w-0 md:overflow-hidden'}
      `}
    >
      <div className="relative mb-6">
        <button
          className="bg-primary hover:bg-primaryContainer text-onPrimary px-4 py-2 rounded-md shadow-sm w-full flex items-center justify-center space-x-2"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-label="Create new item"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          <span>Create</span>
        </button>
        {isDropdownOpen && (
          <div className="absolute z-30 mt-2 w-full bg-surface rounded-md shadow-lg py-1">
            <button
              className="block px-4 py-2 text-sm text-onSurface hover:bg-surfaceVariant w-full text-left"
              onClick={() => handleCreateClick('Event')}
              aria-label="Create new event"
            >
              Event
            </button>
            <button
              className="block px-4 py-2 text-sm text-onSurface hover:bg-surfaceVariant w-full text-left"
              onClick={() => handleCreateClick('Task')}
              aria-label="Create new task"
            >
            Task
            </button>
            <button
              className="block px-4 py-2 text-sm text-onSurface hover:bg-surfaceVariant w-full text-left"
              onClick={() => handleCreateClick('Appointment Schedule')}
              aria-label="Create new appointment schedule"
            >
              Appointment Schedule
            </button>
          </div>
        )}
      </div>
      <MiniCalendar allEvents={allEvents} currentDate={currentDate} onDateSelect={onDateSelect} />
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-onSurface">Calendars</h2>
        <ul className="mt-4 space-y-2">
          {calendars.map(calendar => (
            <li key={calendar.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={calendar.id}
                checked={activeCalendarIds.includes(calendar.id)}
                onChange={() => onToggleCalendar(calendar.id)}
                className={`form-checkbox h-4 w-4 ${calendar.color} rounded focus:ring-primary`}
              />
              <label htmlFor={calendar.id} className={`text-onSurface cursor-pointer ${calendar.color.replace('bg-', 'text-')}`}>
                {calendar.name}
              </label>
            </li>
          ))}
        </ul>
      </div>
      {/* Other navigation/settings will go here */}
    </aside>
  );
};

export default Sidebar;
