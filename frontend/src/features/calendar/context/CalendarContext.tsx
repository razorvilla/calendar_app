import { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import {
    Calendar,
    CalendarEvent,
    CalendarViewType,
    CalendarContextType
} from '../types/calendar.types';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMonths, addWeeks, addYears } from 'date-fns';

// Create the context with default values
const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Default calendars
const defaultCalendars: Calendar[] = [
    { id: 'personal', name: 'Personal', color: '#4F46E5', visible: true, type: 'personal' },
    { id: 'work', name: 'Work', color: '#10B981', visible: true, type: 'work' },
    { id: 'birthdays', name: 'Birthdays', color: '#F59E0B', visible: true, type: 'other' },
    { id: 'holidays', name: 'Holidays', color: '#EF4444', visible: true, type: 'other' },
];

// Sample events (would typically come from an API)
const sampleEvents: CalendarEvent[] = [
    {
        id: '1',
        title: 'Team Meeting',
        start: new Date(2025, 2, 21, 5, 30), // March 21, 2025, 5:30 AM
        end: new Date(2025, 2, 21, 6, 30),   // March 21, 2025, 6:30 AM
        calendarId: 'work',
        location: 'Conference Room A'
    },
    {
        id: '2',
        title: 'Project Review',
        start: new Date(2025, 2, 21, 14, 0), // March 21, 2025, 2:00 PM
        end: new Date(2025, 2, 21, 15, 0),   // March 21, 2025, 3:00 PM
        calendarId: 'work',
        description: 'Quarterly project review with stakeholders'
    },
    {
        id: '3',
        title: 'Client Call',
        start: new Date(2025, 2, 24, 11, 0), // March 24, 2025, 11:00 AM
        end: new Date(2025, 2, 24, 12, 0),   // March 24, 2025, 12:00 PM
        calendarId: 'work',
        location: 'Zoom'
    },
    {
        id: '4',
        title: 'New Event Today',
        start: new Date(2025, 6, 11, 10, 0), // July 11, 2025, 10:00 AM
        end: new Date(2025, 6, 11, 11, 0),   // July 11, 2025, 11:00 AM
        calendarId: 'personal',
        description: 'This is a test event for today.'
    }
];

// Provider component
export const CalendarProvider = ({ children }: { children: ReactNode }) => {
    // State
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
    const [calendars, setCalendars] = useState<Calendar[]>(defaultCalendars);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

    // Navigation actions
    const navigateToday = useCallback(() => setCurrentDate(new Date()), []);

    const navigateNext = useCallback(() => {
        setCurrentDate(prevDate => {
            switch (view) {
                case 'day':
                    return addDays(prevDate, 1);
                case 'week':
                    return addWeeks(prevDate, 1);
                case 'month':
                    return addMonths(prevDate, 1);
                case 'year':
                    return addYears(prevDate, 1);
                default:
                    return addDays(prevDate, 1);
            }
        });
    }, [view]);

    const navigatePrev = useCallback(() => {
        setCurrentDate(prevDate => {
            switch (view) {
                case 'day':
                    return addDays(prevDate, -1);
                case 'week':
                    return addWeeks(prevDate, -1);
                case 'month':
                    return addMonths(prevDate, -1);
                case 'year':
                    return addYears(prevDate, -1);
                default:
                    return addDays(prevDate, -1);
            }
        });
    }, [view]);

    // Event management
    const addEvent = useCallback((newEvent: Omit<CalendarEvent, 'id'>) => {
        const event: CalendarEvent = {
            ...newEvent,
            id: uuidv4(),
        };
        setEvents(prevEvents => [...prevEvents, event]);
    }, []);

    const updateEvent = useCallback((updatedEvent: CalendarEvent) => {
        setEvents(prevEvents =>
            prevEvents.map(event =>
                event.id === updatedEvent.id ? updatedEvent : event
            )
        );
    }, []);

    const deleteEvent = useCallback((id: string) => {
        setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
    }, []);

    // Calendar management
    const toggleCalendarVisibility = useCallback((id: string) => {
        setCalendars(prevCalendars =>
            prevCalendars.map(calendar =>
                calendar.id === id
                    ? { ...calendar, visible: !calendar.visible }
                    : calendar
            )
        );
    }, []);

    // Modal management
    const openEventModal = useCallback((event?: CalendarEvent) => {
        setSelectedEvent(event || null);
        setIsModalOpen(true);
    }, []);

    const closeEventModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    }, []);

    // Theme management
    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => !prev);
    }, []);

    // Context value
    const contextValue: CalendarContextType = {
        currentDate,
        view,
        events,
        calendars,
        selectedEvent,
        isModalOpen,
        isDarkMode,
        setCurrentDate,
        setView,
        navigateToday,
        navigateNext,
        navigatePrev,
        addEvent,
        updateEvent,
        deleteEvent,
        toggleCalendarVisibility,
        openEventModal,
        closeEventModal,
        toggleDarkMode,
    };

    return (
        <CalendarContext.Provider value={contextValue}>
            {children}
        </CalendarContext.Provider>
    );
};

// Custom hook for using the calendar context
export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (context === undefined) {
        throw new Error('useCalendar must be used within a CalendarProvider');
    }
    return context;
};