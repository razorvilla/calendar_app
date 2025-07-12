import { useCallback } from 'react';

import { useCalendar } from '../context/CalendarContext';
import { CalendarViewType } from '../types/calendar.types';
import { formatHeaderDate } from '../utils/dateUtils';

type ViewOption = {
    label: string;
    value: CalendarViewType;
};

const viewOptions: ViewOption[] = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
    { label: 'Agenda', value: 'agenda' },
];

const CalendarHeader = () => {
    const {
        currentDate,
        view,
        setView,
        navigateToday,
        navigateNext,
        navigatePrev,
        isDarkMode,
        toggleDarkMode
    } = useCalendar();

    const handleViewChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setView(e.target.value as CalendarViewType);
    }, [setView]);

    return (
        <header className={`border-b flex items-center justify-between p-4 shadow-sm z-10 ${
            isDarkMode
                ? 'bg-gray-800 border-gray-700 text-gray-100'
                : 'bg-white border-gray-200'
        }`}>
            <div className="flex items-center space-x-4">
                <button
                    className={`p-2 rounded-full transition-colors ${
                        isDarkMode
                            ? 'bg-transparent hover:bg-gray-700 text-gray-300'
                            : 'bg-transparent hover:bg-gray-100 text-gray-600'
                    }`}
                    aria-label="Toggle sidebar"
                >
                    <i className="fas fa-bars"></i>
                </button>
                <div className="flex items-center space-x-2">
                    <span className={`text-xl font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                        Pristine Calendar
                    </span>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                <button
                    onClick={navigateToday}
                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors shadow-sm font-medium"
                >
                    Today
                </button>
                <div className="flex shadow-sm">
                    <button
                        onClick={navigatePrev}
                        className={`p-2 border rounded-l-md transition-colors ${
                            isDarkMode
                                ? 'bg-transparent border-gray-600 hover:bg-gray-700 text-gray-300'
                                : 'bg-transparent border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                        aria-label="Previous"
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <button
                        onClick={navigateNext}
                        className={`p-2 border-t border-b border-r rounded-r-md transition-colors ${
                            isDarkMode
                                ? 'bg-transparent border-gray-600 hover:bg-gray-700 text-gray-300'
                                : 'bg-transparent border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                        aria-label="Next"
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
                <h2 className={`text-lg font-medium p-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                    {formatHeaderDate(currentDate, view)}
                </h2>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative">
                    <select
                        value={view}
                        onChange={handleViewChange}
                        className={`appearance-none border rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                            isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-200 text-gray-800'
                        }`}
                        aria-label="Select view"
                    >
                        {viewOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                        <i className={`fas fa-chevron-down text-xs ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}></i>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        className={`p-2 rounded-full transition-colors ${
                            isDarkMode
                                ? 'bg-transparent hover:bg-gray-700 text-gray-300'
                                : 'bg-transparent hover:bg-gray-100 text-gray-600'
                        }`}
                        aria-label="Search"
                    >
                        <i className="fas fa-search"></i>
                    </button>
                    <button
                        className={`p-2 rounded-full transition-colors ${
                            isDarkMode
                                ? 'bg-transparent hover:bg-gray-700 text-gray-300'
                                : 'bg-transparent hover:bg-gray-100 text-gray-600'
                        }`}
                        aria-label="Settings"
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                    <div className="flex items-center space-x-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Dark Mode
                        </span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={isDarkMode}
                                onChange={toggleDarkMode}
                                aria-label="Toggle dark mode"
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    <button
                        className={`p-2 rounded-full transition-colors ${
                            isDarkMode
                                ? 'bg-transparent hover:bg-gray-700 text-gray-300'
                                : 'bg-transparent hover:bg-gray-100 text-gray-600'
                        }`}
                        aria-label="User profile"
                    >
                        <i className="fas fa-user-circle text-xl"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default CalendarHeader;