import React, { useState } from 'react';
import CustomSelect from './CustomSelect';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  handleTodayClick: () => void;
  onOpenUserProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen, currentDate, setCurrentDate, handleTodayClick, onOpenUserProfile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const handleViewChange = (value: string) => {
    navigate(value);
  };

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
  };

  const isCalendarView = !location.pathname.startsWith('/kanban');

  const getDisplayDate = () => {
    const path = location.pathname;
    switch (path) {
      case '/day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case '/week':
        return `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`;
      case '/4day':
        return `${format(currentDate, 'MMM d')} - ${format(addDays(currentDate, 3), 'MMM d, yyyy')}`;
      case '/month':
      case '/':
        return format(currentDate, 'MMMM yyyy');
      case '/year':
        return format(currentDate, 'yyyy');
      case '/schedule':
        return `${format(currentDate, 'MMM d, yyyy')} - ${format(addDays(currentDate, 6), 'MMM d, yyyy')}`;
      default:
        return '';
    }
  };

  const handleNavClick = (direction: 'prev' | 'next') => {
    const path = location.pathname;
    let newDate = currentDate;

    switch (path) {
      case '/day':
        newDate = direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1);
        break;
      case '/week':
        newDate = direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
        break;
      case '/4day':
        newDate = direction === 'prev' ? subDays(currentDate, 4) : addDays(currentDate, 4);
        break;
      case '/month':
      case '/':
        newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
        break;
      case '/year':
        newDate = direction === 'prev' ? subYears(currentDate, 1) : addYears(currentDate, 1);
        break;
      case '/schedule':
        newDate = direction === 'prev' ? subDays(currentDate, 7) : addDays(currentDate, 7);
        break;
      default:
        break;
    }
    setCurrentDate(newDate);
  };

  return (
    <header className="bg-surfaceContainerHighest shadow-sm px-4 h-16 flex items-center justify-between z-20 overflow-visible">
      <div className="flex items-center space-x-4">
        {/* Density Medium Icon / Sidebar Toggle */}
        <button
          className="p-2 rounded-md text-onSurfaceVariant hover:bg-surfaceVariant"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>

        {/* App Title */}
        <h1 className="text-2xl font-semibold text-onSurface">Calendar App</h1>

        {/* Today Button */}
        {isCalendarView && (
          <button
            className="px-3 py-1 rounded-md text-onSurfaceVariant hover:bg-surfaceVariant"
            onClick={handleTodayClick}
            aria-label="Go to today"
          >
            Today
          </button>
        )}

        {/* Prev/Next Buttons and Date Display */}
        {isCalendarView && (
          <div className="flex items-center space-x-2 ml-4">
            <button
              className="p-1 rounded-full text-onSurfaceVariant hover:bg-surfaceVariant"
              onClick={() => handleNavClick('prev')}
              aria-label="Previous period"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <span className="text-onSurface font-medium">
              {getDisplayDate()}
            </span>
            <button
              className="p-1 rounded-full text-onSurfaceVariant hover:bg-surfaceVariant"
              onClick={() => handleNavClick('next')}
              aria-label="Next period"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Search Bar */}
        {isSearchExpanded ? (
          <input
            type="text"
            placeholder="Search events..."
            className="w-48 px-3 py-2 rounded-md border border-outlineVariant bg-surface text-onSurface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 ease-in-out"
            onBlur={() => setIsSearchExpanded(false)}
            autoFocus
            aria-label="Search events"
          />
        ) : (
          <button
            className="p-2 rounded-full text-onSurfaceVariant hover:bg-surfaceVariant"
            onClick={toggleSearch}
            aria-label="Expand search bar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </button>
        )}

        {/* View Selector (Calendar/Kanban) */}
        <div className="flex space-x-2">
          <Link
            to="/"
            className={`px-3 py-1 rounded-md ${isCalendarView ? 'bg-primary text-onPrimary' : 'text-onSurfaceVariant hover:bg-surfaceVariant'}`}
            aria-label="Switch to Calendar view"
          >
            Calendar
          </Link>
          <Link
            to="/kanban"
            className={`px-3 py-1 rounded-md ${!isCalendarView ? 'bg-primary text-onPrimary' : 'text-onSurfaceVariant hover:bg-surfaceVariant'}`}
            aria-label="Switch to Kanban board view"
          >
            Kanban
          </Link>
        </div>

        {/* Calendar View Dropdown */}
        {isCalendarView && (
          <CustomSelect
            options={[
              { value: '/', label: 'Month' },
              { value: '/week', label: 'Week' },
              { value: '/day', label: 'Day' },
              { value: '/4day', label: '4 Days' },
              { value: '/year', label: 'Year' },
              { value: '/schedule', label: 'Schedule' },
            ]}
            value={location.pathname}
            onChange={handleViewChange}
            ariaLabel="Select calendar view"
          />
        )}

        {/* User Profile Icon */}
        <button
          className="p-2 rounded-full text-onSurfaceVariant hover:bg-surfaceVariant"
          onClick={onOpenUserProfile}
          aria-label="User profile and settings"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            ></path>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;