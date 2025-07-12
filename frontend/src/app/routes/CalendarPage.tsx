import { CalendarProvider } from '@features/calendar/context/CalendarContext';
import Calendar from '@features/calendar/Calendar';
import '@assets/styles/calendar.css';

const CalendarPage = () => {
  return (
    <CalendarProvider>
      <Calendar />
    </CalendarProvider>
  );
};

export default CalendarPage;
