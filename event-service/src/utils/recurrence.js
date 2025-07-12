const { RRule, RRuleSet, rrulestr } = require('rrule');

/**
 * Generate event occurrences based on recurrence rule
 *
 * @param {string} recurrenceRule - iCalendar-compatible RRULE string
 * @param {Date} startDate - Base event start date
 * @param {Date} rangeStart - Start of range to generate occurrences for
 * @param {Date} rangeEnd - End of range to generate occurrences for
 * @param {Array} exceptionDates - Array of exception dates (ISO strings or Date objects)
 * @returns {Array} - Array of occurrence dates
 */
const getEventOccurrences = (recurrenceRule, startDate, rangeStart, rangeEnd, exceptionDates = []) => {
    if (!recurrenceRule) {
        // If no recurrence rule, just return the start date if it's in the range
        if (startDate >= rangeStart && startDate <= rangeEnd) {
            return [startDate];
        }
        return [];
    }

    try {
        // Create RRule from string
        let rrule;
        try {
            // Try parsing the raw rule
            rrule = rrulestr(recurrenceRule);
        } catch (e) {
            // If direct parsing fails, try adding DTSTART
            const ruleWithStart = `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}\n${recurrenceRule}`;
            rrule = rrulestr(ruleWithStart);
        }

        // Create a rule set for exceptions
        const rruleSet = new RRuleSet();

        // Add the rule
        rruleSet.rrule(rrule);

        // Add exception dates
        if (exceptionDates && exceptionDates.length > 0) {
            exceptionDates.forEach(exDate => {
                const exceptionDate = typeof exDate === 'string' ? new Date(exDate) : exDate;
                rruleSet.exdate(exceptionDate);
            });
        }

        // Generate dates between the range
        const occurrences = rruleSet.between(rangeStart, rangeEnd, true);

        return occurrences;
    } catch (error) {
        console.error('Error processing recurrence rule:', error);
        return [];
    }
};

/**
 * Calculate end date/time for an occurrence based on original event duration
 *
 * @param {Date} occurrenceStart - Start date/time of the occurrence
 * @param {Date} originalStart - Start date/time of the original event
 * @param {Date} originalEnd - End date/time of the original event
 * @returns {Date} - End date/time for the occurrence
 */
const calculateOccurrenceEnd = (occurrenceStart, originalStart, originalEnd) => {
    const duration = originalEnd.getTime() - originalStart.getTime();
    return new Date(occurrenceStart.getTime() + duration);
};

module.exports = {
    getEventOccurrences,
    calculateOccurrenceEnd
};