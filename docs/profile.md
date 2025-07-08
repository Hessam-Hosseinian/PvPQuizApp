# Profile Page Documentation

## 1. Overview

The Profile Page is a user-centric dashboard within the PvPQuizApp. It serves as a personal space for users to view their statistics, track their progress, manage their account details, and see their achievements. The page is designed to be both informative and engaging, providing a comprehensive summary of a user's journey in the application.

-   **Frontend Component:** `frontend/src/pages/Profile/ProfilePage.tsx`
-   **Primary Backend Routes:** `app/routes/users.py`, `app/routes/stats.py`

---

## 2. Features

The profile page is composed of several key sections, each providing specific functionality.

### 2.1. User Information Panel (Left Sidebar)

This section provides an at-a-glance summary of the user's identity and account status.

| Feature                  | Description                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Avatar**               | Displays the user's profile picture. Supports uploading new avatars (JPG, PNG, GIF, WebP, max 5MB) via drag-and-drop or file selection, and deleting the current avatar. |
| **User Details**         | Shows the user's `username`, `email`, and `role` (e.g., Administrator).                                                                                                 |
| **Leveling System**      | Displays the user's `current_level` and an XP bar showing their progress (`total_xp`) towards the next level.                                                             |
| **Account Information**  | Includes key data points like "Member Since" (`created_at`) and "Last Login" (`last_login`).                                                                            |
| **Password Management**  | A collapsible form allows users to change their password by providing their current and new passwords.                                                                  |

### 2.2. Main Content Area (Right Section)

This area is dedicated to detailed statistics, achievements, and game history.

#### 2.2.1. Core Statistics

A set of cards at the top displays primary performance metrics:
-   **Games Won**
-   **Games Lost**
-   **Total Games**
-   **Win Rate (%)**

#### 2.2.2. Additional Statistics

A secondary set of cards provides more detailed gameplay stats:
-   **Correct Answers**
-   **Total Answers**
-   **Accuracy Rate (%)**

#### 2.2.3. Achievements

-   **Earned Achievements**: A section showcasing all the achievements the user has unlocked (e.g., "Win 10 games," "70%+ win rate").
-   **Upcoming Achievements**: Displays achievements the user is close to earning, including a progress bar showing how close they are.

#### 2.2.4. Recent Games History

Lists the user's most recent games, showing the opponent, the result (Win/Loss), and when the game was played.

#### 2.2.5. Progress & Comparison

-   **Progress Trends**: Displays metrics like current and best win streaks.
-   **How You Compare**: Shows the user's rank compared to others in terms of win rate, level, games played, and accuracy. (Note: The data for comparison stats is currently mocked on the frontend).

### 2.3. Admin Panel

For users with the `admin` role, a dedicated `AdminPanel` component is rendered at the bottom of the page, providing access to administrative functionalities.

---

## 3. Backend API Endpoints

The Profile Page is powered by a set of RESTful endpoints.

| Method   | Endpoint                               | Controller                                         | Description                                                                                                                                        |
| -------- | -------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/users/profile`                       | `users.user_profile`                               | Fetches the complete profile data for the currently authenticated user.                                                                            |
| `GET`    | `/stats/user-winloss/{user_id}`        | `stats.get_user_winloss`                           | Retrieves detailed win/loss statistics, streaks, and answer counts for the specified user.                                                       |
| `GET`    | `/stats/recent-games`                  | `stats.get_recent_games`                           | Returns a list of the most recent games played by the user. **Note: The current implementation fetches global recent games, not user-specific ones.** |
| `POST`   | `/users/avatar`                        | `users.upload_avatar`                              | Handles multipart form data to upload a new avatar image. It updates the user's record and cleans up the old avatar file.                          |
| `DELETE` | `/users/avatar`                        | `users.delete_avatar`                              | Removes the user's current avatar from the database and the filesystem.                                                                          |
| `POST`   | `/users/{user_id}/change-password`     | **N/A**                                            | **Discrepancy:** The frontend `api.ts` file defines this endpoint for changing passwords. However, it is not implemented in the backend routes. The intended logic might have been to use the `PUT /users/{user_id}` endpoint. |
