import React, { useState, useEffect } from 'react';
import {
  format,
  addDays,
  eachDayOfInterval,
  isToday,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { CalendarEvent } from '../../types/calendar.types';

interface CalendarScheduleViewProps {
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  allEvents: CalendarEvent[];
  isLoadingEvents: boolean; // Added isLoadingEvents prop
}

const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({ currentDate, onEventClick, allEvents, isLoadingEvents }) => {
  console.log('CalendarScheduleView - currentDate:', currentDate);
  console.log('CalendarScheduleView - allEvents:', allEvents);
  console.log('CalendarScheduleView - isLoadingEvents (from context):', isLoadingEvents);

  

  const daysToDisplay = eachDayOfInterval({
    start: currentDate,
    end: addDays(currentDate, 6), // Display 7 days
  });

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return allEvents.filter(event =>
      isSameDay(event.start, day) ||
      (event.allDay && isWithinInterval(day, { start: event.start, end: event.end }))
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const totalEventsInView = daysToDisplay.reduce((count, day) => count + getEventsForDay(day).length, 0);

  return (
    <div className="bg-surfaceContainer rounded-lg shadow-md p-6 h-full flex flex-col">
      {isLoadingEvents ? (
        <div className="flex flex-1 items-center justify-center text-onSurface">
          Loading events...
        </div>
      ) : totalEventsInView === 0 ? (
        <div className="flex flex-1 items-center justify-center text-onSurfaceVariant">
          No events for this period.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {daysToDisplay.map((day, dayIndex) => (
            <div key={dayIndex} className="mb-6">
              <h3
                className={`text-lg font-semibold mb-2 ${isToday(day) ? 'text-primary' : 'text-onSurface'}`}
              >
                {format(day, 'EEEE, MMMM d')}
              </h3>
              <div className="space-y-2">
                {getEventsForDay(day).length > 0 ? (
                  getEventsForDay(day).map(event => (
                    <div
                      key={event.id}
                      className={`${event.color} text-onPrimary rounded-md p-3 shadow-sm flex items-center space-x-3 cursor-pointer`}
                      onClick={() => onEventClick(event)}
                    >
                      {!event.allDay && <span className="font-medium">{format(event.start, 'h:mm a')}</span>}
                      <span>{event.title}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-outline">No events for this day.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarScheduleView;