import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types/calendar.types';
import { format, parseISO } from 'date-fns';
import { useCalendar } from '../../context/CalendarContext';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  initialEvent?: CalendarEvent | null; // Optional prop for editing
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, initialEvent }) => {
  const { calendars } = useCalendar();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(format(new Date(), 'HH:mm'));
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState('bg-primary');
  const [calendarId, setCalendarId] = useState(''); // Initialize with empty string
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setTitle(initialEvent.title);
        setStartDate(format(initialEvent.startTime, 'yyyy-MM-dd'));
        setStartTime(format(initialEvent.startTime, 'HH:mm'));
        setEndDate(format(initialEvent.endTime, 'yyyy-MM-dd'));
        setEndTime(format(initialEvent.endTime, 'HH:mm'));
        setIsAllDay(initialEvent.isAllDay || false);
        setColor(initialEvent.color || 'bg-primary');
        setCalendarId(initialEvent.calendarId || (calendars.length > 0 ? calendars[0].id : ''));
        setIsRecurring(initialEvent.isRecurring || false);
        setRecurrenceRule(initialEvent.recurrenceRule || '');
      } else {
        // Reset form for new event creation
        setTitle('');
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setStartTime(format(new Date(), 'HH:mm'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
        setEndTime(format(new Date(), 'HH:mm'));
        setIsAllDay(false);
        setColor('bg-primary');
        setCalendarId(calendars.length > 0 ? calendars[0].id : ''); // Set to first calendar ID
        setIsRecurring(false);
        setRecurrenceRule('');
      }
    }
  }, [isOpen, initialEvent, calendars]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = parseISO(`${startDate}T${startTime}`);
    const endDateTime = parseISO(`${endDate}T${endTime}`);

    const eventToSave: CalendarEvent = {
      id: initialEvent ? initialEvent.id : Date.now().toString(),
      title,
      startTime: startDateTime,
      endTime: endDateTime,
      isAllDay,
      color,
      calendarId,
      isRecurring,
      recurrenceRule,
    };

    onSave(eventToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surfaceContainerHigh rounded-lg shadow-xl p-6 w-full max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-onSurface mb-4">
          {initialEvent ? 'Edit Event' : 'Create New Event'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-onSurfaceVariant">Title</label>
            <input
              type="text"
              id="title"
              className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

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
            {!isAllDay && (
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
            {!isAllDay && (
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
            <label htmlFor="isAllDay" className="flex items-center text-sm font-medium text-onSurfaceVariant">
              <input
                type="checkbox"
                id="isAllDay"
                className="mr-2 rounded border-outlineVariant text-primary shadow-sm focus:ring-primary"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
              />
              All Day Event
            </label>
          </div>

          <div>
            <label htmlFor="isRecurring" className="flex items-center text-sm font-medium text-onSurfaceVariant">
              <input
                type="checkbox"
                id="isRecurring"
                className="mr-2 rounded border-outlineVariant text-primary shadow-sm focus:ring-primary"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              Recurring Event
            </label>
          </div>

          {isRecurring && (
            <div>
              <label htmlFor="recurrenceRule" className="block text-sm font-medium text-onSurfaceVariant">Recurrence Rule</label>
              <input
                type="text"
                id="recurrenceRule"
                className="mt-1 block w-full rounded-md border-outlineVariant shadow-sm bg-surface text-onSurface focus:border-primary focus:ring-primary"
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                placeholder="e.g., FREQ=WEEKLY;BYDAY=MO,WE,FR"
              />
            </div>
          )}

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
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-onPrimary hover:bg-primaryContainer"
            >
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;
