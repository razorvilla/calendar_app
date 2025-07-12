import { memo } from 'react';
import { isToday } from 'date-fns';
import { useCalendar } from '../context/CalendarContext';
import { CalendarEvent as CalendarEventType } from '../types/calendar.types';
import CalendarEvent from './CalendarEvent';

interface CalendarDayProps {
    date: Date;
    events: CalendarEventType[];
    isWeekView?: boolean;
    isMonthView?: boolean;
    isDayView?: boolean;
}

const CalendarDay = memo(({ date, events, isWeekView = false, isMonthView = false, isDayView = false }: CalendarDayProps) => {
    console.log(`CalendarDay: Rendering for date: ${date.toDateString()}, Events:`, events);
    const { openEventModal, isDarkMode } = useCalendar();

    const isCurrentDay = isToday(date);

    // Handle click on the day to create a new event
    const handleDayClick = () => {
        // Create event at current time on the clicked day
        const now = new Date();
        const eventStart = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            now.getHours(),
            now.getMinutes()
        );

        // End time is 1 hour later
        const eventEnd = new Date(eventStart);
        eventEnd.setHours(eventEnd.getHours() + 1);

        openEventModal({
            id: '',
            title: '',
            start: eventStart,
            end: eventEnd,
            calendarId: 'personal'
        });
    };

    // Render different layouts for week view and month view
    if (isWeekView) {
        return (
            <div
                className={`border-r h-full ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } ${isCurrentDay ? (isDarkMode ? 'bg-gray-800' : 'bg-blue-50') : ''}`}
                onClick={handleDayClick}
            >
                {events.map(event => (
                    <CalendarEvent
                        key={event.id}
                        event={event}
                        view="week"
                        className="mx-1 my-1"
                    />
                ))}
            </div>
        );
    }

    if (isMonthView) {
        const dayNumber = date.getDate();
        const maxEventsToShow = 3;
        const hasMoreEvents = events.length > maxEventsToShow;

        return (
            <div
                className={`min-h-[100px] p-1 border ${
                    isDarkMode
                        ? 'border-gray-700 hover:bg-gray-800'
                        : 'border-gray-200 hover:bg-gray-50'
                } ${isCurrentDay ? (isDarkMode ? 'bg-gray-800' : 'bg-blue-50') : ''}`}
                onClick={handleDayClick}
            >
                <div className={`text-right mb-1 ${isCurrentDay ? 'font-bold' : ''}`}>
          <span className={`inline-block w-6 h-6 rounded-full text-center leading-6 ${
              isCurrentDay
                  ? 'bg-primary-600 text-white'
                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {dayNumber}
          </span>
                </div>

                <div className="space-y-1">
                    {events.slice(0, maxEventsToShow).map(event => (
                        <CalendarEvent
                            key={event.id}
                            event={event}
                            view="month"
                        />
                    ))}

                    {hasMoreEvents && (
                        <div className={`text-xs px-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            +{events.length - maxEventsToShow} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default day view
    return (
        <div
            className={`h-full ${isCurrentDay ? (isDarkMode ? 'bg-gray-800' : 'bg-blue-50') : ''} ${isDayView ? 'day-view-specific-class' : ''}`}
            onClick={handleDayClick}
        >
            {events.map(event => (
                <CalendarEvent
                    key={event.id}
                    event={event}
                    view="day"
                    className="mx-2 my-1"
                />
            ))}
        </div>
    );
});

CalendarDay.displayName = 'CalendarDay';

export default CalendarDay;