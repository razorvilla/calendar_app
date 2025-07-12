import { useMemo } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { getEventsForDate } from '../utils/dateUtils';
import TimeColumn from './TimeColumn';
import CalendarDay from './CalendarDay';

const DayView = () => {
    const { currentDate, events, isDarkMode } = useCalendar();

    const dayEvents = useMemo(() => getEventsForDate(events, currentDate), [events, currentDate]);

    // Current time indicator position
    const currentTimePosition = useMemo(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        // Convert to pixels based on 48px per hour (assuming TimeColumn uses 48px height per hour)
        return (hours + minutes / 60) * 48;
    }, []);

    return (
        <div className="flex-1 overflow-y-auto relative">
            <div className="flex h-full">
                {/* Time Column */}
                <TimeColumn startHour={5} endHour={21} />

                {/* Day Content */}
                <div className="flex-1 relative border-l border-gray-200 dark:border-gray-700">
                    {/* Hour slots */}
                    {Array.from({ length: 17 }).map((_, hourIndex) => (
                        <div
                            key={hourIndex}
                            className={`h-12 border-b ${
                                isDarkMode ? 'border-gray-700' : 'border-gray-100'
                            }`}
                        ></div>
                    ))}

                    {/* Events */}
                    <div className="absolute inset-0">
                        <CalendarDay date={currentDate} events={dayEvents} isDayView={true} />
                    </div>

                    {/* Current time indicator */}
                    <div className="absolute left-0 right-0" style={{ top: `${currentTimePosition}px` }}>
                        <div className="relative h-0 border-t-2 border-primary-500 z-10">
                            <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-primary-500 shadow-sm animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayView;