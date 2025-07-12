import { useState, useCallback } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    isToday,
    eachDayOfInterval
} from 'date-fns';
import { useCalendar } from '../context/CalendarContext';

const MiniCalendar = () => {
    const { currentDate, setCurrentDate, isDarkMode } = useCalendar();
    const [viewDate, setViewDate] = useState(currentDate);

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const prevMonth = useCallback(() => {
        setViewDate(prevDate => subMonths(prevDate, 1));
    }, []);

    const nextMonth = useCallback(() => {
        setViewDate(prevDate => addMonths(prevDate, 1));
    }, []);

    const handleDateClick = useCallback((date: Date) => {
        setCurrentDate(date);
    }, [setCurrentDate]);

    // Get all days to display in the calendar
    const getDaysInView = () => {
        const start = startOfWeek(startOfMonth(viewDate));
        const end = endOfWeek(endOfMonth(viewDate));
        return eachDayOfInterval({ start, end });
    };

    const days = getDaysInView();

    return (
        <div className="mini-calendar">
            {/* Mini calendar header */}
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={prevMonth}
                    className={`p-1.5 rounded-full transition-colors bg-transparent ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                    aria-label="Previous month"
                >
                    <i className="fas fa-chevron-left text-xs"></i>
                </button>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {format(viewDate, 'MMMM yyyy')}
                </span>
                <button
                    onClick={nextMonth}
                    className={`p-1.5 rounded-full transition-colors bg-transparent ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                    aria-label="Next month"
                >
                    <i className="fas fa-chevron-right text-xs"></i>
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
                {weekdays.map(day => (
                    <div
                        key={day}
                        className={`text-xs font-medium text-center ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1 text-sm">
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, viewDate);
                    const isSelected = isSameDay(day, currentDate);
                    const isTodayDate = isToday(day);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    // Use explicit Tailwind classes instead of custom classes
                    let dayClasses = 'flex items-center justify-center w-7 h-7 rounded-full transition-colors bg-transparent';

                    if (!isCurrentMonth) {
                        dayClasses += isDarkMode ? ' text-gray-600' : ' text-gray-400';
                    } else if (isSelected) {
                        dayClasses += ' bg-primary-600 text-white';
                    } else if (isTodayDate) {
                        dayClasses += isDarkMode
                            ? ' bg-gray-700 text-white'
                            : ' bg-primary-100 text-primary-800';
                    } else {
                        dayClasses += isDarkMode
                            ? ' text-gray-300 hover:bg-gray-700'
                            : ' text-gray-800 hover:bg-gray-100';
                    }

                    if (isWeekend && isCurrentMonth && !isSelected && !isTodayDate) {
                        dayClasses += isDarkMode ? ' text-gray-400' : ' text-gray-600';
                    }

                    return (
                        <button
                            key={day.toString()}
                            className={dayClasses}
                            onClick={() => handleDateClick(day)}
                            aria-label={format(day, 'MMMM d, yyyy')}
                            aria-selected={isSelected}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MiniCalendar;