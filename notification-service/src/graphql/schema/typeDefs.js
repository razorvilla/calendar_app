const { gql } = require('apollo-server-express');

const typeDefs = gql`
  enum NotificationType {
    EVENT_REMINDER
    INVITATION
    CALENDAR_SHARE
    SYSTEM_ALERT
    EVENT_UPDATE
    CUSTOM
  }

  enum NotificationChannel {
    EMAIL
    PUSH
    SMS
    IN_APP
  }

  enum NotificationStatus {
    PENDING
    SENT
    DELIVERED
    FAILED
    CANCELED
  }

  enum NotificationPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  type Notification {
    id: ID!
    userId: ID!
    type: NotificationType!
    title: String!
    message: String!
    channel: [NotificationChannel!]!
    status: NotificationStatus!
    priority: NotificationPriority!
    metadata: JSON
    scheduledFor: DateTime
    sentAt: DateTime
    deliveredAt: DateTime
    readAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type NotificationTemplate {
    id: ID!
    name: String!
    type: NotificationType!
    titleTemplate: String!
    messageTemplate: String!
    defaultChannels: [NotificationChannel!]!
    defaultPriority: NotificationPriority!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type NotificationPreference {
    id: ID!
    userId: ID!
    type: NotificationType!
    channels: [NotificationChannel!]!
    enabled: Boolean!
    quiet: Boolean
    quietStartTime: String
    quietEndTime: String
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type NotificationStats {
    total: Int!
    sent: Int!
    delivered: Int!
    failed: Int!
    pending: Int!
    readRate: Float
  }

  type NotificationCount {
    unread: Int!
    today: Int!
    thisWeek: Int!
  }

  scalar DateTime
  scalar JSON

  type Query {
    notification(id: ID!): Notification
    notifications(
      status: NotificationStatus
      type: NotificationType
      channel: NotificationChannel
      read: Boolean
      limit: Int = 10
      offset: Int = 0
      sortBy: String = "createdAt"
      sortOrder: String = "DESC"
    ): [Notification!]!
    notificationCount: NotificationCount!
    notificationTemplates(type: NotificationType): [NotificationTemplate!]!
    notificationPreferences: [NotificationPreference!]!
    notificationStats(
      startDate: DateTime
      endDate: DateTime
      type: NotificationType
    ): NotificationStats!
  }

  type Mutation {
    sendNotification(
      userId: ID!
      type: NotificationType!
      title: String!
      message: String!
      channels: [NotificationChannel!]!
      priority: NotificationPriority = MEDIUM
      metadata: JSON
    ): Notification!

    scheduleNotification(
      userId: ID!
      type: NotificationType!
      title: String!
      message: String!
      channels: [NotificationChannel!]!
      scheduledFor: DateTime!
      priority: NotificationPriority = MEDIUM
      metadata: JSON
    ): Notification!

    cancelNotification(id: ID!): Boolean!

    markNotificationAsRead(id: ID!): Notification!

    markAllNotificationsAsRead: Boolean!

    createNotificationTemplate(
      name: String!
      type: NotificationType!
      titleTemplate: String!
      messageTemplate: String!
      defaultChannels: [NotificationChannel!]!
      defaultPriority: NotificationPriority = MEDIUM
    ): NotificationTemplate!

    updateNotificationTemplate(
      id: ID!
      name: String
      titleTemplate: String
      messageTemplate: String
      defaultChannels: [NotificationChannel!]
      defaultPriority: NotificationPriority
    ): NotificationTemplate!

    updateNotificationPreference(
      type: NotificationType!
      channels: [NotificationChannel!]!
      enabled: Boolean!
      quiet: Boolean
      quietStartTime: String
      quietEndTime: String
    ): NotificationPreference!
  }

  type Subscription {
    notificationReceived: Notification!
    notificationStatusChanged(id: ID!): Notification!
  }
`;

module.exports = typeDefs;
