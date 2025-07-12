# Calendar App Project Documentation

This document serves as a comprehensive guide to the Calendar App project, detailing its architecture, design, implementation, and development status. It is intended for developers, new team members, and AI assistants to quickly understand the system and facilitate ongoing development.

## Table of Contents
1.  [Application Architecture](#1-application-architecture)
    *   [1.1. Overview](#11-overview)
    *   [1.2. Microservices Breakdown](#12-microservices-breakdown)
    *   [1.3. Communication Patterns](#13-communication-patterns)
    *   [1.4. Data Flow](#14-data-flow)
2.  [High-Level Design](#2-high-level-design)
    *   [2.1. System Context](#21-system-context)
    *   [2.2. Core Entities & Data Model](#22-core-entities--data-model)
    *   [2.3. API Specifications (GraphQL & REST)](#23-api-specifications-graphql--rest)
3.  [Low-Level Design](#3-low-level-design)
    *   [3.1. Service-Specific Implementations](#31-service-specific-implementations)
        *   [3.1.1. Auth Service](#311-auth-service)
        *   [3.1.2. User Service](#312-user-service)
        *   [3.1.3. Calendar Service](#313-calendar-service)
        *   [3.1.4. Event Service](#314-event-service)
        *   [3.1.5. Notification Service](#315-notification-service)
        *   [3.1.6. API Gateway](#316-api-gateway)
    *   [3.2. Database Schema & Relationships](#32-database-schema--relationships)
    *   [3.3. SOLID Principles Implementation](#33-solid-principles-implementation)
4.  [Development Status](#4-development-status)
    *   [4.1. Tasks Worked On](#41-tasks-worked-on)
    *   [4.2. Current Task](#42-current-task)
    *   [4.3. Pending Tasks](#43-pending-tasks)
5.  [Getting Started](#5-getting-started)
    *   [5.1. Prerequisites](#51-prerequisites)
    *   [5.2. Installation & Setup](#52-installation--setup)
    *   [5.3. Running the Application](#53-running-the-application)
    *   [5.4. Running Tests](#54-running-tests)
6.  [Contributing](#6-contributing)
7.  [License](#7-license)

---

## 1. Application Architecture

### 1.1. Overview
The Calendar App is built with a comprehensive microservices architecture designed for scalability, maintainability, and independent development. A frontend Single Page Application (SPA) communicates with a backend system through an API Gateway, which aggregates data from various independent microservices.

```mermaid
graph TD
    subgraph User Interface
        F[Frontend <br>(React, Vite, TailwindCSS)]
    end

    subgraph Gateway
        A[API Gateway <br>(Apollo GraphQL, Express)]
    end

    subgraph Backend Microservices
        Auth[Auth Service <br>(Node.js, Express, JWT)]
        User[User Service <br>(Node.js, Express)]
        Calendar[Calendar Service <br>(Node.js, Express)]
        Event[Event Service <br>(Node.js, Express, RRule)]
        Notification[Notification Service <br>(Node.js, Nodemailer, Twilio, Kafka)]
    end

    subgraph Data Stores
        PG[(PostgreSQL)]
        Mongo[(MongoDB)]
        Redis[(Redis)]
    end

    subgraph Shared Infrastructure
        Shared[Shared Library <br>(Knex Migrations, Models)]
        MQ[Message Queue <br>(Kafka, BullMQ)]
    end

    F --> A

    A --> Auth
    A --> User
    A --> Calendar
    A --> Event
    A --> Notification

    Auth --> PG
    User --> PG
    Calendar --> PG
    Event --> PG

    Notification --> Mongo
    Notification --> Redis
    Notification --> MQ

    Auth --> Shared
    User --> Shared
    Calendar --> Shared
    Event --> Shared
```

### 1.2. Microservices Breakdown
*   **Auth Service (`/auth-service`):** Manages user authentication, registration, and session management using Node.js, Express, PostgreSQL, and JWT.
*   **User Service (`/user-service`):** Manages user profiles and application-specific preferences using Node.js, Express, and PostgreSQL.
*   **Calendar Service (`/calendar-service`):** Manages calendars, including creation, updates, and sharing using Node.js, Express, and PostgreSQL.
*   **Event Service (`/event-service`):** Manages calendar events, recurrence rules, attendees, and reminders using Node.js, Express, PostgreSQL, and `rrule.js`. **(Note: Task management functionality has been refactored into this service.)**
*   **Notification Service (`/notification-service`):** Handles all application-related notifications (email, push, SMS) using Node.js, Express, MongoDB, Redis, Kafka, BullMQ, Nodemailer, Twilio, and Firebase Admin.
*   **API Gateway (`/api-gateway`):** Acts as a single entry point for the frontend, aggregating data from microservices via Apollo Server (GraphQL).
*   **Shared Library (`/shared`):** Contains shared code and configurations, primarily Knex.js database migrations and seeds.

### 1.3. Communication Patterns
*   **Synchronous:** REST/GraphQL API calls for immediate responses between services.
*   **Asynchronous:** Event-driven architecture using Apache Kafka for reliable message delivery and eventual consistency.
*   **Real-time:** WebSocket connections (e.g., Redis Pub/Sub) for live updates and notifications.

### 1.4. Data Flow
The frontend communicates with the API Gateway. The API Gateway then routes requests to the appropriate microservices. Microservices interact with their respective databases (PostgreSQL for relational data, MongoDB for notification-specific data, Redis for caching and session management). Asynchronous communication between services is handled via Kafka.

## 2. High-Level Design

### 2.1. System Context
The Calendar App is designed to serve Android, iOS, and web platforms, providing a unified calendar experience. It integrates with external calendar systems (Google, Outlook) and supports real-time synchronization across devices.

### 2.2. Core Entities & Data Model
The primary data store is PostgreSQL, managed by Knex.js migrations in the `/shared` directory. Key entities include:
*   `users`: User identity and authentication.
*   `user_preferences`: User-specific settings.
*   `calendars`: User-owned calendars.
*   `calendar_shares`: Permissions for shared calendars.
*   `events`: Core event data, including recurrence rules.
*   `event_instances`: Occurrences of recurring events.
*   `event_attendees`: Event participants.
*   `reminders`: Event reminders.
*   `attachments`: Files attached to events.
*   `tasks`: User tasks.
*   `appointment_schedules`: Defines available appointment slots.
*   `appointment_slots`: Specific bookable time slots.
*   `refresh_tokens`: Stores refresh tokens for authentication.
*   `sync_tokens`: Tracks synchronization state across devices.

The Notification Service uses MongoDB for notification templates and logs, and Redis for caching and queue management.

### 2.3. API Specifications (GraphQL & REST)
The API Gateway exposes a unified GraphQL schema. Individual microservices expose RESTful APIs for internal communication.

**GraphQL Schema (High-Level):**
*   **Queries:** `me`, `calendar`, `calendars`, `event`, `events`, `task`, `tasks`, `appointmentSchedule`, `appointmentSchedules`, `appointmentSlot`, `appointmentSlots`, `notification`, `notifications`, `notificationCount`, `notificationTemplates`, `notificationPreferences`, `notificationStats`.
*   **Mutations:** `register`, `login`, `generateMfaSecret`, `verifyMfaSetup`, `enableMfa`, `disableMfa`, `refreshToken`, `logout`, `updateUser`, `updatePreferences`, `createCalendar`, `updateCalendar`, `deleteCalendar`, `shareCalendar`, `createEvent`, `updateEvent`, `updateEventInstance`, `deleteEvent`, `createReminder`, `deleteReminder`, `createTask`, `updateTask`, `deleteTask`, `createAppointmentSchedule`, `updateAppointmentSchedule`, `deleteAppointmentSchedule`, `createAppointmentSlot`, `updateAppointmentSlot`, `deleteAppointmentSlot`, `sendNotification`, `scheduleNotification`, `cancelNotification`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `createNotificationTemplate`, `updateNotificationTemplate`, `updateNotificationPreference`.
*   **Subscriptions:** `notificationReceived`, `notificationStatusChanged`.

## 3. Low-Level Design

### 3.1. Service-Specific Implementations

#### 3.1.1. Auth Service
*   **Purpose:** User authentication and authorization.
*   **Key Components:**
    *   `controllers/auth.js`: Handles registration, login, token refresh, logout, MFA setup, password reset.
    *   `controllers/health.js`: Health check endpoint.
    *   `db/pool.js`: PostgreSQL connection pool.
    *   `middleware/auth.js`: JWT authentication middleware.
    *   `routes/auth.js`: Defines authentication routes.
    *   `routes/health.js`: Defines health check routes.
    *   `services/auth.js`: Business logic for authentication.
    *   `utils/auth.js`: Utility functions for authentication (e.g., password hashing).
*   **Technologies:** Node.js, Express, PostgreSQL, bcrypt, jsonwebtoken, uuid, pg.

#### 3.1.2. User Service
*   **Purpose:** Manages user profiles and preferences.
*   **Key Components:**
    *   `controllers/user.js`: Handles user profile CRUD, password changes, user search.
    *   `controllers/preference.js`: Manages user preferences.
    *   `controllers/health.js`: Health check endpoint.
    *   `db/pool.js`: PostgreSQL connection pool.
    *   `middleware/auth.js`: JWT authentication middleware.
    *   `routes/user.js`: Defines user-related routes.
    *   `routes/health.js`: Defines health check routes.
    *   `services/user.js`: Business logic for user management.
    *   `utils/user.js`: Utility functions.
*   **Technologies:** Node.js, Express, PostgreSQL, bcrypt, jsonwebtoken, uuid, pg.

#### 3.1.3. Calendar Service
*   **Purpose:** Manages calendars and sharing.
*   **Key Components:**
    *   `controllers/calendar.js`: Handles calendar CRUD operations.
    *   `controllers/share.js`: Manages calendar sharing.
    *   `controllers/health.js`: Health check endpoint.
    *   `db/pool.js`: PostgreSQL connection pool.
    *   `middleware/auth.js`: JWT authentication middleware.
    *   `routes/calendar.js`: Defines calendar routes.
    *   `routes/health.js`: Defines health check routes.
    *   `services/calendar.js`: Business logic for calendar management.
    *   `utils/calendar.js`: Utility functions.
*   **Technologies:** Node.js, Express, PostgreSQL, jsonwebtoken, uuid, pg.

#### 3.1.4. Event Service
*   **Purpose:** Manages calendar events, recurrence, attendees, reminders, and tasks.
*   **Key Components:**
    *   `controllers/event.js`: Handles event CRUD, recurring events, and event instances.
    *   `controllers/reminder.js`: Manages event reminders.
    *   `controllers/attendee.js`: Manages event attendees.
    *   `controllers/taskController.js`: Handles task CRUD operations. **(Refactored from User Service)**
    *   `controllers/health.js`: Health check endpoint.
    *   `db/pool.js`: PostgreSQL connection pool.
    *   `db/taskRepository.js`: Data access for tasks. **(Refactored from User Service)**
    *   `middleware/auth.js`: JWT authentication middleware.
    *   `routes/event.js`: Defines event routes.
    *   `routes/taskRoutes.js`: Defines task routes. **(Refactored from User Service)**
    *   `routes/health.js`: Defines health check routes.
    *   `services/event.js`: Business logic for event management.
    *   `services/taskService.js`: Business logic for task management. **(Refactored from User Service)**
    *   `utils/recurrence.js`: Utility for recurrence rules (`rrule.js`).
*   **Technologies:** Node.js, Express, PostgreSQL, rrule.js, jsonwebtoken, uuid, pg.

#### 3.1.5. Notification Service
*   **Purpose:** Sends various types of notifications (email, push, SMS, in-app).
*   **Key Components:**
    *   `models/notification.js`: Mongoose model for notifications.
    *   `models/template.js`: Mongoose model for notification templates.
    *   `models/preference.js`: Mongoose model for user notification preferences.
    *   `controllers/notification.js`: Core notification logic (processing, creation from template, sending, scheduling, canceling, fetching).
    *   `controllers/scheduler.js`: Manages scheduled notification tasks (cron jobs).
    *   `controllers/channels/email.js`: Handles email sending (Nodemailer).
    *   `controllers/channels/push.js`: Handles push notifications (Firebase Admin).
    *   `controllers/channels/sms.js`: Handles SMS sending (Twilio).
    *   `controllers/channels/inApp.js`: Handles in-app notifications.
    *   `services/queueService.js`: Manages BullMQ queues for notification processing.
    *   `services/eventListener.js`: Listens for Kafka events to trigger notifications.
    *   `services/deliveryTracker.js`: Tracks notification delivery status.
    *   `api/routes/notification.js`: Defines REST API endpoints for notifications.
    *   `api/middleware/auth.js`: Authentication middleware for notification API.
    *   `api/middleware/validation.js`: Joi validation for API inputs.
    *   `utils/logger.js`: Centralized logging utility (Winston).
    *   `utils/errorHandler.js`: Global error handling middleware.
    *   `config/index.js`: Centralized configuration management.
    *   `config/db.js`: MongoDB connection.
    *   `graphql/schema/typeDefs.js`: GraphQL type definitions for notifications.
    *   `graphql/resolvers/index.js`: GraphQL resolvers for notifications.
    *   `graphql/schema/index.js`: Combines GraphQL typeDefs and resolvers.
*   **Technologies:** Node.js, Express, MongoDB, Redis, Kafka, BullMQ, Nodemailer, Twilio, Firebase Admin, Joi, Winston, Mongoose, jsonwebtoken.

#### 3.1.6. API Gateway
*   **Purpose:** Single entry point for frontend, aggregates microservices.
*   **Key Components:**
    *   `index.js`: Main Apollo Server setup.
    *   `datasources/auth-api.js`: Data source for Auth Service.
    *   `datasources/user-api.js`: Data source for User Service.
    *   `datasources/calendar-api.js`: Data source for Calendar Service.
    *   `datasources/event-api.js`: Data source for Event Service (now includes task methods).
    *   `resolvers/index.js`: Combines all service resolvers.
    *   `resolvers/taskResolvers.js`: Resolvers for task-related GraphQL operations (now points to Event Service).
    *   `resolvers/appointmentScheduleResolvers.js`: Resolvers for appointment schedules.
    *   `scalars/Date.js`: Custom GraphQL Date scalar.
    *   `schema/index.js`: Combines type definitions and resolvers.
    *   `schema/typeDefs.js`: GraphQL schema definitions.
*   **Technologies:** Node.js, Express, Apollo Server (GraphQL), axios, cookie-parser, cors, dotenv, express-rate-limit, graphql, helmet, jsonwebtoken, redis.

### 3.2. Database Schema & Relationships
(This section will contain the detailed schema definitions from `shared/migrations` and relationships as described in the architecture PDF. I will generate this content after the current step.)

### 3.3. SOLID Principles Implementation
The project adheres to SOLID principles:
*   **Single Responsibility Principle:** Each microservice has a single, well-defined responsibility (e.g., Auth Service for authentication, Event Service for events and tasks).
*   **Open/Closed Principle:** Services are designed to be open for extension (e.g., adding new notification channels) but closed for modification of core logic.
*   **Liskov Substitution Principle:** (To be further elaborated with specific code examples if needed, but generally implied by interface-based design and consistent API contracts).
*   **Interface Segregation Principle:** GraphQL provides granular API endpoints, ensuring clients only depend on the interfaces they use.
*   **Dependency Inversion Principle:** High-level modules (e.g., API Gateway resolvers) depend on abstractions (data sources) rather than concrete implementations of microservices.

## 4. Development Status

### 4.1. Tasks Worked On
*   **Initial Project Setup:** Cloned repository, installed dependencies, and gained an understanding of the existing codebase structure.
*   **Codebase Analysis:** Reviewed `README.md`, `package.json` files, and existing code to understand technologies, dependencies, and architectural patterns.
*   **PDF Document Analysis:** Read and extracted key information from `Claude-Scalable Calendar App Architecture.pdf` and `Claude-Scalable Calendar App Development Plan.pdf` to understand project vision, requirements, and development roadmap.
*   **Refactored Task Management:**
    *   Moved `taskController.js`, `taskRoutes.js`, `taskService.js`, and `taskRepository.js` from `user-service` to `event-service`.
    *   Updated `api-gateway` resolvers and datasources to reflect the task management move to `event-service`.
    *   Updated `user-service/src/index.js` and `event-service/src/index.js` to correctly include/exclude task routes.
*   **Implemented Notification Service:**
    *   Created the complete directory structure for `notification-service`.
    *   Created `package.json` and `.env.example` for `notification-service`.
    *   Implemented `src/index.js` (main application entry point).
    *   Implemented GraphQL schema (`typeDefs.js`, `resolvers/index.js`, `schema/index.js`).
    *   Implemented Mongoose models (`notification.js`, `template.js`, `preference.js`).
    *   Implemented controllers (`notification.js`, `scheduler.js`).
    *   Implemented channel handlers (`email.js`, `push.js`, `sms.js`, `inApp.js`).
    *   Implemented services (`queueService.js`, `eventListener.js`, `deliveryTracker.js`).
    *   Implemented API routes (`api/routes/notification.js`).
    *   Implemented middleware (`api/middleware/auth.js`, `api/middleware/validation.js`).
    *   Implemented utilities (`utils/logger.js`, `utils/errorHandler.js`).
    *   Implemented configuration files (`config/index.js`, `config/db.js`).

### 4.2. Current Task
*   **Running Tests and Debugging:** Currently working on resolving test failures across `user-service`, `event-service`, and `notification-service`. This involves:
    *   Debugging `SyntaxError` and `TypeError` in `event-service` tests.
    *   Addressing `401 Unauthorized` errors in `event-service` integration tests by mocking `jsonwebtoken.verify`.
    *   Resolving `Cannot find module` errors in `notification-service` tests by configuring `moduleNameMapper` in `jest.config.js`.

### 4.3. Pending Tasks
*   Complete all remaining test fixes and ensure all services pass their respective test suites.
*   Implement the remaining features outlined in `Claude-Scalable Calendar App Development Plan.pdf`.
*   Implement the `Search Service` and `Synchronization Service`.
*   Develop the Frontend application.
*   Set up CI/CD pipelines and deployment automation.
*   Implement comprehensive monitoring and observability.
*   Address any performance optimizations and scalability improvements.
*   Further refine documentation as development progresses.

## 5. Getting Started

### 5.1. Prerequisites
*   Node.js (v18 or later)
*   npm / yarn
*   Docker and Docker Compose (for running databases like PostgreSQL, MongoDB, Redis)
*   A running PostgreSQL, Redis, and MongoDB instance.

### 5.2. Installation & Setup
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd calendar-app
    ```
2.  **Install dependencies for all services:**
    ```bash
    cd api-gateway && npm install && cd ..
    cd auth-service && npm install && cd ..
    cd calendar-service && npm install && cd ..
    cd event-service && npm install && cd ..
    cd notification-service && npm install && cd ..
    cd shared && npm install && cd ..
    cd frontend && npm install && cd ..
    ```
3.  **Configure Environment Variables:**
    Each service contains a `.env.example` file. Copy it to `.env` and update the configuration, especially database connections and service URLs.
    ```bash
    cp api-gateway/.env.example api-gateway/.env
    cp auth-service/.env.example auth-service/.env
    cp calendar-service/.env.example calendar-service/.env
    cp event-service/.env.example event-service/.env
    cp notification-service/.env.example notification-service/.env
    # Update the .env files with your local database credentials and other settings.
    ```
4.  **Run Database Migrations and Seeds:**
    All database operations should be run from the `shared` directory.
    ```bash
    cd shared
    # Run migrations to set up the schema
    npm run migrate:dev
    # (Optional) Seed the database with initial data
    npm run seed:dev
    cd ..
    ```

### 5.3. Running the Application
Start each service in a separate terminal window.
```bash
# Terminal 1: API Gateway
cd api-gateway && npm run dev

# Terminal 2: Auth Service
cd auth-service && npm run dev

# Terminal 3: User Service
cd user-service && npm run dev

# Terminal 4: Calendar Service
cd calendar-service && npm run dev

# Terminal 5: Event Service
cd event-service && npm run dev

# Terminal 6: Notification Service
cd notification-service && npm run dev

# Terminal 7: Frontend
cd frontend && npm run dev
```
The frontend will be accessible at `http://localhost:5173` (or as configured in Vite), and the GraphQL API gateway at `http://localhost:4000`.

### 5.4. Running Tests
To run tests for individual services:
*   **User Service:** `cd user-service && npm test`
*   **Event Service:** `cd event-service && npm test`
*   **Notification Service:** `cd notification-service && npm test`
*   **Frontend:** `cd frontend && npm test`

## 6. Contributing
(This section will be expanded later with detailed contributing guidelines, code style, and pull request process.)

## 7. License
(This section will specify the project's license.)
