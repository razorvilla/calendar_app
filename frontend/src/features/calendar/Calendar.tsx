import { useEffect } from 'react';
import { useCalendar } from './context/CalendarContext';
import {
    CalendarHeader,
    CalendarSidebar,
    DayView,
    WeekView,
    MonthView,
    EventModal
} from './components';
import CalendarYearView from './CalendarYearView';
import CalendarScheduleView from './CalendarScheduleView';

const Calendar = () => {
    const { view, isDarkMode, currentDate, events } = useCalendar();
    console.log('Calendar.tsx - view:', view);
    console.log('Calendar.tsx - isDarkMode:', isDarkMode);
    console.log('Calendar.tsx - currentDate:', currentDate);
    console.log('Calendar.tsx - events:', events);

    // Apply dark mode to body
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    return (
        <div className={`h-screen w-screen flex flex-col overflow-hidden ${
            isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'
        }`}>
            <CalendarHeader />

            <div className="flex flex-1 w-full overflow-hidden">
                <CalendarSidebar />

                <main className="flex-1 overflow-auto w-full">
                    {view === 'month' && <MonthView />}
                    {view === 'week' && <WeekView />}
                    {view === 'day' && <DayView />}
                    {view === 'year' && <CalendarYearView currentDate={currentDate} allEvents={events} isLoadingEvents={false} />}
                    {view === 'agenda' && <CalendarScheduleView currentDate={currentDate} allEvents={events} isLoadingEvents={false} />}
                </main>
            </div>

            <EventModal />
        </div>
    );
};

export default Calendar;
