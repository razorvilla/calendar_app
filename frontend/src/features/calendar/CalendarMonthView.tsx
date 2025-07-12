import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  isWithinInterval,
} from 'date-fns';
import { CalendarEvent } from '../../types/calendar.types';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const daysOfWeekShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalendarMonthViewProps {
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  allEvents: CalendarEvent[];
  isLoadingEvents: boolean;
}

const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({ currentDate, onEventClick, onDateClick, allEvents, isLoadingEvents }) => {
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const filtered = allEvents.filter(event => {
      const isSameDayCheck = isSameDay(event.start, day);
      const isWithinIntervalCheck = event.allDay && isWithinInterval(day, { start: event.start, end: event.end });
      return isSameDayCheck || isWithinIntervalCheck;
    });
    return filtered.sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  return (
    <div className="bg-surfaceContainer rounded-lg shadow-md p-6 h-full flex flex-col">
      {renderDays(daysOfWeek, daysOfWeekShort)}
      {renderCells(currentDate, allEvents, onEventClick, getEventsForDay, onDateClick)}
    </div>
  );
};

export default CalendarMonthView;

const renderDays = (daysOfWeek: string[], daysOfWeekShort: string[]) => {
  return (
    <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-outline">
      {daysOfWeek.map((day, index) => (
        <div key={index} className="py-2 hidden sm:block">
          {day}
        </div>
      ))}
      {daysOfWeekShort.map((day, index) => (
        <div key={index} className="py-2 sm:hidden">
          {day}
        </div>
      ))}
    </div>
  );
};

const renderCells = (currentDate: Date, allEvents: CalendarEvent[], onEventClick: (event: CalendarEvent) => void, getEventsForDay: (day: Date) => CalendarEvent[], onDateClick: (day: Date) => void) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows = [];
  let days = [];
  let day = startDate;
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const events = getEventsForDay(cloneDay);

      days.push(
        <div
          className={`p-2 border border-outlineVariant rounded-md flex flex-col items-start justify-start text-onSurface cursor-pointer
            ${!isSameMonth(cloneDay, currentDate) ? 'text-outline opacity-50' : ''}
            ${isSameDay(cloneDay, new Date()) ? 'bg-primaryContainer text-onPrimaryContainer' : ''}
          `}
          key={cloneDay.toString()}
          onClick={() => onDateClick(cloneDay)}
        >
          <span className="text-xs font-semibold">{format(cloneDay, 'd')}</span>
          <div className="flex flex-wrap mt-1 w-full">
            {events.map(event => (
              <div
                key={event.id}
                className={`${event.color || 'bg-primary'} w-2 h-2 rounded-full mr-1 mb-1 cursor-pointer`}
                onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                title={event.title}
              ></div>
            ))}
          </div>
        </div>,
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7 gap-1 flex-1" key={day.toString()}>
        {days}
      </div>,
    );
    days = [];
  }

  return <div className="border-t border-outlineVariant pt-1 flex flex-col flex-1">{rows}</div>;
};