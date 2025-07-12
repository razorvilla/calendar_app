import { memo } from 'react';
import { formatTime } from '../utils/dateUtils';
import { CalendarEvent as CalendarEventType } from '../types/calendar.types';
import { useCalendar } from '../context/CalendarContext';

interface CalendarEventProps {
    event: CalendarEventType;
    view: 'day' | 'week' | 'month';
    className?: string;
}

const CalendarEvent = memo(({ event, view, className = '' }: CalendarEventProps) => {
    const { openEventModal, calendars, isDarkMode } = useCalendar();

    // Find the calendar this event belongs to
    const calendar = calendars.find(cal => cal.id === event.calendarId);

    // Only show events from visible calendars
    if (calendar && !calendar.visible) {
        return null;
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openEventModal(event);
    };

    // Calculate styles based on the calendar color
    const eventColor = calendar?.color || '#f97316'; // Default to orange if no color
    const lightColor = `${eventColor}15`; // Add 15% opacity for background

    // Different layouts for different views
    const renderEvent = () => {
        switch (view) {
            case 'month':
                return (
                    <div
                        onClick={handleClick}
                        className={`px-1.5 py-0.5 truncate text-xs rounded cursor-pointer transition-colors ${
                            isDarkMode ? 'hover:bg-opacity-30' : 'hover:bg-opacity-30'
                        } ${className}`}
                        style={{
                            backgroundColor: lightColor,
                            borderLeft: `2.5px solid ${eventColor}`,
                            color: isDarkMode ? '#f1f5f9' : '#334155'
                        }}
                    >
                        <div className="flex items-center space-x-1">
                            <span
                                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: eventColor }}
                            ></span>
                            <span className="truncate font-medium">{event.title}</span>
                        </div>
                    </div>
                );

            case 'day':
            case 'week':
            default:
                return (
                    <div
                        onClick={handleClick}
                        className={`p-2 rounded shadow-sm cursor-pointer transition-all hover:shadow-md ${className}`}
                        style={{
                            backgroundColor: lightColor,
                            borderLeft: `3px solid ${eventColor}`
                        }}
                    >
                        <div className="font-medium text-xs mb-0.5">{event.title}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                        {event.location && (
                            <div className={`text-xs mt-1 flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <i className="fas fa-map-marker-alt mr-1 text-xs" style={{ color: eventColor }}></i>
                                <span className="truncate">{event.location}</span>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return renderEvent();
});

CalendarEvent.displayName = 'CalendarEvent';

export default CalendarEvent;