import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarEvent } from '../types/calendar.types';
import { useCalendar } from '../../context/CalendarContext';

interface UnifiedCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void; // For Event tab
  initialDate?: Date; // Date of the day clicked in month view
  initialTab?: 'Event' | 'Task' | 'Appointment Schedule'; // New prop for initial tab
}

import { useNavigate } from 'react-router-dom'; // Import useNavigate

const UnifiedCreationModal: React.FC<UnifiedCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialTab = 'Event', // Default to Event
}) => {
  const navigate = useNavigate(); // Initialize useNavigate
  const { calendars } = useCalendar(); // Get calendars from context
  const [selectedTab, setSelectedTab] = useState(initialTab); // State for tabs
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(format(initialDate || new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(initialDate || new Date(), 'HH:mm'));
  const [endDate, setEndDate] = useState(format(initialDate || new Date(), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(format(initialDate || new Date(), 'HH:mm'));
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('bg-primary'); // Default color
  const [calendarId, setCalendarId] = useState(''); // Initialize with empty string
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTab(initialTab); // Set tab on open
      // Reset form when opened, or set initial date if provided
      setTitle('');
      setStartDate(format(initialDate || new Date(), 'yyyy-MM-dd'));
      setStartTime(format(initialDate || new Date(), 'HH:mm'));
      setEndDate(format(initialDate || new Date(), 'yyyy-MM-dd'));
      setEndTime(format(initialDate || new Date(), 'HH:mm'));
      setAllDay(false);
      setColor('bg-primary');
      setCalendarId(calendars.length > 0 ? calendars[0].id : ''); // Set to first calendar ID
      setDescription('');
    }
  }, [isOpen, initialDate, initialTab, calendars]); // Added initialTab to dependencies

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = parseISO(`${startDate}T${startTime}`);
    const endDateTime = parseISO(`${endDate}T${endTime}`);

    const newAppointment: CalendarEvent = {
      id: `temp-${Date.now()}`, // Temporary ID, backend will assign real one
      title,
      description,
      startTime: startDateTime,
      endTime: endDateTime,
      isAllDay: allDay,
      calendarId,
      color,
    };

    onSave(newAppointment);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surfaceContainerHigh rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-onSurface">Add Appointment</h2>
          <button
            className="text-onSurfaceVariant hover:text-onSurface"
            onClick={onClose}
            aria-label="Close appointment form"
          >
            <svg
              className="w-6 h-6"
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Add title"
              className="w-full p-2 text-2xl border-b-2 border-primary bg-transparent text-onSurface focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Date and Time */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-onSurfaceVariant">Start Date</label>
              <input
                type="date"
                id="startDate"
                className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            {!allDay && (
              <div className="flex-1">
                <label htmlFor="startTime" className="block text-sm font-medium text-onSurfaceVariant">Start Time</label>
                <input
                  type="time"
                  id="startTime"
                  className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-onSurfaceVariant">End Date</label>
              <input
                type="date"
                id="endDate"
                className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            {!allDay && (
              <div className="flex-1">
                <label htmlFor="endTime" className="block text-sm font-medium text-onSurfaceVariant">End Time</label>
                <input
                  type="time"
                  id="endTime"
                  className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="allDay" className="flex items-center text-sm font-medium text-onSurfaceVariant">
              <input
                type="checkbox"
                id="allDay"
                className="mr-2 rounded border-outlineVariant text-primary shadow-sm focus:ring-primary"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
              />
              All Day Event
            </label>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-onSurfaceVariant">Description</label>
            <textarea
              id="description"
              className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          {/* Color Selector */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-onSurfaceVariant">Color</label>
            <select
              id="color"
              className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option value="bg-primary">Primary</option>
              <option value="bg-secondary">Secondary</option>
              <option value="bg-tertiary">Tertiary</option>
              <option value="bg-error">Error</option>
              <option value="bg-primaryContainer">Primary Container</option>
              <option value="bg-secondaryContainer">Secondary Container</option>
              <option value="bg-tertiaryContainer">Tertiary Container</option>
            </select>
          </div>

          {/* Calendar Selector */}
          <div>
            <label htmlFor="calendarId" className="block text-sm font-medium text-onSurfaceVariant">Calendar</label>
            <select
              id="calendarId"
              className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-outlineVariant text-onSurfaceVariant hover:bg-surfaceVariant"
              onClick={() => {
                onClose(); // Close the current modal
                navigate('/full-appointment', {
                  state: {
                    initialEvent: {
                      id: `temp-${Date.now()}`, // Temporary ID
                      title,
                      description,
                      start: parseISO(`${startDate}T${startTime}`),
                      end: parseISO(`${endDate}T${endTime}`),
                      allDay,
                      calendarId,
                      color,
                    } as CalendarEvent,
                  },
                });
              }}
            >
              More Options
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-outlineVariant text-onSurfaceVariant hover:bg-surfaceVariant"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-onPrimary hover:bg-primaryContainer"
            >
              Save Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedCreationModal;
