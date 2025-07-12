import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../context/AuthContext';
import { useCalendar } from '../context/CalendarContext';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/calendarApi';
import { CalendarEvent } from '../types/calendar.types';
import EventFormModal from '../components/EventFormModal';
import EventDetailModal from '../components/EventDetailModal';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { dispatch } = useCalendar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      if (user) {
        const fetchedEvents = await getEvents(new Date(2020, 0, 1), new Date(2025, 11, 31));
        setEvents(fetchedEvents);
      }
    };
    fetchEvents();
  }, [user]);

  const handleSelectSlot = () => {
    setSelectedEvent(null);
    setIsFormModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleSaveEvent = async (event: CalendarEvent) => {
    console.log('CalendarPage: handleSaveEvent triggered with event:', event);
    if (event.id && event.id !== '' && event.id !== '0') { // Check if it's an existing event
      dispatch({ type: 'UPDATE_EVENT', payload: event });
    } else {
      dispatch({ type: 'ADD_EVENT', payload: event });
    }
    setIsFormModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
    setEvents(events.filter((e) => e.id !== eventId));
    setIsDetailModalOpen(false);
    setSelectedEvent(null);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Calendar App</h1>
      </header>
      <main className="flex-grow p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="startTime"
          endAccessor="endTime"
          style={{ height: '100%' }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
        />
      </main>
      <EventFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveEvent}
        initialEvent={selectedEvent}
      />
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

export default CalendarPage;