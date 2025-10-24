# Package Update System Documentation

## Overview

Professional package management system that allows Admins and Agents to update package information with role-based permissions.

## URL

```
/dashboard/packages/[packageId]/update
```

Example: `/dashboard/packages/KBE191588GZ0/update`

## Features

### 1. **Complete Package Information Display**

All current package data is fetched from the database and displayed:

- Package ID
- Tracking Number
- Current Status
- Sender Information (name, phone, address)
- Receiver Information (name, phone, address)
- Package Details (weight, dimensions, description)
- Route Information (origin/destination branches)
- Assignment Details (vehicle, driver)
- Last Updated timestamp

### 2. **Updateable Fields**

#### Status & Assignment
- **Package Status** - Change between: registered, picked_up, in_transit, out_for_delivery, arrived, delivered, cancelled
- **Assigned Vehicle** - Select from available cars
- **Assigned Driver** - Select from available drivers/agents
- **Update Notes** - Add notes about the update

#### Sender Information
- Full name
- Phone number
- Complete address

#### Receiver Information
- Full name
- Phone number
- Complete address

#### Package Details
- Weight (in kg)
- Dimensions
- Description
- Special instructions

#### Route Information
- Origin branch (dropdown)
- Destination branch (dropdown)

### 3. **Role-Based Permissions**

**Admin Users:**
- Can update ANY package
- Full access to all fields
- No restrictions

**Agent Users:**
- Can only update packages from their assigned branch
- Full access to all fields for their packages
- Permission check enforced on API level

**Receiver Users:**
- No access to update page (view-only elsewhere)

### 4. **Automatic Tracking**

When a package is updated:
- A tracking entry is automatically created
- Records the new status
- Logs update notes
- Tracks who made the update (user_id)
- Timestamps the change

## API Endpoint

### PUT `/api/packages/[packageId]/update`

Updates package information.

**Request Body:**
```json
{
  "status": "in_transit",
  "notes": "Package picked up from warehouse",
  "sender_name": "John Doe",
  "sender_phone": "+250788123456",
  "sender_address": "Kigali, Rwanda",
  "receiver_name": "Jane Smith",
  "receiver_phone": "+250788654321",
  "receiver_address": "Kigali, Rwanda",
  "weight_kg": 5.5,
  "dimensions": "50x40x30 cm",
  "description": "Electronics",
  "special_instructions": "Handle with care",
  "origin_branch": "BR001",
  "destination_branch": "BR002",
  "assigned_car": "CAR001",
  "assigned_driver": "USR001"
}
```

**Response:**
```json
{
  "message": "Package updated successfully",
  "package": {
    "package_id": "KBE191588GZ0",
    "status": "in_transit",
    "sender_name": "John Doe",
    ...
  }
}
```

**Error Responses:**

- **404** - Package not found
- **403** - Permission denied (agent updating package from different branch)
- **500** - Server error

## User Interface

### Design Features

1. **Professional Layout**
   - Clean card-based design
   - Gradient header (blue to purple)
   - Organized sections with icons
   - Responsive grid layout
   - Consistent color scheme

2. **Information Display**
   - Current package info card at top
   - Shows: Package ID, Status, Origin, Destination
   - Color-coded icons for each field
   - Last updated timestamp

3. **Form Sections**
   - **Status & Assignment** - Purple icon
   - **Sender Information** - User icon
   - **Receiver Information** - User icon
   - **Package Details** - Package icon
   - **Route Information** - Map pin icon

4. **Interactive Elements**
   - Dropdowns for status, vehicles, drivers, branches
   - Text inputs with placeholders
   - Textareas for longer content
   - Required field indicators (*)
   - Loading states on submit
   - Back button to packages list

### Color Scheme

- **Blue**: Package ID, primary actions
- **Purple**: Status, secondary actions
- **Green**: Origin location
- **Orange**: Destination location
- **Muted**: Secondary text, borders

## Database Integration

### Tables Used

**packages** - Main package table
- All package fields are updateable
- `updated_at` timestamp automatically set

**tracking** - Tracking history
- Auto-creates entry on status/note changes
- Records:
  - `package_id`
  - `status`
  - `notes`
  - `updated_by` (user_id from JWT)
  - `created_at` (NOW())

**branches** - For route selection
- Fetched for origin/destination dropdowns

**cars** - For vehicle assignment
- Shows: plate_number, model, status

**drivers/users** - For driver assignment
- Shows: full_name, phone
- Filtered by role = 'agent'

## Validation

### Client-Side
- Required fields marked with *
- Number inputs for weight
- Phone number format hints
- Textarea rows set appropriately

### Server-Side
- Package existence check
- Permission verification
- Dynamic field updates (only provided fields)
- SQL injection protection
- Error handling with descriptive messages

## Security

1. **Authentication Required**
   - Uses `requireAuth` middleware
   - JWT token verification

2. **Authorization**
   - Admin: Full access
   - Agent: Own branch only
   - Checked on every request

3. **Data Protection**
   - SQL parameterization
   - Input sanitization
   - Error message sanitization

## Usage Flow

1. User navigates to package list
2. Clicks "Edit" or "Update" on a package
3. System loads `/dashboard/packages/[packageId]/update`
4. Page fetches:
   - Package data
   - Available branches
   - Available cars
   - Available drivers
   - User role for permissions
5. User edits fields
6. User clicks "Update Package"
7. System validates and saves
8. Tracking entry created automatically
9. Success message shown
10. Package data refreshed

## Features by User Type

### Admin Dashboard View
- ✅ Update any package
- ✅ Change status
- ✅ Reassign vehicle/driver
- ✅ Modify sender/receiver info
- ✅ Update route (branches)
- ✅ Add update notes
- ✅ Full edit access

### Agent Dashboard View
- ✅ Update packages from their branch
- ✅ Change status
- ✅ Reassign vehicle/driver
- ✅ Modify sender/receiver info
- ✅ Update route (within permissions)
- ✅ Add update notes
- ❌ Cannot update packages from other branches

## Testing

To test the system:

1. **As Admin:**
   ```
   - Login as admin
   - Navigate to /dashboard/packages
   - Click update on any package
   - Verify all fields are editable
   - Change status and add notes
   - Verify tracking entry created
   ```

2. **As Agent:**
   ```
   - Login as agent
   - Navigate to /dashboard/packages
   - Click update on package from your branch
   - Verify you can edit
   - Try updating package from different branch
   - Verify permission denied (403)
   ```

3. **Data Persistence:**
   ```
   - Update a package
   - Navigate away
   - Come back to update page
   - Verify changes were saved
   - Check tracking table for entry
   ```

## Error Handling

All errors are handled gracefully:

- Network errors: Toast notification
- Permission errors: Descriptive message
- Validation errors: Field-level feedback
- Server errors: User-friendly message
- Loading states: Spinner indicators

## Performance

- Parallel data fetching (Promise.all)
- Optimistic UI updates
- Efficient re-renders
- Minimal API calls
- Cached dropdown data

## Future Enhancements

Potential improvements:
- Bulk package updates
- Package duplication
- Change history viewer
- Photo/document attachments
- Signature capture
- Real-time updates (WebSocket)
- Package analytics
- Export package data
- Print shipping labels
- QR code generation
