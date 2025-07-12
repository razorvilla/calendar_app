# Calendar Service UAT Test Plan

This document outlines the User Acceptance Testing (UAT) plan for the Calendar Service. These tests are designed to be executed manually by a user to verify that the service meets the specified requirements and functions as expected from an end-user perspective.

**Prerequisites:**
*   The `calendar-service` must be running and accessible.
*   A PostgreSQL database must be running and configured for the `calendar-service`.
*   The `auth-service` and `user-service` should also be running and accessible, as the calendar service relies on them for user authentication and user data.
*   A tool for making HTTP requests (e.g., Postman, Insomnia, `curl`).
*   Access to the `notification-service` logs or a configured email/SMS client to verify notifications.

**Authentication:**
For all authenticated endpoints, you will need a valid JWT token. You can obtain this by registering and logging in via the `auth-service`.

**Base URL:** `http://localhost:3003` (or your configured port)

---

## Test Cases

### 1. Calendar Management

**Test Case ID:** CS-UAT-CAL-001
**Test Case Name:** Create a New Calendar
**Description:** Verify that a user can successfully create a new calendar.
**Steps:**
1.  Obtain a valid JWT token for a user.
2.  Send a `POST` request to `/calendars` with the following body:
    ```json
    {
        "name": "My Personal Calendar",
        "description": "Events for my personal life",
        "color": "#FF5733",
        "isDefault": true,
        "isVisible": true
    }
    ```
3.  Include the JWT token in the `Authorization: Bearer <token>` header.
**Expected Result:**
*   HTTP Status Code: `201 Created`
*   Response Body: Contains the newly created calendar object with an `id`, `owner_id` matching the authenticated user's ID, and the provided details.

**Test Case ID:** CS-UAT-CAL-002
**Test Case Name:** Get All Calendars
**Description:** Verify that a user can retrieve all their owned and shared calendars.
**Steps:**
1.  Ensure you have at least one owned calendar and one shared calendar (from another user).
2.  Obtain a valid JWT token for the user.
3.  Send a `GET` request to `/calendars`.
4.  Include the JWT token in the `Authorization: Bearer <token>` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: An array of calendar objects, including both owned and accepted shared calendars.

**Test Case ID:** CS-UAT-CAL-003
**Test Case Name:** Get Specific Calendar by ID
**Description:** Verify that a user can retrieve a specific calendar by its ID if they have access.
**Steps:**
1.  Obtain the ID of an owned calendar or an accepted shared calendar.
2.  Obtain a valid JWT token for the user.
3.  Send a `GET` request to `/calendars/{calendarId}` (replace `{calendarId}` with the actual ID).
4.  Include the JWT token in the `Authorization: Bearer <token>` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: The calendar object matching the provided ID.

**Test Case ID:** CS-UAT-CAL-004
**Test Case Name:** Update Calendar Details
**Description:** Verify that a user can update details of an owned calendar.
**Steps:**
1.  Obtain the ID of an owned calendar.
2.  Obtain a valid JWT token for the owner.
3.  Send a `PATCH` request to `/calendars/{calendarId}` with the following body:
    ```json
    {
        "name": "Updated Personal Calendar",
        "color": "#33FF57"
    }
    ```
4.  Include the JWT token in the `Authorization: Bearer <token>` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: The updated calendar object with the new name and color.

**Test Case ID:** CS-UAT-CAL-005
**Test Case Name:** Delete Calendar
**Description:** Verify that a user can delete an owned calendar.
**Steps:**
1.  Obtain the ID of an owned calendar (preferably one created for testing).
2.  Obtain a valid JWT token for the owner.
3.  Send a `DELETE` request to `/calendars/{calendarId}`.
4.  Include the JWT token in the `Authorization: Bearer <token>` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: `{"message": "Calendar deleted successfully"}`
*   Verify that attempting to `GET` the deleted calendar returns `404 Not Found`.

### 2. Calendar Sharing

**Test Case ID:** CS-UAT-SHARE-001
**Test Case Name:** Share Calendar (New Invitation)
**Description:** Verify that a calendar owner can share a calendar with another user (who may or may not exist in the system) and an invitation email is sent if the user does not exist.
**Steps:**
1.  Create two users (User A and User B) if they don't exist. Obtain JWT tokens for both.
2.  User A creates a calendar.
3.  User A sends a `POST` request to `/calendars/{calendarId}/share` with the following body:
    ```json
    {
        "email": "userb@example.com",
        "permission": "view"
    }
    ```
4.  Include User A's JWT token in the `Authorization` header.
**Expected Result:**
*   HTTP Status Code: `201 Created`
*   Response Body: Contains the `calendar_share` object.
*   **If User B does not exist in the system:** Verify that an email invitation is sent to `userb@example.com` (check `notification-service` logs or actual email inbox).

**Test Case ID:** CS-UAT-SHARE-002
**Test Case Name:** Accept Share Invitation
**Description:** Verify that a user can accept a calendar share invitation using the invite token.
**Steps:**
1.  Perform CS-UAT-SHARE-001 to get an `invite_token`.
2.  Send a `GET` request to `/calendars/share/accept/{inviteToken}` (no authentication required).
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: `{"message": "Calendar share accepted successfully", "share": {...}}`.
*   Verify that User B can now see the shared calendar when fetching their calendars (CS-UAT-CAL-002).

**Test Case ID:** CS-UAT-SHARE-003
**Test Case Name:** Get Calendar Shares
**Description:** Verify that a calendar owner can view all shares for their calendar.
**Steps:**
1.  User A creates a calendar and shares it with User B (CS-UAT-SHARE-001).
2.  User A sends a `GET` request to `/calendars/{calendarId}/shares`.
3.  Include User A's JWT token in the `Authorization` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: An array of `calendar_share` objects for the specified calendar.

**Test Case ID:** CS-UAT-SHARE-004
**Test Case Name:** Update Calendar Share Permission
**Description:** Verify that a calendar owner can update the permission of an existing share.
**Steps:**
1.  User A creates a calendar and shares it with User B with 'view' permission (CS-UAT-SHARE-001).
2.  Obtain the `shareId` from the previous step.
3.  User A sends a `PATCH` request to `/calendars/{calendarId}/shares/{shareId}` with the following body:
    ```json
    {
        "permission": "edit"
    }
    ```
4.  Include User A's JWT token in the `Authorization` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: The updated `calendar_share` object with `permission: "edit"`.

**Test Case ID:** CS-UAT-SHARE-005
**Test Case Name:** Resend Share Invitation
**Description:** Verify that a calendar owner can resend a pending share invitation.
**Steps:**
1.  User A creates a calendar and shares it with a non-existent email (or an existing user who hasn't accepted yet) to get a `pending` share status.
2.  Obtain the `shareId` for this pending invitation.
3.  User A sends a `POST` request to `/calendars/{calendarId}/shares/{shareId}/resend`.
4.  Include User A's JWT token in the `Authorization` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: `{"message": "Invitation resent successfully"}`.
*   Verify that another email invitation is sent (check `notification-service` logs or actual email inbox).

**Test Case ID:** CS-UAT-SHARE-006
**Test Case Name:** Delete Calendar Share
**Description:** Verify that a calendar owner can delete a calendar share.
**Steps:**
1.  User A creates a calendar and shares it with User B (CS-UAT-SHARE-001).
2.  Obtain the `shareId`.
3.  User A sends a `DELETE` request to `/calendars/{calendarId}/shares/{shareId}`.
4.  Include User A's JWT token in the `Authorization` header.
**Expected Result:**
*   HTTP Status Code: `200 OK`
*   Response Body: `{"message": "Share deleted successfully"}`.
*   Verify that User B can no longer see the shared calendar when fetching their calendars (CS-UAT-CAL-002).

---

**Note:** This UAT plan focuses on the core functionalities of the Calendar Service. Additional tests for edge cases, error handling, and performance should be considered for a complete testing cycle.