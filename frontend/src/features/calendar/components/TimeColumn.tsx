import { memo } from 'react';
import { getHourLabels } from '../utils/dateUtils';
import { useCalendar } from '../context/CalendarContext';

interface TimeColumnProps {
    startHour?: number;
    endHour?: number;
}

// Memoized component to prevent unnecessary re-renders
const TimeColumn = memo(({ startHour = 5, endHour = 21 }: TimeColumnProps) => {
    const { isDarkMode } = useCalendar();
    const hourLabels = getHourLabels(startHour, endHour);

    return (
        <div className={`absolute top-0 left-0 w-16 h-full border-r flex flex-col ${
            isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-500'
        }`}>
            {/* Empty cell for header alignment */}
            <div className="h-12"></div>

            {/* Hour labels */}
            {hourLabels.map((label, index) => (
                <div
                    key={`hour-${index}`}
                    className="h-12 text-right pr-2 pt-2"
                >
                    <span className="text-xs font-medium">{label}</span>
                </div>
            ))}
        </div>
    );
});

TimeColumn.displayName = 'TimeColumn';

export default TimeColumn;