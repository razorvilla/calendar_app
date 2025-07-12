# Calendar App

This is a comprehensive, feature-rich calendar application built with a modern microservices architecture. It provides a full suite of calendar functionalities, including user management, multi-calendar support, event creation, sharing, and a robust notification system.

For detailed information on the project's architecture, design, implementation, and development status, please refer to the [Project Documentation](PROJECT_DOCUMENTATION.md).

## Project Structure

```
/
├── api-gateway/         # GraphQL gateway, aggregates backend services
├── auth-service/        # Handles user authentication and token management
├── calendar-service/    # Manages calendars and sharing
├── event-service/       # Manages events, attendees, recurrence, and tasks
├── frontend/            # React-based single-page application
├── notification-service/  # Handles all user notifications (email, push, SMS)
├── shared/              # Shared database migrations, seeds, and utilities
└── user-service/        # Manages user profiles and preferences
```

## Getting Started

To set up the development environment and run the application, please refer to the [Getting Started](PROJECT_DOCUMENTATION.md#5-getting-started) section in the Project Documentation.

## Running Tests

For instructions on how to run tests for individual services, please refer to the [Running Tests](PROJECT_DOCUMENTATION.md#54-running-tests) section in the Project Documentation.