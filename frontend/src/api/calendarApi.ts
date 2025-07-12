import axios from 'axios';
import { CalendarEvent, Calendar } from '../types/calendar.types';

const API_BASE_URL = 'http://localhost:4000/graphql'; // GraphQL API Gateway endpoint

interface GraphQLResponse<T> {
  data: T;
  errors?: any[];
}

// Helper function to convert ISO strings to Date objects
const convertEventDates = (event: any): CalendarEvent => ({
  ...event,
  startTime: new Date(event.start),
  endTime: new Date(event.end),
  isAllDay: event.allDay,
});

// --- Event Operations ---

interface GetEventsResponse {
  events: CalendarEvent[];
}

export const getEvents = async (start: Date, end: Date): Promise<CalendarEvent[]> => {
  const query = `
    query GetEvents($start: String!, $end: String!) {
      events(start: $start, end: $end) {
        id
        title
        description
        startTime
        endTime
        isAllDay
        calendar { id }
        color
        isRecurring
        recurrenceRule
        parentId
        # Add other event fields as needed
      }
    }
  `;
  const variables = { start: start.toISOString(), end: end.toISOString() };
  const response = await axios.post<GraphQLResponse<GetEventsResponse>>(API_BASE_URL, { query, variables });
  if (response.data.errors) {
    console.error('GraphQL Errors in getEvents:', response.data.errors);
    throw new Error(response.data.errors[0].message || 'Error fetching events');
  }
  console.log('Raw events data from API:', response.data.data.events);
  const convertedEvents = response.data.data.events.map(convertEventDates);
  console.log('Converted events data:', convertedEvents);
  return convertedEvents;
};

interface CreateEventResponse {
  createEvent: CalendarEvent;
}

export const createEvent = async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
  const mutation = `
    mutation CreateEvent($input: CreateEventInput!) {
      createEvent(input: $input) {
        id
        title
        description
        startTime
        endTime
        isAllDay
        calendar { id }
        color
        isRecurring
        recurrenceRule
        parentId
        # Add other event fields as needed
      }
    }
  `;
  const eventToSend = {
    ...event,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    isAllDay: event.isAllDay,
    isRecurring: event.isRecurring,
    recurrenceRule: event.recurrenceRule,
  };
  const variables = { input: eventToSend };
  console.log('Sending to backend:', variables);
  const response = await axios.post<GraphQLResponse<CreateEventResponse>>(API_BASE_URL, { query: mutation, variables });
  console.log('Received from backend:', response.data);
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Error creating event');
  }
  return convertEventDates(response.data.data.createEvent);
};

interface UpdateEventResponse {
  updateEvent: CalendarEvent;
}

export const updateEvent = async (event: CalendarEvent): Promise<CalendarEvent> => {
  const mutation = `
    mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
      updateEvent(id: $id, input: $input) {
        id
        title
        description
        startTime
        endTime
        isAllDay
        calendar { id }
        color
        isRecurring
        recurrenceRule
        parentId
        # Add other event fields as needed
      }
    }
  `;
  const eventToSend = {
    ...event,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    isAllDay: event.isAllDay,
    isRecurring: event.isRecurring,
    recurrenceRule: event.recurrenceRule,
  };
  const variables = { id: event.id, input: eventToSend };
  const response = await axios.post<GraphQLResponse<UpdateEventResponse>>(API_BASE_URL, { query: mutation, variables });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Error updating event');
  }
  return convertEventDates(response.data.data.updateEvent);
};

interface DeleteEventResponse {
  deleteEvent: boolean;
}

export const deleteEvent = async (id: string): Promise<boolean> => {
  const mutation = `
    mutation DeleteEvent($id: ID!) {
      deleteEvent(id: $id)
    }
  `;
  const variables = { id };
  const response = await axios.post<GraphQLResponse<DeleteEventResponse>>(API_BASE_URL, { query: mutation, variables });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Error deleting event');
  }
  return response.data.data.deleteEvent;
};

// --- Calendar Operations ---

interface GetCalendarsResponse {
  calendars: Calendar[];
}

export const getCalendars = async (): Promise<Calendar[]> => {
  const query = `
    query {
      calendars {
        id
        name
        description
        color
        isDefault
        isPrimary
        userId
        # Add other calendar fields as needed
      }
    }
  `;
  const response = await axios.post<GraphQLResponse<GetCalendarsResponse>>(API_BASE_URL, { query });
  if (response.data.errors) {
    console.error('GraphQL Errors in getCalendars:', response.data.errors);
    throw new Error(response.data.errors[0].message || 'Error fetching calendars');
  }
  console.log('Raw calendars data from API:', response.data.data.calendars);
  return response.data.data.calendars;
};

interface CreateCalendarResponse {
  createCalendar: Calendar;
}

export const createCalendar = async (calendar: Omit<Calendar, 'id'>): Promise<Calendar> => {
  const mutation = `
    mutation CreateCalendar($calendar: CreateCalendarInput!) {
      createCalendar(calendar: $calendar) {
        id
        name
        description
        color
        isDefault
        isPrimary
        userId
        # Add other calendar fields as needed
      }
    }
  `;
  const variables = { calendar };
  const response = await axios.post<GraphQLResponse<CreateCalendarResponse>>(API_BASE_URL, { query: mutation, variables });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Error creating calendar');
  }
  return response.data.data.createCalendar;
};
