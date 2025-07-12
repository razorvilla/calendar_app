import React, { useState, useEffect } from 'react';
import {
  format,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { CalendarEvent } from '../../types/calendar.types';

interface CalendarYearViewProps {
  currentDate: Date;
  allEvents: CalendarEvent[];
  isLoadingEvents: boolean; // Added isLoadingEvents prop
}

const CalendarYearView: React.FC<CalendarYearViewProps> = ({ currentDate, allEvents, isLoadingEvents }) => {
  console.log('CalendarYearView - currentDate:', currentDate);
  console.log('CalendarYearView - allEvents:', allEvents);
  console.log('CalendarYearView - isLoadingEvents (from context):', isLoadingEvents);

  

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return allEvents.filter(event =>
      isSameDay(event.start, day) ||
      (event.allDay && isWithinInterval(day, { start: event.start, end: event.end }))
    );
  };

  const renderMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endOfMonth(startOfWeek(monthEnd, { weekStartsOn: 0 })) });

    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <div className="bg-surfaceContainerLow rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-onSurface mb-2 text-center">
          {format(month, 'MMM')}
        </h3>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-outline mb-1">
          {daysOfWeek.map((day, index) => (
            <div key={index}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {daysInMonth.map((day, index) => {
            const events = getEventsForDay(day);
            return (
              <div
                key={index}
                className={`p-1 rounded-full flex items-center justify-center relative
                  ${!isSameMonth(day, month) ? 'text-outline opacity-50' : 'text-onSurface'}
                  ${isSameDay(day, new Date()) ? 'bg-primaryContainer text-onPrimaryContainer font-bold' : ''}
                `}
              >
                {format(day, 'd')}
                {events.length > 0 && (
                  <span className="absolute bottom-0 right-0 w-1 h-1 bg-primary rounded-full"></span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const months = eachMonthOfInterval({
    start: startOfYear(currentDate),
    end: endOfYear(currentDate),
  });

  const totalEventsInYear = months.reduce((count, month) => {
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    return count + daysInMonth.reduce((dayCount, day) => dayCount + getEventsForDay(day).length, 0);
  }, 0);

  return (
    <div className="bg-surfaceContainer rounded-lg shadow-md p-6 h-full flex flex-col">
      {isLoadingEvents ? (
        <div className="flex flex-1 items-center justify-center text-onSurface">
          Loading events...
        </div>
      ) : totalEventsInYear === 0 ? (
        <div className="flex flex-1 items-center justify-center text-onSurfaceVariant">
          No events for this year.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {months.map((month, index) => (
            <React.Fragment key={index}>
              {renderMonth(month)}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarYearView;