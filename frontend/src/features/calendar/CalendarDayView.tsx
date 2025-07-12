import React, { useState, useEffect } from 'react';
import {
  format,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  isSameDay,
  isWithinInterval,
  differenceInMinutes,
  areIntervalsOverlapping,
} from 'date-fns';
import { CalendarEvent } from '../../types/calendar.types';

interface CalendarDayViewProps {
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  allEvents: CalendarEvent[];
  isLoadingEvents: boolean; // Added isLoadingEvents prop
}

const CalendarDayView: React.FC<CalendarDayViewProps> = ({ currentDate, onEventClick, allEvents, isLoadingEvents }) => {
  console.log('CalendarDayView - currentDate:', currentDate);
  console.log('CalendarDayView - allEvents:', allEvents);
  console.log('CalendarDayView - isLoadingEvents (from context):', isLoadingEvents);

  const hours = eachHourOfInterval({
    start: startOfDay(currentDate),
    end: endOfDay(currentDate),
  });

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return allEvents.filter(event =>
      isSameDay(event.start, day) ||
      (event.allDay && isWithinInterval(day, { start: event.start, end: event.end }))
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const events = getEventsForDay(currentDate);

  const calculateEventPositions = (events: CalendarEvent[]) => {
    const positionedEvents = events.map(event => ({
      event,
      top: (differenceInMinutes(event.start, startOfDay(currentDate)) / 60) * 48,
      height: (differenceInMinutes(event.end, event.start) / 60) * 48,
      left: 0,
      width: 100,
    }));

    positionedEvents.forEach((eventPos, i) => {
      let overlapCount = 0;
      let overlapIndex = 0;

      for (let j = 0; j < positionedEvents.length; j++) {
        if (i === j) continue;

        const otherEventPos = positionedEvents[j];

        if (
          areIntervalsOverlapping(
            { start: eventPos.event.start, end: eventPos.event.end },
            { start: otherEventPos.event.start, end: otherEventPos.event.end }
          )
        ) {
          overlapCount++;
          if (j < i) {
            overlapIndex++;
          }
        }
      }

      if (overlapCount > 0) {
        const width = 100 / (overlapCount + 1);
        eventPos.width = width;
        eventPos.left = overlapIndex * width;
      }
    });

    return positionedEvents;
  };

  const positionedEvents = calculateEventPositions(events);

  return (
    <div className="bg-surfaceContainer rounded-lg shadow-md p-6 h-full flex flex-col">
      {isLoadingEvents ? (
        <div className="flex flex-1 items-center justify-center text-onSurface">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-onSurfaceVariant">
          No events for this day.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[50px_1fr] gap-1 h-full">
            {/* Time Axis */}
            <div className="flex flex-col border-r border-outlineVariant">
              {hours.map((h, index) => {
                const hour = h; // Explicitly assign to a new variable
                return (
                  <div
                    key={index}
                    className="h-12 flex items-center justify-end pr-2 text-xs text-outline"
                  >
                    {format(hour, 'ha')}
                  </div>
                );
              })}
            </div> {/* Closing tag for Time Axis div */}

            {/* Events Area */}
            <div className="relative">
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className="h-12 border-b border-outlineVariant border-dotted"
                ></div>
              ))}
              {/* Render events */}
              {positionedEvents.map(({ event, top, height, left, width }) => (
                <div
                  key={event.id}
                  className={`${event.color} text-onPrimary rounded-md p-1 text-xs overflow-hidden absolute cursor-pointer cursor-grab`}
                  style={{ top: `${top}px`, height: `${height}px`, left: `${left}%`, width: `${width}%` }}
                  onClick={() => onEventClick(event)}
                >
                  <p className="font-semibold">{event.title}</p>
                  {!event.allDay && (
                    <p>{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarDayView;
