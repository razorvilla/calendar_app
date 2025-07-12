import { useEffect } from 'react';
import { format } from 'date-fns';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { useCalendar } from '../context/CalendarContext';
import { CalendarEvent } from '../types/calendar.types';
import { RRule } from 'rrule';
import { RecurrencePicker } from './';
import { getEventRecurrenceFromRRuleOptions } from '../utils/rruleUtils';

type EventForm = {
    title: string;
    start: string;
    end: string;
    startTime: string;
    endTime: string;
    allDay: boolean;
    location: string;
    description: string;
    calendarId: string;
    repeat: boolean;
    recurrence?: RRule;
};

const EventModal = () => {
    const {
        isModalOpen,
        closeEventModal,
        selectedEvent,
        deleteEvent,
        calendars,
        isDarkMode,
        dispatch
    } = useCalendar();

    console.log('EventModal: dispatch value', dispatch);

    const methods = useForm<EventForm>({
        defaultValues: {
            title: '',
            start: format(new Date(), 'yyyy-MM-dd'),
            end: format(new Date(), 'yyyy-MM-dd'),
            startTime: format(new Date(), 'HH:mm'),
            endTime: format(new Date(Date.now() + 60 * 60 * 1000), 'HH:mm'),
            allDay: false,
            location: '',
            description: '',
            calendarId: 'personal',
            repeat: false,
            recurrence: undefined,
        }
    });

    const { control, handleSubmit, watch, reset } = methods;

    const allDay = watch('allDay');
    const repeat = watch('repeat');

    // Set form values when selected event changes
    useEffect(() => {
        if (selectedEvent) {
            reset({
                title: selectedEvent.title,
                start: format(selectedEvent.start, 'yyyy-MM-dd'),
                end: format(selectedEvent.end, 'yyyy-MM-dd'),
                startTime: format(selectedEvent.start, 'HH:mm'),
                endTime: format(selectedEvent.end, 'HH:mm'),
                allDay: selectedEvent.allDay || false,
                location: selectedEvent.location || '',
                description: selectedEvent.description || '',
                calendarId: selectedEvent.calendarId,
                repeat: !!selectedEvent.recurrence,
                recurrence: selectedEvent.recurrence,
            });
        } else {
            reset();
        }
    }, [selectedEvent, reset]);

    // Handle form submission
    const onSubmit = (data: EventForm) => {
        // Combine date and time
        const startDateTime = new Date(`${data.start}T${data.startTime}`);
        const endDateTime = new Date(`${data.end}T${data.endTime}`);

        const eventData: Omit<CalendarEvent, 'id'> = {
            title: data.title,
            start: startDateTime,
            end: endDateTime,
            allDay: data.allDay,
            location: data.location,
            description: data.description,
            calendarId: data.calendarId,
            recurrence: data.repeat && data.recurrence ? getEventRecurrenceFromRRuleOptions(data.recurrence.options) : undefined,
        };

        if (selectedEvent) {
            dispatch({ type: 'UPDATE_EVENT', payload: { ...eventData, id: selectedEvent.id } });
            console.log('Updating event:', { ...eventData, id: selectedEvent.id });
        } else {
            dispatch({ type: 'ADD_EVENT', payload: eventData });
            console.log('Adding event:', eventData);
        }

        closeEventModal();
    };

    // Handle deleting an event
    const handleDelete = () => {
        if (selectedEvent) {
            deleteEvent(selectedEvent.id);
            closeEventModal();
        }
    };

    if (!isModalOpen) return null;

    const modalClasses = isDarkMode
        ? 'bg-gray-800 text-white border-gray-700'
        : 'bg-white text-gray-800 border-gray-200';

    const inputClasses = isDarkMode
        ? 'bg-gray-700 border-gray-600 text-white focus:border-primary-500'
        : 'bg-white border-gray-300 text-gray-800 focus:border-primary-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`w-full max-w-md p-6 rounded-lg shadow-xl ${modalClasses}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">
                        {selectedEvent ? 'Edit Event' : 'Add Event'}
                    </h3>
                    <button
                        onClick={closeEventModal}
                        className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                        aria-label="Close"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Title */}
                        <div>
                            <Controller
                                name="title"
                                control={control}
                                rules={{ required: true }}
                                render={({ field }) => (
                                    <input
                                        {...field}
                                        type="text"
                                        placeholder="Add title"
                                        className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClasses}`}
                                    />
                                )}
                            />
                        </div>

                        {/* Date and time */}
                        <div className="flex space-x-2">
                            <div className="flex-1">
                                <Controller
                                    name="start"
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="date"
                                            className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClasses}`}
                                        />
                                    )}
                                />
                            </div>
                            {!allDay && (
                                <div className="flex-1">
                                    <Controller
                                        name="startTime"
                                        control={control}
                                        rules={{ required: !allDay }}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="time"
                                                className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClasses}`}
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex space-x-2">
                            <div className="flex-1">
                                <Controller
                                    name="end"
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="date"
                                            className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClasses}`}
                                        />
                                    )}
                                />
                            </div>
                            {!allDay && (
                                <div className="flex-1">
                                    <Controller
                                        name="endTime"
                                        control={control}
                                        rules={{ required: !allDay }}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="time"
                                                className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClasses}`}
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        <div>
                            <Controller
                                name="location"
                                control={control}
                                render={({ field }) => (
                                    <input
                                        {...field}
                                        type="text"
                                        placeholder="Add location"
                                        className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClasses}`}
                                    />
                                )}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <textarea
                                        {...field}
                                        placeholder="Add description"
                                        className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-20 ${inputClasses}`}
                                    />
                                )}
                            />
                        </div>

                        {/* Options */}
                        <div className="flex items-center space-x-6">
                            <Controller
                                name="allDay"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <label className="flex items-center text-sm">
                                        <input
                                            type="checkbox"
                                            className="mr-2 h-4 w-4 text-primary-600"
                                            checked={value}
                                            onChange={onChange}
                                        />
                                        <span>All day</span>
                                    </label>
                                )}
                            />

                            <Controller
                                name="repeat"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <label className="flex items-center text-sm">
                                        <input
                                            type="checkbox"
                                            className="mr-2 h-4 w-4 text-primary-600"
                                            checked={value}
                                            onChange={onChange}
                                        />
                                        <span>Repeat</span>
                                    </label>
                                )}
                            />
                        </div>

                        {repeat && <RecurrencePicker />}

                        {/* Calendar selection */}
                        <div>
                            <Controller
                                name="calendarId"
                                control={control}
                                rules={{ required: true }}
                                render={({ field }) => (
                                    <select
                                        {...field}
                                        className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClasses}`}
                                    >
                                        {calendars.map(calendar => (
                                            <option key={calendar.id} value={calendar.id}>
                                                {calendar.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end pt-4">
                            {selectedEvent && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md mr-auto hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={closeEventModal}
                                className={`px-4 py-2 rounded-md mr-2 ${
                                    isDarkMode
                                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                                {selectedEvent ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
};

export default EventModal;
