# User Controller API Documentation

## 📋 Tổng quan

UserController cung cấp đầy đủ các API endpoints để quản lý users trong hệ thống Two Gether.

## 🔐 Authentication

Tất cả routes đều yêu cầu JWT token trong header:
```
Authorization: Bearer <jwt_token>
```

## 📊 Endpoints

### 1. Profile Management

#### Get Current User Profile
```http
GET /api/users/profile
```
**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "gender": "male",
    "birthday": "1990-01-01T00:00:00.000Z",
    "avatarUrl": "https://example.com/avatar.jpg",
    "coupleId": "couple_id",
    "preferences": {
      "notifications": true,
      "darkMode": false
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### Update Current User Profile
```http
PUT /api/users/profile
Content-Type: application/json

{
  "name": "Jane Doe",
  "gender": "female",
  "birthday": "1992-05-15",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

#### Change Password
```http
POST /api/users/change-password
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456",
  "confirmPassword": "newpassword456"
}
```

#### Update Preferences
```http
PUT /api/users/preferences
Content-Type: application/json

{
  "preferences": {
    "notifications": false,
    "darkMode": true
  }
}
```

### 2. Couple Management

#### Get Couple Information
```http
GET /api/users/couple
```

### 3. User Search

#### Search Users
```http
GET /api/users/search?q=john&page=1&limit=10
```

### 4. Admin Operations

#### Get All Users (Paginated)
```http
GET /api/users?page=1&limit=10&sortBy=createdAt&sortOrder=desc&search=john
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Field to sort by (default: createdAt)
- `sortOrder` (optional): Sort order asc/desc (default: desc)
- `search` (optional): Search term for name/email

#### Get User by ID
```http
GET /api/users/:id
```

#### Update User (Admin)
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "gender": "other"
}
```

#### Delete User (Admin)
```http
DELETE /api/users/:id
```

## 🔒 Security Features

### 1. Input Validation
- **Profile Updates**: Name (1-50 chars), valid gender, future birthday check
- **Password Change**: Min 6 chars, letter+number requirement, confirmation match
- **Preferences**: Boolean validation for settings

### 2. Data Protection
- Password hashes never returned in responses
- Sensitive fields protected from updates
- Automatic user population for couple info

### 3. Error Handling
- Detailed validation error messages
- Proper HTTP status codes
- AppError integration for consistent error format

## 📝 Validation Rules

### Profile Update
```typescript
{
  name: "1-50 characters",
  gender: "male | female | other",
  birthday: "Valid date, not in future",
  avatarUrl: "Valid URL format"
}
```

### Password Change
```typescript
{
  currentPassword: "Required",
  newPassword: "Min 6 chars, letter+number",
  confirmPassword: "Must match newPassword"
}
```

### Preferences
```typescript
{
  preferences: {
    notifications: "boolean",
    darkMode: "boolean"
  }
}
```

## 🚨 Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## 📋 Business Logic

### User Deletion
- Automatically handles couple relationship cleanup
- Removes user from couple's users array
- Deletes couple if no users remain
- Updates partner's coupleId to null

### Couple Integration
- Profile includes couple information
- Couple status checking
- Partner relationship management

### Search Functionality
- Case-insensitive search
- Name and email fields
- Pagination support
- Relevance sorting

## 🔄 Data Flow

1. **Authentication**: JWT token verification via protect middleware
2. **Validation**: Input validation via express-validator
3. **Business Logic**: UserService handles database operations
4. **Response**: Standardized API response format
5. **Error Handling**: Consistent error propagation

## 📊 Performance Considerations

- Database queries optimized with proper indexing
- Pagination to limit data transfer
- Password hash excluded from responses
- Efficient search with MongoDB regex
- Populate couple data only when needed