console.log('API Gateway: Resolvers file is being accessed.');

const resolvers = {
    Query: {
        me: async (_, __, { dataSources, token }) => {
            if (!token) return null;
            return dataSources.userAPI.getCurrentUser(token);
        },
        calendar: async (_, { id }, { dataSources, token }) => {
            return dataSources.calendarAPI.getCalendar(id, token);
        },
        calendars: async (_, __, { dataSources, token }) => {
            return dataSources.calendarAPI.getCalendars(token);
        },
        event: async (_, { id }, { dataSources, token }) => {
            return dataSources.eventAPI.getEvent(id, token);
        },
        events: async (_, { calendarIds, start, end }, { dataSources, token }) => {
            return dataSources.eventAPI.getEvents(calendarIds, start, end, token);
        },
    },

    Mutation: {
        createEvent: async (_, { input }, { dataSources, token }) => {
            if (!token) {
                throw new Error('Authentication required: No token provided.');
            }
            return dataSources.eventAPI.createEvent(input, token);
        },
        register: async (_, { input }, { dataSources }) => {
            return dataSources.authAPI.register(input);
        },
        login: async (_, { input }, { dataSources }) => {
            return dataSources.authAPI.login(input);
        },
        refreshToken: async (_, { refreshToken }, { dataSources }) => {
            return dataSources.authAPI.refreshToken(refreshToken);
        },
        logout: async (_, { refreshToken }, { dataSources }) => {
            return dataSources.authAPI.logout(refreshToken);
        },
        updateUser: async (_, { input }, { dataSources, token }) => {
            return dataSources.userAPI.updateUser(input, token);
        },
        updatePreferences: async (_, { input }, { dataSources, token }) => {
            return dataSources.userAPI.updatePreferences(input, token);
        },
        createCalendar: async (_, { input }, { dataSources, token }) => {
            return dataSources.calendarAPI.createCalendar(input, token);
        },
        updateCalendar: async (_, { id, input }, { dataSources, token }) => {
            return dataSources.calendarAPI.updateCalendar(id, input, token);
        },
        deleteCalendar: async (_, { id }, { dataSources, token }) => {
            return dataSources.calendarAPI.deleteCalendar(id, token);
        },
        shareCalendar: async (_, { input }, { dataSources, token }) => {
            return dataSources.calendarAPI.shareCalendar(input, token);
        },
        updateEvent: async (_, { id, input }, { dataSources, token }) => {
            return dataSources.eventAPI.updateEvent(id, input, token);
        },
        updateEventInstance: async (_, { eventId, instanceDate, input }, { dataSources, token }) => {
            return dataSources.eventAPI.updateEventInstance(eventId, instanceDate, input, token);
        },
        deleteEvent: async (_, { id, recurring }, { dataSources, token }) => {
            return dataSources.eventAPI.deleteEvent(id, recurring, token);
        },
        createReminder: async (_, { eventId, minutesBefore, method }, { dataSources, token }) => {
            return dataSources.eventAPI.createReminder(eventId, minutesBefore, method, token);
        },
        deleteReminder: async (_, { id }, { dataSources, token }) => {
            return dataSources.eventAPI.deleteReminder(id, token);
        },
    },

    User: {
        preferences: async (parent, _, { dataSources, token }) => {
            return dataSources.userAPI.getUserPreferences(parent.id, token);
        },
    },

    Calendar: {
        owner: async (parent, _, { dataSources, token }) => {
            return dataSources.userAPI.getUser(parent.owner_id, token);
        },
        events: async (parent, { start, end }, { dataSources, token }) => {
            return dataSources.eventAPI.getCalendarEvents(parent.id, start, end, token);
        },
        shares: async (parent, _, { dataSources, token }) => {
            return dataSources.calendarAPI.getCalendarShares(parent.id, token);
        },
    },

    Event: {
        calendar: async (parent, _, { dataSources, token }) => {
            return dataSources.calendarAPI.getCalendar(parent.calendar_id, token);
        },
        createdBy: async (parent, _, { dataSources, token }) => {
            return dataSources.userAPI.getUser(parent.created_by, token);
        },
        reminders: async (parent, _, { dataSources, token }) => {
            return dataSources.eventAPI.getEventReminders(parent.id, token);
        },
        attendees: async (parent, _, { dataSources, token }) => {
            return dataSources.eventAPI.getEventAttendees(parent.id, token);
        },
        recurrenceRule: async (parent, _, { dataSources, token }) => {
            if (!parent.recurrence_rule_id) return null;
            return dataSources.eventAPI.getRecurrenceRule(parent.recurrence_rule_id, token);
        },
    },
};

module.exports = resolvers;
