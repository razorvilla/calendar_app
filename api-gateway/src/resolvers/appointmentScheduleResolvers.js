const appointmentScheduleResolvers = {
  Query: {
    appointmentSchedule: async (_, { id }, { dataSources }) => {
      return dataSources.calendarService.getAppointmentSchedule(id);
    },
    appointmentSchedules: async (_, { calendarId }, { dataSources }) => {
      return dataSources.calendarService.getAppointmentSchedules(calendarId);
    },
    appointmentSlot: async (_, { id }, { dataSources }) => {
      return dataSources.calendarService.getAppointmentSlot(id);
    },
    appointmentSlots: async (_, { scheduleId }, { dataSources }) => {
      return dataSources.calendarService.getAppointmentSlots(scheduleId);
    },
  },
  Mutation: {
    createAppointmentSchedule: async (_, { input }, { dataSources }) => {
      return dataSources.calendarService.createAppointmentSchedule(input);
    },
    updateAppointmentSchedule: async (_, { id, input }, { dataSources }) => {
      return dataSources.calendarService.updateAppointmentSchedule(id, input);
    },
    deleteAppointmentSchedule: async (_, { id }, { dataSources }) => {
      return dataSources.calendarService.deleteAppointmentSchedule(id);
    },
    createAppointmentSlot: async (_, { input }, { dataSources }) => {
      return dataSources.calendarService.createAppointmentSlot(input);
    },
    updateAppointmentSlot: async (_, { id, input }, { dataSources }) => {
      return dataSources.calendarService.updateAppointmentSlot(id, input);
    },
    deleteAppointmentSlot: async (_, { id }, { dataSources }) => {
      return dataSources.calendarService.deleteAppointmentSlot(id);
    },
  },
};

module.exports = appointmentScheduleResolvers;
