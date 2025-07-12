const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  enum NotificationStatus {
    PENDING
    SENT
    DELIVERED
    FAILED
    CANCELED
  }

  enum NotificationType {
    EMAIL
    SMS
    PUSH
    IN_APP
  }

  enum NotificationChannel {
    EMAIL
    SMS
    PUSH
    IN_APP
  }

  enum NotificationPriority {
    LOW
    MEDIUM
    HIGH
  }

  enum SortOrder {
    ASC
    DESC
  }

  type Notification {
    id: ID!
    userId: ID!
    type: NotificationType!
    title: String!
    message: String!
    channels: [NotificationChannel!]!
    status: NotificationStatus!
    priority: NotificationPriority!
    readAt: DateTime
    scheduledFor: DateTime
    sentAt: DateTime
    deliveredAt: DateTime
    failedAt: DateTime
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NotificationPreference {
    id: ID!
    userId: ID!
    type: NotificationType!
    channels: [NotificationChannel!]!
    enabled: Boolean!
    quiet: Boolean!
    quietStartTime: String
    quietEndTime: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NotificationTemplate {
    id: ID!
    name: String!
    type: NotificationType!
    titleTemplate: String!
    messageTemplate: String!
    defaultChannels: [NotificationChannel!]!
    defaultPriority: NotificationPriority!
    variables: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NotificationCount {
    unread: Int!
    today: Int!
    thisWeek: Int!
  }

  input NotificationInput {
    userId: ID!
    type: NotificationType!
    title: String!
    message: String!
    channels: [NotificationChannel!]!
    priority: NotificationPriority
    metadata: JSON
  }

  input ScheduledNotificationInput {
    userId: ID!
    type: NotificationType!
    title: String!
    message: String!
    channels: [NotificationChannel!]!
    scheduledFor: DateTime!
    priority: NotificationPriority
    metadata: JSON
  }

  input TemplateNotificationInput {
    templateName: String!
    userId: ID!
    data: JSON
  }

  input NotificationPreferenceInput {
    channels: [NotificationChannel!]
    enabled: Boolean
    quiet: Boolean
    quietStartTime: String
    quietEndTime: String
  }

  input NotificationTemplateInput {
    name: String!
    type: NotificationType!
    titleTemplate: String!
    messageTemplate: String!
    defaultChannels: [NotificationChannel!]!
    defaultPriority: NotificationPriority
    variables: [String!]
  }

  type Query {
    notifications(
      status: NotificationStatus
      type: NotificationType
      read: Boolean
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: SortOrder
    ): [Notification!]!
    notification(id: ID!): Notification
    notificationCount: NotificationCount!
    notificationPreferences: [NotificationPreference!]!
    notificationTemplates(type: NotificationType): [NotificationTemplate!]!
  }

  type Mutation {
    sendNotification(input: NotificationInput!): Notification!
    scheduleNotification(input: ScheduledNotificationInput!): Notification!
    sendTemplateNotification(input: TemplateNotificationInput!): Notification!
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: NotificationCount!
    cancelNotification(id: ID!): Notification!
    updateNotificationPreferences(type: NotificationType!, input: NotificationPreferenceInput!): NotificationPreference!
    createNotificationTemplate(input: NotificationTemplateInput!): NotificationTemplate!
    updateNotificationTemplate(id: ID!, input: NotificationTemplateInput!): NotificationTemplate!
  }
`;

module.exports = typeDefs;
