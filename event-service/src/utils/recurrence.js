const { RRule, RRuleSet, rrulestr } = require('rrule');
const getEventOccurrences = (recurrenceRule, startDate, rangeStart, rangeEnd, exceptionDates = []) => {
    if (!recurrenceRule) {
        if (startDate >= rangeStart && startDate <= rangeEnd) {
            return [startDate];
        }
        return [];
    }
    try {
        let rrule;
        try {
            rrule = rrulestr(recurrenceRule);
        } catch (e) {
            const ruleWithStart = `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}\n${recurrenceRule}`;
            rrule = rrulestr(ruleWithStart);
        }
        const rruleSet = new RRuleSet();
        rruleSet.rrule(rrule);
        if (exceptionDates && exceptionDates.length > 0) {
            exceptionDates.forEach(exDate => {
                const exceptionDate = typeof exDate === 'string' ? new Date(exDate) : exDate;
                rruleSet.exdate(exceptionDate);
            });
        }
        const occurrences = rruleSet.between(rangeStart, rangeEnd, true);
        return occurrences;
    } catch (error) {
        console.error('Error processing recurrence rule:', error);
        return [];
    }
};
const calculateOccurrenceEnd = (occurrenceStart, originalStart, originalEnd) => {
    const duration = originalEnd.getTime() - originalStart.getTime();
    return new Date(occurrenceStart.getTime() + duration);
};
module.exports = {
    getEventOccurrences,
    calculateOccurrenceEnd
};