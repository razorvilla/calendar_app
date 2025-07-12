import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { useCalendar } from '../context/CalendarContext';
import { getEventsForDate } from '../utils/dateUtils';
import CalendarDay from './CalendarDay';

const MonthView = () => {
    const { currentDate, events, isDarkMode } = useCalendar();

    // Get all days for the current month view (including days from prev/next months)
    const days = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const viewStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

        return eachDayOfInterval({ start: viewStart, end: viewEnd });
    }, [currentDate]);

    

    // Weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="flex-1 overflow-auto">
            {/* Weekday headers */}
            <div className={`grid grid-cols-7 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                {weekdays.map((day, index) => (
                    <div
                        key={`${day}-${index}`}
                        className={`p-2 text-center font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
                {days.map((day, i) => {
                    // Get events for this day
                    const dayEvents = getEventsForDate(events, day);
                    // Check if day is in the current month
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                        <div
                            key={`${day.toISOString()}-${i}`}
                            className={isCurrentMonth ? '' : 'opacity-50'}
                        >
                            <CalendarDay
                                date={day}
                                events={dayEvents}
                                isMonthView={true}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthView;
