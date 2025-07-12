// @ts-ignore
import { RRule, Frequency } from 'rrule';
import { CalendarEvent } from '../types/calendar.types';

// Converts RRule.Frequency enum to string literal
export const mapRRuleFrequencyToString = (freq: Frequency): 'daily' | 'weekly' | 'monthly' | 'yearly' => {
    switch (freq) {
        case Frequency.DAILY:
            return 'daily';
        case Frequency.WEEKLY:
            return 'weekly';
        case Frequency.MONTHLY:
            return 'monthly';
        case Frequency.YEARLY:
            return 'yearly';
        default:
            throw new Error('Unknown RRule frequency');
    }
};

// Converts string literal to RRule.Frequency enum
export const mapStringToRRuleFrequency = (freq: 'daily' | 'weekly' | 'monthly' | 'yearly'): Frequency => {
    switch (freq) {
        case 'daily':
            return Frequency.DAILY;
        case 'weekly':
            return Frequency.WEEKLY;
        case 'monthly':
            return Frequency.MONTHLY;
        case 'yearly':
            return Frequency.YEARLY;
        default:
            throw new Error('Unknown frequency string');
    }
};

// Converts CalendarEvent recurrence to RRule options
export const getRRuleOptionsFromEvent = (event: CalendarEvent) => {
    if (!event.recurrence) return undefined;

    return {
        freq: mapStringToRRuleFrequency(event.recurrence.frequency),
        interval: event.recurrence.interval,
        dtstart: event.start,
        until: event.recurrence.endDate,
        count: event.recurrence.count,
    };
};

// Converts RRule options to CalendarEvent recurrence
export const getEventRecurrenceFromRRuleOptions = (options: any) => {
    if (!options.freq) return undefined;

    return {
        frequency: mapRRuleFrequencyToString(options.freq),
        interval: options.interval || 1,
        endDate: options.until || undefined,
        count: options.count || undefined,
    };
};