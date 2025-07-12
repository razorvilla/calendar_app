import { useCallback } from 'react';
import { } from 'date-fns';
import { useCalendar } from '../context/CalendarContext';
import MiniCalendar from './MiniCalendar';

const CalendarSidebar = () => {
    const {
        openEventModal,
        calendars,
        toggleCalendarVisibility,
        isDarkMode
    } = useCalendar();

    const handleCreateClick = useCallback(() => {
        openEventModal();
    }, [openEventModal]);

    return (
        <div className={`w-60 p-4 border-r shadow-sm ${
            isDarkMode
                ? 'bg-gray-800 border-gray-700 text-gray-100'
                : 'bg-white border-gray-200 text-gray-800'
        }`}>
            <button
                onClick={handleCreateClick}
                                className="flex items-center justify-center w-full mb-6 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                aria-label="Create new event"
            >
                <i className="fas fa-plus mr-2"></i>
                <span className="font-medium">Create</span>
            </button>

            {/* Mini Calendar */}
            <div className="mb-6">
                <MiniCalendar />
            </div>

            {/* My Calendars Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        My Calendars
                    </h3>
                    <button className={`rounded-full p-1 bg-transparent ${
                        isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}>
                        <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                </div>
                <ul className="space-y-3">
                    {calendars
                        .filter(calendar => ['personal', 'work'].includes(calendar.type))
                        .map(calendar => (
                            <li key={calendar.id} className="flex items-center group">
                                <input
                                    type="checkbox"
                                    className={`mr-2 h-4 w-4 rounded ${
                                        isDarkMode
                                            ? 'bg-gray-700 border-gray-600 text-primary-600'
                                            : 'bg-white text-primary-600 border-gray-300'
                                    }`}
                                    checked={calendar.visible}
                                    onChange={() => toggleCalendarVisibility(calendar.id)}
                                    id={`calendar-${calendar.id}`}
                                    aria-label={`Toggle ${calendar.name} calendar visibility`}
                                />
                                <span
                                    className="color-dot mr-2 transition-transform group-hover:scale-125"
                                    style={{ backgroundColor: calendar.color }}
                                ></span>
                                <label
                                    htmlFor={`calendar-${calendar.id}`}
                                    className="text-sm cursor-pointer hover:text-primary-600 transition-colors"
                                >
                                    {calendar.name}
                                </label>
                            </li>
                        ))}
                </ul>
            </div>

            {/* Other Calendars Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Other Calendars
                    </h3>
                    <button className={`rounded-full p-1 bg-transparent ${
                        isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}>
                        <i className="fas fa-chevron-down text-xs"></i>
                    </button>
                </div>
                <ul className="space-y-3">
                    {calendars
                        .filter(calendar => calendar.type === 'other')
                        .map(calendar => (
                            <li key={calendar.id} className="flex items-center group">
                                <input
                                    type="checkbox"
                                    className={`mr-2 h-4 w-4 rounded ${
                                        isDarkMode
                                            ? 'bg-gray-700 border-gray-600 text-primary-600'
                                            : 'bg-white text-primary-600 border-gray-300'
                                    }`}
                                    checked={calendar.visible}
                                    onChange={() => toggleCalendarVisibility(calendar.id)}
                                    id={`calendar-${calendar.id}`}
                                    aria-label={`Toggle ${calendar.name} calendar visibility`}
                                />
                                <span
                                    className="color-dot mr-2 transition-transform group-hover:scale-125"
                                    style={{ backgroundColor: calendar.color }}
                                ></span>
                                <label
                                    htmlFor={`calendar-${calendar.id}`}
                                    className="text-sm cursor-pointer hover:text-primary-600 transition-colors"
                                >
                                    {calendar.name}
                                </label>
                            </li>
                        ))}
                </ul>
            </div>
        </div>
    );
};

export default CalendarSidebar;