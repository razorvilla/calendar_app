const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Scalar types
  scalar DateTime
  scalar JSON

  # User Types
  type User {
    id: ID!
    email: String!
    name: String
    timezone: String!
    preferences: UserPreferences
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type UserPreferences {
    defaultCalendarId: ID
    defaultView: ViewType
    workingHours: WorkingHours
    notificationSettings: NotificationSettings
  }

  type WorkingHours {
    start: String!
    end: String!
    days: [Int!]!
  }

  type NotificationSettings {
    eventReminders: Boolean!
    shareNotifications: Boolean!
    emailNotifications: Boolean!
  }

  enum ViewType {
    DAY
    WEEK
    MONTH
    AGENDA
  }

  # Calendar Types
  type Calendar {
    id: ID!
    owner: User!
    name: String!
    description: String
    color: String
    isDefault: Boolean!
    isVisible: Boolean!
    events(startTime: DateTime, endTime: DateTime): [Event!]
    shares: [CalendarShare!]
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type CalendarShare {
    id: ID!
    calendar: Calendar!
    user: User
    email: String!
    permission: Permission!
    status: ShareStatus!
    inviteToken: String
    createdAt: DateTime!
    updatedAt: DateTime
  }

  enum Permission {
    VIEW
    EDIT
  }

  enum ShareStatus {
    PENDING
    ACCEPTED
    DECLINED
  }

  # Event Types
  type Event {
    id: ID!
    calendar: Calendar!
    title: String!
    description: String
    location: String
    startTime: DateTime!
    endTime: DateTime!
    isAllDay: Boolean!
    recurrenceRule: String
    exceptionDates: [DateTime]
    color: String
    visibility: Visibility!
    status: EventStatus!
    reminders: [Reminder!]
    attendees: [EventAttendee!]
    createdBy: User!
    isRecurringInstance: Boolean
    originalEventId: ID
    createdAt: DateTime!
    updatedAt: DateTime
    version: Int!
  }

  enum Visibility {
    DEFAULT
    PUBLIC
    PRIVATE
    CONFIDENTIAL
  }

  enum EventStatus {
    CONFIRMED
    TENTATIVE
    CANCELLED
  }

  type EventAttendee {
    id: ID!
    event: Event!
    user: User
    email: String!
    name: String
    responseStatus: ResponseStatus!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  enum ResponseStatus {
    PENDING
    ACCEPTED
    DECLINED
    TENTATIVE
  }

  type Reminder {
    id: ID!
    event: Event!
    user: User!
    minutesBefore: Int!
    method: ReminderMethod!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  enum ReminderMethod {
    NOTIFICATION
    EMAIL
  }

  # Task Types
  type Task {
    id: ID!
    userId: ID!
    title: String!
    description: String
    dueDate: DateTime
    isCompleted: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  # Appointment Schedule Types
  type AppointmentSchedule {
    id: ID!
    calendarId: ID!
    name: String!
    description: String
    durationMinutes: Int!
    slotIntervalMinutes: Int!
    availabilityRules: JSON!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type AppointmentSlot {
    id: ID!
    scheduleId: ID!
    startTime: DateTime!
    endTime: DateTime!
    isBooked: Boolean!
    bookedByUserId: ID
    createdAt: DateTime!
    updatedAt: DateTime
  }

  # Input Types
  input RegisterInput {
    email: String!
    password: String!
    name: String!
  }

  input LoginInput {
    email: String!
    password: String!
    mfaToken: String
  }

  type MfaSetupPayload {
    secret: String!
    qrcodeUrl: String!
  }

  input UpdateUserInput {
    name: String
    timezone: String
  }

  input UpdatePreferencesInput {
    defaultCalendarId: ID
    defaultView: ViewType
    workingHours: WorkingHoursInput
    notificationSettings: NotificationSettingsInput
  }

  input WorkingHoursInput {
    start: String
    end: String
    days: [Int!]
  }

  input NotificationSettingsInput {
    eventReminders: Boolean
    shareNotifications: Boolean
    emailNotifications: Boolean
  }

  input CreateCalendarInput {
    name: String!
    description: String
    color: String
    isDefault: Boolean
    isVisible: Boolean
  }

  input UpdateCalendarInput {
    name: String
    description: String
    color: String
    isDefault: Boolean
    isVisible: Boolean
  }

  input ShareCalendarInput {
    calendarId: ID!
    email: String!
    permission: Permission!
  }

  input CreateEventInput {
    calendarId: ID!
    title: String!
    description: String
    location: String
    startTime: DateTime!
    endTime: DateTime!
    isAllDay: Boolean
    recurrenceRule: String
    color: String
    visibility: Visibility
    reminderMinutes: Int
    attendees: [AttendeeInput]
  }

  input UpdateEventInput {
    title: String
    description: String
    location: String
    startTime: DateTime
    endTime: DateTime
    isAllDay: Boolean
    recurrenceRule: String
    color: String
    visibility: Visibility
    status: EventStatus
  }

  input AttendeeInput {
    email: String!
    name: String
  }

  input UpdateEventInstanceInput {
    title: String
    description: String
    location: String
    startTime: DateTime
    endTime: DateTime
    color: String
    status: EventStatus
  }

  input CreateTaskInput {
    title: String!
    description: String
    dueDate: DateTime
  }

  input UpdateTaskInput {
    title: String
    description: String
    dueDate: DateTime
    isCompleted: Boolean
  }

  input CreateAppointmentScheduleInput {
    calendarId: ID!
    name: String!
    description: String
    durationMinutes: Int!
    slotIntervalMinutes: Int!
    availabilityRules: JSON!
  }

  input UpdateAppointmentScheduleInput {
    name: String
    description: String
    durationMinutes: Int
    slotIntervalMinutes: Int
    availabilityRules: JSON
  }

  input CreateAppointmentSlotInput {
    scheduleId: ID!
    startTime: DateTime!
    endTime: DateTime!
  }

  input UpdateAppointmentSlotInput {
    isBooked: Boolean
    bookedByUserId: ID
  }

  # Root Types
  type Query {
    # User queries
    me: User
    
    # Calendar queries
    calendar(id: ID!): Calendar
    calendars: [Calendar!]!
    
    # Event queries
    event(id: ID!): Event
    events(calendarIds: [ID!], startTime: DateTime!, endTime: DateTime!): [Event!]!

    # Task queries
    task(id: ID!): Task
    tasks: [Task!]!

    # Appointment Schedule queries
    appointmentSchedule(id: ID!): AppointmentSchedule
    appointmentSchedules(calendarId: ID!): [AppointmentSchedule!]!
    appointmentSlot(id: ID!): AppointmentSlot
    appointmentSlots(scheduleId: ID!): [AppointmentSlot!]!
  }

  type Mutation {
    # Auth mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    generateMfaSecret: MfaSetupPayload!
    verifyMfaSetup(token: String!, secret: String!): Boolean!
    enableMfa(secret: String!): Boolean!
    disableMfa: Boolean!
    refreshToken(refreshToken: String!): AuthPayload!
    logout(refreshToken: String!): Boolean!
    
    # User mutations
    updateUser(input: UpdateUserInput!): User!
    updatePreferences(input: UpdatePreferencesInput!): UserPreferences!
    
    # Calendar mutations
    createCalendar(input: CreateCalendarInput!): Calendar!
    updateCalendar(id: ID!, input: UpdateCalendarInput!): Calendar!
    deleteCalendar(id: ID!): Boolean!
    shareCalendar(input: ShareCalendarInput!): CalendarShare!
    
    # Event mutations
    createEvent(input: CreateEventInput!): Event!
    updateEvent(id: ID!, input: UpdateEventInput!): Event!
    updateEventInstance(eventId: ID!, instanceDate: DateTime!, input: UpdateEventInstanceInput!): Event!
    deleteEvent(id: ID!, recurring: String): Boolean!
    createReminder(eventId: ID!, minutesBefore: Int!, method: ReminderMethod!): Reminder!
    deleteReminder(id: ID!): Boolean!

    # Task mutations
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!

    # Appointment Schedule mutations
    createAppointmentSchedule(input: CreateAppointmentScheduleInput!): AppointmentSchedule!
    updateAppointmentSchedule(id: ID!, input: UpdateAppointmentScheduleInput!): AppointmentSchedule!
    deleteAppointmentSchedule(id: ID!): Boolean!
    createAppointmentSlot(input: CreateAppointmentSlotInput!): AppointmentSlot!
    updateAppointmentSlot(id: ID!, input: UpdateAppointmentSlotInput!): AppointmentSlot!
    deleteAppointmentSlot(id: ID!): Boolean!
  }

  type AuthPayload {
    accessToken: String
    refreshToken: String
    user: User
    requiresMfa: Boolean
    userId: ID
  }
`;

module.exports = typeDefs;
