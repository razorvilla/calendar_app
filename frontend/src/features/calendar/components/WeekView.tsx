import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { useCalendar } from '../context/CalendarContext';
import { getWeekDays, getEventsForDate } from '../utils/dateUtils';
import CalendarDay from './CalendarDay';
import TimeColumn from './TimeColumn';

const WeekView = () => {
    const { currentDate, events, isDarkMode } = useCalendar();

    // Get the days for the current week
    const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

    // Current time indicator position
    const currentTimePosition = useMemo(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        // Convert to pixels based on 48px per hour
        return (hours + minutes / 60) * 48;
    }, []);

    // Check if current day is in view
    const hasTodayInView = useMemo(() => {
        return weekDays.some(day => isToday(day));
    }, [weekDays]);

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Week header */}
            <div className={`grid grid-cols-7 border-b sticky top-0 z-10 ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`} style={{ marginLeft: '64px' }}>
                {weekDays.map((day, index) => {
                    const dayNumber = day.getDate();
                    const isCurrentDay = isToday(day);
                    const isWeekend = index === 0 || index === 6;

                    return (
                        <div
                            key={index}
                            className={`day-header border-r p-2 ${
                                isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            } ${isCurrentDay ? 'today' : ''} ${isWeekend ? (isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50') : ''}`}
                        >
                            <div className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {format(day, 'EEE')}
                            </div>
                            <div className={`text-center ${
                                isCurrentDay
                                    ? 'bg-primary-600 text-white rounded-full w-8 h-8 leading-8 mx-auto shadow-sm'
                                    : isDarkMode ? 'text-gray-300' : 'text-gray-800'
                            }`}>
                                {dayNumber}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Week grid with time slots */}
            <div className="relative">
                {/* Time column */}
                <TimeColumn startHour={5} endHour={21} />

                {/* Calendar content */}
                <div className="ml-16 grid grid-cols-7 h-full">
                    {weekDays.map((day, dayIndex) => {
                        const dayEvents = getEventsForDate(events, day);
                        const isCurrentDay = isToday(day);
                        const isWeekend = dayIndex === 0 || dayIndex === 6;

                        return (
                            <div key={dayIndex} className="relative">
                                {/* Hour slots */}
                                {Array.from({ length: 17 }).map((_, hourIndex) => (
                                    <div
                                        key={hourIndex}
                                        className={`h-12 border-b ${
                                            isDarkMode ? 'border-gray-700' : 'border-gray-100'
                                        } ${isCurrentDay ? (isDarkMode ? 'bg-gray-800/30' : 'bg-primary-50/30') : ''}
                                           ${isWeekend ? (isDarkMode ? 'bg-gray-900/20' : 'bg-gray-50/60') : ''}`}
                                    ></div>
                                ))}

                                {/* Events */}
                                <div className="absolute inset-0">
                                    <CalendarDay date={day} events={dayEvents} isWeekView={true} />
                                </div>
                            </div>
                        );
                    })}

                    {/* Current time indicator */}
                    {hasTodayInView && (
                        <div className="absolute left-0 right-0" style={{ top: `${currentTimePosition}px` }}>
                            <div className="relative h-0 border-t-2 border-primary-500 z-10">
                                <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-primary-500 shadow-sm animate-pulse"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeekView;