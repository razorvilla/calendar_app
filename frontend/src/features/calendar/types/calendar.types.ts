// Type definitions for the calendar feature

export type CalendarViewType = 'day' | 'week' | 'month' | 'year' | 'agenda';

export type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    location?: string;
    description?: string;
    calendarId: string;
    color?: string;
    // For recurring events
    recurrence?: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        interval: number;
        endDate?: Date;
        count?: number;
    };
};

export type Calendar = {
    id: string;
    name: string;
    color: string;
    visible: boolean;
    type: 'personal' | 'work' | 'other';
};

export type CalendarContextType = {
    // State
    currentDate: Date;
    view: CalendarViewType;
    events: CalendarEvent[];
    calendars: Calendar[];
    selectedEvent: CalendarEvent | null;
    isModalOpen: boolean;
    isDarkMode: boolean;

    // Actions
    setCurrentDate: (date: Date) => void;
    setView: (view: CalendarViewType) => void;
    navigateToday: () => void;
    navigateNext: () => void;
    navigatePrev: () => void;
    addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
    updateEvent: (event: CalendarEvent) => void;
    deleteEvent: (id: string) => void;
    toggleCalendarVisibility: (id: string) => void;
    openEventModal: (event?: CalendarEvent) => void;
    closeEventModal: () => void;
    toggleDarkMode: () => void;
};

export type TimeSlot = {
    hour: number;
    minute: number;
};

export type DayWithEvents = {
    date: Date;
    events: CalendarEvent[];
    isCurrentMonth: boolean;
    isToday: boolean;
};