import React, { createContext, useReducer, useContext, ReactNode, Dispatch, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarEvent, Calendar } from '../types/calendar.types';
import { getEvents, createEvent, updateEvent, deleteEvent, getCalendars } from '../api/calendarApi';
import { startOfMonth, endOfMonth } from 'date-fns';

// Define the shape of the state
interface CalendarState {
  currentDate: Date;
  selectedEvent: CalendarEvent | null;
  isEventFormModalOpen: boolean;
  eventToEdit: CalendarEvent | null;
  allEvents: CalendarEvent[];
  activeCalendarIds: string[];
  isUserProfileModalOpen: boolean;
  calendars: Calendar[]; // Now part of the state, fetched from API
  isLoadingEvents: boolean;
  isErrorEvents: boolean;
  isLoadingCalendars: boolean;
  isErrorCalendars: boolean;
}

// Define the shape of the actions
type CalendarAction =
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'SET_SELECTED_EVENT'; payload: CalendarEvent | null }
  | { type: 'OPEN_EVENT_FORM_MODAL'; payload?: CalendarEvent | null }
  | { type: 'CLOSE_EVENT_FORM_MODAL' }
  | { type: 'ADD_EVENT'; payload: CalendarEvent } // Payload will be the event to add
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent } // Payload will be the updated event
  | { type: 'DELETE_EVENT'; payload: string } // Payload will be the event ID
  | { type: 'TOGGLE_CALENDAR_VISIBILITY'; payload: string }
  | { type: 'OPEN_USER_PROFILE_MODAL' }
  | { type: 'CLOSE_USER_PROFILE_MODAL' }
  | { type: 'SET_ALL_EVENTS'; payload: CalendarEvent[] } // To set events after fetching
  | { type: 'SET_CALENDARS'; payload: Calendar[] } // To set calendars after fetching
  | { type: 'SET_LOADING_EVENTS'; payload: boolean }
  | { type: 'SET_ERROR_EVENTS'; payload: boolean }
  | { type: 'SET_LOADING_CALENDARS'; payload: boolean }
  | { type: 'SET_ERROR_CALENDARS'; payload: boolean }
  | { type: 'SET_ACTIVE_CALENDAR_IDS'; payload: string[] };

// Initial state
const initialState: CalendarState = {
  currentDate: new Date(),
  selectedEvent: null,
  isEventFormModalOpen: false,
  eventToEdit: null,
  allEvents: [], // Initially empty, will be populated by React Query
  activeCalendarIds: [], // Initially empty, will be populated after calendars are fetched
  isUserProfileModalOpen: false,
  calendars: [], // Initially empty, will be populated by React Query
  isLoadingEvents: false,
  isErrorEvents: false,
  isLoadingCalendars: false,
  isErrorCalendars: false,
};

// Reducer function
const calendarReducer = (state: CalendarState, action: CalendarAction): CalendarState => {
  switch (action.type) {
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload };
    case 'SET_SELECTED_EVENT':
      return { ...state, selectedEvent: action.payload };
    case 'OPEN_EVENT_FORM_MODAL':
      return { ...state, isEventFormModalOpen: true, eventToEdit: action.payload || null };
    case 'CLOSE_EVENT_FORM_MODAL':
      return { ...state, isEventFormModalOpen: false, eventToEdit: null };
    case 'ADD_EVENT': // This action will trigger a mutation, state update will happen via query invalidation
      return state;
    case 'UPDATE_EVENT': // This action will trigger a mutation, state update will happen via query invalidation
      return state;
    case 'DELETE_EVENT': // This action will trigger a mutation, state update will happen via query invalidation
      return { ...state, selectedEvent: null }; // Close detail modal if deleted event was selected
    case 'TOGGLE_CALENDAR_VISIBILITY':
      return {
        ...state,
        activeCalendarIds: state.activeCalendarIds.includes(action.payload)
          ? state.activeCalendarIds.filter(id => id !== action.payload)
          : [...state.activeCalendarIds, action.payload],
      };
    case 'OPEN_USER_PROFILE_MODAL':
      return { ...state, isUserProfileModalOpen: true };
    case 'CLOSE_USER_PROFILE_MODAL':
      return { ...state, isUserProfileModalOpen: false };
    case 'SET_ALL_EVENTS':
      return { ...state, allEvents: action.payload };
    case 'SET_CALENDARS':
      return { ...state, calendars: action.payload };
    case 'SET_LOADING_EVENTS':
      return { ...state, isLoadingEvents: action.payload };
    case 'SET_ERROR_EVENTS':
      return { ...state, isErrorEvents: action.payload };
    case 'SET_LOADING_CALENDARS':
      return { ...state, isLoadingCalendars: action.payload };
    case 'SET_ERROR_CALENDARS':
      return { ...state, isErrorCalendars: action.payload };
    case 'SET_ACTIVE_CALENDAR_IDS':
      return { ...state, activeCalendarIds: action.payload };
    default:
      return state;
  }
};

// Create the context
interface CalendarContextType extends CalendarState {
  dispatch: Dispatch<CalendarAction>;
}

export const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Create a provider component
interface CalendarProviderProps {
  children: ReactNode;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(calendarReducer, initialState);
  const queryClient = useQueryClient();

  // Fetch events using React Query
  const { data: eventsData, isLoading: isLoadingEvents, isError: isErrorEvents } = useQuery<CalendarEvent[], Error>({
    queryKey: ['events', state.currentDate.getMonth(), state.currentDate.getFullYear()],
    queryFn: () => getEvents(startOfMonth(state.currentDate), endOfMonth(state.currentDate)),
  });
  console.log('React Query Events Data:', eventsData, 'Loading:', isLoadingEvents, 'Error:', isErrorEvents);

  // Fetch calendars using React Query
  const { data: calendarsData, isLoading: isLoadingCalendars, isError: isErrorCalendars } = useQuery<Calendar[], Error>({
    queryKey: ['calendars'],
    queryFn: getCalendars,
  });
  console.log('React Query Calendars Data:', calendarsData, 'Loading:', isLoadingCalendars, 'Error:', isErrorCalendars);

  // Update state when events data changes
  useEffect(() => {
    if (eventsData) {
      console.log('Dispatching SET_ALL_EVENTS with payload:', eventsData);
      dispatch({ type: 'SET_ALL_EVENTS', payload: eventsData });
    }
    console.log('Dispatching SET_LOADING_EVENTS:', isLoadingEvents);
    dispatch({ type: 'SET_LOADING_EVENTS', payload: isLoadingEvents });
    console.log('Dispatching SET_ERROR_EVENTS:', isErrorEvents);
    dispatch({ type: 'SET_ERROR_EVENTS', payload: isErrorEvents });
  }, [eventsData, isLoadingEvents, isErrorEvents]);

  // Update state when calendars data changes
  useEffect(() => {
    if (calendarsData) {
      console.log('Dispatching SET_CALENDARS with payload:', calendarsData);
      dispatch({ type: 'SET_CALENDARS', payload: calendarsData });
      // Set active calendars to all by default if not already set
      if (state.activeCalendarIds.length === 0) {
        console.log('Dispatching SET_ACTIVE_CALENDAR_IDS with payload:', calendarsData.map(cal => cal.id));
        dispatch({ type: 'SET_ACTIVE_CALENDAR_IDS', payload: calendarsData.map(cal => cal.id) });
      }
    }
    console.log('Dispatching SET_LOADING_CALENDARS:', isLoadingCalendars);
    dispatch({ type: 'SET_LOADING_CALENDARS', payload: isLoadingCalendars });
    console.log('Dispatching SET_ERROR_CALENDARS:', isErrorCalendars);
    dispatch({ type: 'SET_ERROR_CALENDARS', payload: isErrorCalendars });
  }, [calendarsData, isLoadingCalendars, isErrorCalendars]);


  // Mutations for events
  const addEventMutation = useMutation<CalendarEvent, Error, Omit<CalendarEvent, 'id'>>({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const updateEventMutation = useMutation<CalendarEvent, Error, CalendarEvent>({
    mutationFn: updateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteEventMutation = useMutation<boolean, Error, string>({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // Override dispatch to handle mutations
  const contextValue = {
    ...state,
    dispatch: (action: CalendarAction) => {
      switch (action.type) {
        case 'ADD_EVENT':
          addEventMutation.mutate(action.payload);
          break;
        case 'UPDATE_EVENT':
          updateEventMutation.mutate(action.payload);
          break;
        case 'DELETE_EVENT':
          deleteEventMutation.mutate(action.payload);
          break;
        default:
          dispatch(action);
      }
    },
  };
  console.log('CalendarContext: contextValue before provider', contextValue);
  console.log('CalendarContext current state:', contextValue);

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
};

// Custom hook for consuming the context
export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

