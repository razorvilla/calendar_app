import React, { useState, useEffect } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  isToday,
  isSameDay,
  isWithinInterval,
  differenceInMinutes,
  areIntervalsOverlapping,
} from 'date-fns';
import { CalendarEvent } from '../../types/calendar.types';

interface CalendarWeekViewProps {
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  allEvents: CalendarEvent[];
  isLoadingEvents: boolean; // Added isLoadingEvents prop
}

const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({ currentDate, onEventClick, allEvents, isLoadingEvents }) => {
  console.log('CalendarWeekView - currentDate:', currentDate);
  console.log('CalendarWeekView - allEvents:', allEvents);
  console.log('CalendarWeekView - isLoadingEvents (from context):', isLoadingEvents);

  const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const end = endOfWeek(currentDate, { weekStartsOn: 0 }); // Saturday
  const days = eachDayOfInterval({ start, end });

  const hours = eachHourOfInterval({
    start: new Date().setHours(0, 0, 0, 0),
    end: new Date().setHours(23, 0, 0, 0),
  });

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return allEvents.filter(event =>
      isSameDay(event.start, day) ||
      (event.allDay && isWithinInterval(day, { start: event.start, end: event.end }))
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const calculateEventPositions = (events: CalendarEvent[], dayStart: Date) => {
    const positionedEvents = events.map(event => ({
      event,
      top: (differenceInMinutes(event.start, dayStart) / 60) * 48,
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

  const totalEventsInWeek = days.reduce((count, day) => count + getEventsForDay(day).length, 0);

  return (
    <div className="bg-surfaceContainer rounded-lg shadow-md p-6 h-full flex flex-col">
      {isLoadingEvents ? (
        <div className="flex flex-1 items-center justify-center text-onSurface">
          Loading events...
        </div>
      ) : totalEventsInWeek === 0 ? (
        <div className="flex flex-1 items-center justify-center text-onSurfaceVariant">
          No events for this week.
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-[50px_repeat(7,_minmax(120px,_1fr))] gap-1 h-full w-max md:w-full">
            {/* Corner and Day Headers */}
            <div className="col-span-1"></div> {/* Empty corner */}
            {days.map((day, index) => (
              <div
                key={index}
                className={`text-center text-sm font-medium text-outline pb-2 ${isToday(day) ? 'text-primary font-bold' : ''}`}
              >
                <span className="hidden sm:inline">{format(day, 'EEE d')}</span>
                <span className="sm:hidden">{format(day, 'EE')}</span>
              </div>
            ))}

            {/* Time Axis and Event Grid */}
            <div className="col-span-1 flex flex-col border-r border-outlineVariant">
              {hours.map((_, index) => (
                <div
                  key={index}
                  className="h-12 flex items-center justify-end pr-2 text-xs text-outline"
                >
                  {format(hours[index], 'ha')}
                </div>
              ))}
            </div>

            {/* Event Grid */}
            {days.map((day, dayIndex) => {
              const events = getEventsForDay(day);
              const allDayEvents = events.filter(event => event.allDay);
              const timedEvents = events.filter(event => !event.allDay);
              const positionedTimedEvents = calculateEventPositions(timedEvents, day);

              return (
                <div key={dayIndex} className="relative border-r border-outlineVariant last:border-r-0">
                  {/* All-day events */}
                  <div className="absolute top-0 left-0 w-full bg-surfaceContainerLow p-1 z-10">
                    {allDayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`${event.color} text-onPrimary text-xs rounded-sm px-1 py-0.5 mb-0.5 truncate cursor-pointer`}
                        onClick={() => onEventClick(event)}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>

                  {/* Timed events */}
                  {hours.map((_, hourIndex) => (
                    <div
                      key={hourIndex}
                      className="h-12 border-b border-outlineVariant border-dotted"
                    ></div>
                  ))}
                  {positionedTimedEvents.map(({ event, top, height, left, width }) => (
                    <div
                      key={event.id}
                      className={`${event.color} text-onPrimary rounded-md p-1 text-xs overflow-hidden absolute cursor-pointer cursor-grab`}
                      style={{ top: `${top}px`, height: `${height}px`, left: `${left}%`, width: `${width}%` }}
                      onClick={() => onEventClick(event)}
                    >
                      <p className="font-semibold">{event.title}</p>
                      <p>{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarWeekView;
