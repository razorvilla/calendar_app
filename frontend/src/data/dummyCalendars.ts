export interface Calendar {
  id: string;
  name: string;
  color: string;
}

export const dummyCalendars: Calendar[] = [
  { id: 'my-calendar', name: 'My Calendar', color: 'bg-primary' },
  { id: 'work-calendar', name: 'Work Calendar', color: 'bg-secondary' },
  { id: 'personal-calendar', name: 'Personal', color: 'bg-tertiary' },
];