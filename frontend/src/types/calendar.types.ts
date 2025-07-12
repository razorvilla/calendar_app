export interface CalendarEvent {
  id?: string; // Made optional for new events
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean; // Renamed from allDay
  calendarId: string;
  color: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  parentId?: string;
  // Add other fields as they become relevant from the backend
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isPrimary: boolean;
  userId: string;
  // Add other fields as they become relevant from the backend
}
