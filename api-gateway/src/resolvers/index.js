// GraphQL resolvers
const taskResolvers = require('./taskResolvers');
const appointmentScheduleResolvers = require('./appointmentScheduleResolvers');

const resolvers = {
    Query: {
        ...taskResolvers.Query,
        ...appointmentScheduleResolvers.Query,
        me: async (_, __, { dataSources, token, userId }) => {
            if (!token) return null;
            return dataSources.userAPI.getCurrentUser(token, userId);
        },
        calendar: async (_, { id }, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.getCalendar(id, token, userId);
        },
        calendars: async (_, __, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.getCalendars(token, userId);
        },
        event: async (_, { id }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.getEvent(id, token, userId);
        },
        events: async (_, { calendarIds, start, end }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.getEvents(calendarIds, start, end, token, userId);
        },
    },

    Mutation: {
        ...taskResolvers.Mutation,
        ...appointmentScheduleResolvers.Mutation,

        // Auth mutations
        register: async (_, { input }, { dataSources }) => {
            console.log('API Gateway: Register resolver called with input:', input);
            try {
                return await dataSources.authAPI.register(input);
            } catch (error) {
                console.error('API Gateway: Error in register resolver:', error);
                throw error; // Re-throw the error so Apollo handles it
            }
        },
        login: async (_, { input }, { dataSources }) => {
            const result = await dataSources.authAPI.login(input);
            if (result.requiresMfa) {
                return { requiresMfa: true, userId: result.userId };
            }
            return result;
        },
        refreshToken: async (_, __, { dataSources }) => {
            return dataSources.authAPI.refreshToken();
        },
        logout: async (_, __, { dataSources }) => {
            return dataSources.authAPI.logout();
        },
        generateMfaSecret: async (_, __, { dataSources, userId }) => {
            return dataSources.authAPI.generateMfaSecret(userId);
        },
        verifyMfaSetup: async (_, { token, secret }, { dataSources, userId }) => {
            return dataSources.authAPI.verifyMfaSetup(userId, token, secret);
        },
        enableMfa: async (_, { secret }, { dataSources, userId }) => {
            return dataSources.authAPI.enableMfa(userId, secret);
        },
        disableMfa: async (_, __, { dataSources, userId }) => {
            return dataSources.authAPI.disableMfa(userId);
        },

        // User mutations
        updateUser: async (_, { input }, { dataSources, token, userId }) => {
            return dataSources.userAPI.updateUser(input, token, userId);
        },
        updatePreferences: async (_, { input }, { dataSources, token, userId }) => {
            return dataSources.userAPI.updatePreferences(input, token, userId);
        },

        // Calendar mutations
        createCalendar: async (_, { input }, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.createCalendar(input, token, userId);
        },
        updateCalendar: async (_, { id, input }, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.updateCalendar(id, input, token, userId);
        },
        deleteCalendar: async (_, { id }, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.deleteCalendar(id, token, userId);
        },
        shareCalendar: async (_, { input }, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.shareCalendar(input, token, userId);
        },

        // Event mutations
        createEvent: async (_, { input }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.createEvent(input, token, userId);
        },
        updateEvent: async (_, { id, input }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.updateEvent(id, input, token, userId);
        },
        updateEventInstance: async (_, { eventId, instanceDate, input }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.updateEventInstance(eventId, instanceDate, input, token, userId);
        },
        deleteEvent: async (_, { id, recurring }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.deleteEvent(id, recurring, token, userId);
        },
        createReminder: async (_, { eventId, minutesBefore, method }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.createReminder(eventId, minutesBefore, method, token, userId);
        },
        deleteReminder: async (_, { id }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.deleteReminder(id, token, userId);
        },
    },

    // Define resolvers for nested fields (e.g., User.preferences, Calendar.events)
    User: {
        preferences: async (parent, _, { dataSources, token, userId }) => {
            return dataSources.userAPI.getUserPreferences(parent.id, token, userId);
        },
    },

    Calendar: {
        owner: async (parent, _, { dataSources, token, userId }) => {
            return dataSources.userAPI.getUser(parent.owner_id, token, userId);
        },
        events: async (parent, { start, end }, { dataSources, token, userId }) => {
            return dataSources.eventAPI.getCalendarEvents(parent.id, start, end, token, userId);
        },
        shares: async (parent, _, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.getCalendarShares(parent.id, token, userId);
        },
    },

    Event: {
        calendar: async (parent, _, { dataSources, token, userId }) => {
            return dataSources.calendarAPI.getCalendar(parent.calendar_id, token, userId);
        },
        createdBy: async (parent, _, { dataSources, token, userId }) => {
            return dataSources.userAPI.getUser(parent.created_by, token, userId);
        },
        reminders: async (parent, _, { dataSources, token, userId }) => {
            return dataSources.eventAPI.getEventReminders(parent.id, token, userId);
        },
        attendees: async (parent, _, { dataSources, token, userId }) => {
            return dataSources.eventAPI.getEventAttendees(parent.id, token, userId);
        },
    },

    // Define additional nested resolvers
};

module.exports = resolvers;