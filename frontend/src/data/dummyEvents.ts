export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  color?: string;
  calendarId?: string; // To associate with a specific calendar
}

export const dummyEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    start: new Date(2025, 6, 8, 9, 0), // July 8, 2025, 9:00 AM
    end: new Date(2025, 6, 8, 9, 30), // July 8, 2025, 9:30 AM
    color: 'bg-primary',
    calendarId: 'my-calendar',
  },
  {
    id: '2',
    title: 'Project Sync',
    start: new Date(2025, 6, 8, 14, 0), // July 8, 2025, 2:00 PM
    end: new Date(2025, 6, 8, 15, 0), // July 8, 2025, 3:00 PM
    color: 'bg-secondary',
    calendarId: 'work-calendar',
  },
  {
    id: '3',
    title: 'Client Demo',
    start: new Date(2025, 6, 9, 10, 0), // July 9, 2025, 10:00 AM
    end: new Date(2025, 6, 9, 11, 0), // July 9, 2025, 11:00 AM
    color: 'bg-tertiary',
    calendarId: 'my-calendar',
  },
  {
    id: '4',
    title: 'All-Day Workshop',
    start: new Date(2025, 6, 10, 0, 0), // July 10, 2025, all day
    end: new Date(2025, 6, 10, 23, 59), // July 10, 2025, all day
    isAllDay: true,
    color: 'bg-error',
    calendarId: 'work-calendar',
  },
  {
    id: '5',
    title: 'Team Lunch',
    start: new Date(2025, 6, 11, 12, 0), // July 11, 2025, 12:00 PM
    end: new Date(2025, 6, 11, 13, 0), // July 11, 2025, 1:00 PM
    color: 'bg-primaryContainer',
    calendarId: 'my-calendar',
  },
  {
    id: '6',
    title: 'Weekly Review',
    start: new Date(2025, 6, 14, 16, 0), // July 14, 2025, 4:00 PM
    end: new Date(2025, 6, 14, 17, 0), // July 14, 2025, 5:00 PM
    color: 'bg-secondaryContainer',
    calendarId: 'work-calendar',
  },
  {
    id: '7',
    title: 'Birthday Party',
    start: new Date(2025, 6, 20, 18, 0), // July 20, 2025, 6:00 PM
    end: new Date(2025, 6, 20, 22, 0), // July 20, 2025, 10:00 PM
    color: 'bg-tertiaryContainer',
    calendarId: 'my-calendar',
  },
];