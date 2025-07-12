import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    addDays,
    getHours,
    getMinutes,
    setHours,
    setMinutes,
} from 'date-fns';
import { RRule, RRuleSet } from 'rrule';
import { CalendarEvent, DayWithEvents } from '../types/calendar.types';
import { getRRuleOptionsFromEvent } from './rruleUtils';

// Get array of days for a week view
export const getWeekDays = (date: Date): Date[] => {
    const start = startOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
    const end = endOfWeek(date, { weekStartsOn: 0 });

    return eachDayOfInterval({ start, end });
};

// Get array of days for a month view
export const getMonthDays = (date: Date): DayWithEvents[] => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start, end });

    return days.map(day => ({
        date: day,
        events: [],
        isCurrentMonth: isSameMonth(day, date),
        isToday: isToday(day),
    }));
};

// Format date to display in header
export const formatHeaderDate = (date: Date, view: string): string => {
    switch (view) {
        case 'day':
            return format(date, 'EEEE, MMMM d, yyyy');
        case 'week':
            { const start = startOfWeek(date, { weekStartsOn: 0 });
            const end = endOfWeek(date, { weekStartsOn: 0 });
            const startMonth = format(start, 'MMMM');
            const endMonth = format(end, 'MMMM');

            if (startMonth === endMonth) {
                return `${startMonth} ${format(start, 'd')} - ${format(end, 'd')}, ${format(date, 'yyyy')}`;
            }
            return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}, ${format(date, 'yyyy')}`; }
        case 'month':
            return format(date, 'MMMM yyyy');
        case 'year':
            return format(date, 'yyyy');
        default:
            return format(date, 'MMMM d, yyyy');
    }
};

// Get time slots for day view (e.g., 30-minute intervals)
export const getTimeSlots = (startHour = 0, endHour = 23, interval = 30): string[] => {
    const slots: string[] = [];

    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            if (hour === endHour && minute > 0) break;

            const formattedHour = hour % 12 || 12;
            const period = hour < 12 ? 'AM' : 'PM';
            const formattedMinute = minute.toString().padStart(2, '0');

            slots.push(`${formattedHour}:${formattedMinute} ${period}`);
        }
    }

    return slots;
};

// Get hours array for time column
export const getHourLabels = (startHour = 0, endHour = 23): string[] => {
    const hours: string[] = [];

    for (let hour = startHour; hour <= endHour; hour++) {
        const formattedHour = hour % 12 || 12;
        const period = hour < 12 ? 'AM' : 'PM';

        hours.push(`${formattedHour} ${period}`);
    }

    return hours;
};

// Filter events for a specific date, including recurring events
export const getEventsForDate = (events: CalendarEvent[], date: Date): CalendarEvent[] => {
    console.log(`getEventsForDate: Filtering events for date: ${date.toDateString()}`);
    const dayEvents: CalendarEvent[] = [];

    events.forEach(event => {
        if (event.recurrence) {
            const rruleSet = new RRuleSet();
            const rruleOptions = getRRuleOptionsFromEvent(event);
            if (!rruleOptions) return;
            rruleSet.rrule(new RRule(rruleOptions));

            // Get occurrences for the specific day
            const occurrences = rruleSet.between(
                new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
                new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
                true
            );

            occurrences.forEach(occurrenceDate => {
                dayEvents.push({
                    ...event,
                    id: `${event.id}-${occurrenceDate.getTime()}`,
                    start: occurrenceDate,
                    end: new Date(occurrenceDate.getTime() + (event.end.getTime() - event.start.getTime())),
                });
            });
        } else if (isSameDay(event.start, date)) {
            dayEvents.push(event);
        }
    });

    return dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
};

// Format time (e.g., "9:30 AM")
export const formatTime = (date: Date): string => {
    return format(date, 'h:mm a');
};