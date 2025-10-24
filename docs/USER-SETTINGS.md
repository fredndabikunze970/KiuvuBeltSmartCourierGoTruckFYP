# User Settings Documentation

## Overview

This document describes the Profile Settings and Account Settings features that allow users (both agents and admins) to manage their personal information and account security.

## Features

### 1. Profile Settings (`/dashboard/profile`)

Allows users to manage their personal information:

- **View Profile Information**
  - User ID (read-only)
  - Email (read-only, change via Account Settings)
  - Full Name (editable)
  - Phone Number (editable)
  - Role (read-only)
  - Assigned Branch (editable)
  - Account Status
  - Member Since date

- **Edit Capabilities**
  - Update full name
  - Update phone number
  - Change assigned branch
  - View current branch information

### 2. Account Settings (`/dashboard/account`)

Manages account security and login credentials:

- **Email Management**
  - View current email
  - Update to new email
  - Email validation
  - Duplicate email check

- **Password Management**
  - Change password
  - Current password verification
  - New password confirmation
  - Password strength requirements (min 6 characters)
  - Show/hide password toggles

- **Security Tips**
  - Best practices for account security
  - Password recommendations

## API Endpoints

### Profile Management

#### GET `/api/user/profile`
Get current user profile information.

**Response:**
```json
{
  "user": {
    "user_id": "USR123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+250788123456",
    "role": "agent",
    "is_active": true,
    "branch_id": "BR001",
    "branch_name": "Kigali Main Branch",
    "branch_address": "Kigali, Rwanda",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/api/user/profile`
Update user profile information.

**Request:**
```json
{
  "full_name": "John Doe",
  "phone": "+250788123456",
  "branch_id": "BR001"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "user_id": "USR123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+250788123456",
    "role": "agent",
    "branch_id": "BR001"
  }
}
```

### Password Management

#### PUT `/api/user/password`
Change user password.

**Request:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword",
  "confirm_password": "newpassword"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

**Validation:**
- All fields required
- New passwords must match
- Password min length: 6 characters
- Current password must be correct

### Email Management

#### PUT `/api/user/email`
Update user email address.

**Request:**
```json
{
  "new_email": "newemail@example.com"
}
```

**Response:**
```json
{
  "message": "Email updated successfully",
  "user": {
    "user_id": "USR123",
    "email": "newemail@example.com",
    "full_name": "John Doe"
  }
}
```

**Validation:**
- Valid email format required
- Email must be unique (not already in use)

## User Interface

### Design Principles

1. **Professional Appearance**
   - Clean, modern design
   - Consistent color scheme (blue/purple gradients)
   - Clear visual hierarchy
   - Responsive layout

2. **Color Consistency**
   - Primary gradient: `from-blue-600 to-purple-600`
   - Role badges: Blue for all roles
   - Active status: Green
   - Muted text: Gray
   - Error states: Red

3. **User Experience**
   - Clear section separation
   - Helpful tooltips and descriptions
   - Inline validation
   - Loading states
   - Success/error feedback via toasts
   - Reset functionality

### Profile Settings UI

- **Header Section**
  - Large avatar with gradient background
  - User name and email
  - Role and status badges

- **Form Fields**
  - Two-column grid layout (responsive)
  - Labeled inputs with placeholders
  - Read-only fields (grayed out)
  - Required field indicators
  - Branch selector dropdown

- **Actions**
  - Reset button (restores original values)
  - Save Changes button with loading state

### Account Settings UI

- **Email Section**
  - Card with icon header
  - Current email display
  - New email input
  - Update button

- **Password Section**
  - Card with icon header
  - Three password fields (current, new, confirm)
  - Show/hide password toggles
  - Password requirements hint
  - Change password button

- **Security Tips**
  - Information card with best practices
  - Shield icon
  - Bulleted list of recommendations

## Navigation

Users can access these pages from the user dropdown menu:

1. Click on user avatar in top-right corner
2. Select "Profile Settings" or "Account Settings"

## Security Features

1. **Authentication Required**
   - All endpoints use `requireAuth` middleware
   - Only authenticated users can access

2. **Authorization**
   - Users can only view/edit their own profile
   - User ID verified from JWT token

3. **Password Security**
   - Passwords hashed with bcrypt (10 rounds)
   - Current password verification required
   - Confirmation required for new password

4. **Data Validation**
   - Server-side validation for all inputs
   - Email format validation
   - Phone number format validation
   - Full name length requirements

## Role Support

Both features work for all user roles:
- ✅ **Admin** - Full access to all settings
- ✅ **Agent** - Full access to all settings
- ✅ **Receiver** - Full access to all settings (if applicable)

All users have the same capabilities for managing their own profile and account settings.

## Database Schema

Uses the `users` table:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('agent', 'admin', 'receiver')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  branch_id VARCHAR(50) REFERENCES branches(branch_id)
);
```

## Error Handling

All endpoints include comprehensive error handling:

- **400 Bad Request** - Invalid input data
- **401 Unauthorized** - Authentication failed
- **404 Not Found** - User not found
- **500 Internal Server Error** - Server errors

Errors are logged to console and returned as JSON responses.

## Testing

To test the features:

1. **Profile Settings**
   - Login as any user
   - Navigate to Profile Settings
   - Update full name and phone
   - Change branch assignment
   - Verify changes are saved

2. **Account Settings**
   - Navigate to Account Settings
   - Try changing email (verify uniqueness check)
   - Change password (verify current password check)
   - Verify all validation rules work

3. **Navigation**
   - Verify dropdown links work correctly
   - Check responsive design on mobile
   - Test loading states
   - Verify toast notifications

## Future Enhancements

Potential improvements:
- Profile picture upload
- Two-factor authentication
- Activity log/audit trail
- Email verification for email changes
- Password reset via email
- Account deactivation option
- Preference settings (notifications, language, etc.)
