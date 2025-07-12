import React, { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addDays,
  isWithinInterval,
} from 'date-fns';
import { CalendarEvent } from '../data/dummyEvents';

interface MiniCalendarProps {
  allEvents: CalendarEvent[];
  currentDate: Date; // Add currentDate prop
  onDateSelect: (date: Date) => void; // Add onDateSelect prop
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ allEvents, currentDate, onDateSelect }) => {
  const [displayMonth, setDisplayMonth] = useState(currentDate); // Use displayMonth for internal state

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return allEvents.filter(event =>
      isSameDay(event.start, day) ||
      (event.isAllDay && isWithinInterval(day, { start: event.start, end: event.end }))
    );
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-2">
        <button
          className="px-1 py-0.5 rounded-md text-onSurfaceVariant hover:bg-surfaceVariant text-sm"
          onClick={() => setDisplayMonth(subMonths(displayMonth, 1))}
          aria-label="Previous month"
        >
          &lt;
        </button>
        <span className="text-sm font-semibold text-onSurface">
          {format(displayMonth, 'MMM yyyy')}
        </span>
        <button
          className="px-1 py-0.5 rounded-md text-onSurfaceVariant hover:bg-surfaceVariant text-sm"
          onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
          aria-label="Next month"
        >
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    return (
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-outline">
        {daysOfWeek.map((day, index) => (
          <div key={index} className="py-1">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const cells = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const events = getEventsForDay(cloneDay);
        cells.push(
          <div
            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs relative
              ${!isSameMonth(cloneDay, displayMonth) ? 'text-outline opacity-50' : 'text-onSurface'}
              ${isSameDay(cloneDay, new Date()) ? 'bg-primaryContainer text-onPrimaryContainer font-bold' : ''}
              ${isSameDay(cloneDay, currentDate) ? 'border-2 border-primary' : ''} /* Highlight selected date */
              hover:bg-surfaceVariant cursor-pointer
            `}
            key={cloneDay.toString()}
            aria-label={`Day ${format(cloneDay, 'd')} ${format(cloneDay, 'MMM')} ${format(cloneDay, 'yyyy')}`}
            onClick={() => onDateSelect(cloneDay)} // Call onDateSelect on click
          >
            {format(cloneDay, 'd')}
            {events.length > 0 && (
              <span className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-primary rounded-full" aria-label={`${events.length} events`}></span>
            )}
          </div>,
        );
        day = addDays(day, 1);
      }
    }
    return <div className="grid grid-cols-7 gap-0.5">{cells}</div>;
  };

  return (
    <div className="bg-surfaceContainerLow rounded-lg p-3 shadow-sm mb-6">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default MiniCalendar;