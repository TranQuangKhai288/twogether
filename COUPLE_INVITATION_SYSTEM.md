# Couple Invitation System

## 📋 Overview

The Two Gether app now uses an **invitation-based system** for creating couples instead of direct couple creation. This ensures both parties consent before forming a couple relationship.

## 🔄 New Flow

### 1. **Send Invitation**

```http
POST /api/couple-invitations
Content-Type: application/json
Authorization: Bearer <token>

{
  "receiverEmail": "partner@example.com",
  "anniversaryDate": "2023-01-01",
  "message": "Let's start our journey together! ❤️"
}
```

### 2. **View Received Invitations**

```http
GET /api/couple-invitations/received
Authorization: Bearer <token>
```

### 3. **Accept Invitation** (Creates Couple)

```http
POST /api/couple-invitations/:id/accept
Authorization: Bearer <token>
```

### 4. **Reject Invitation**

```http
POST /api/couple-invitations/:id/reject
Authorization: Bearer <token>
```

## 🚫 Deprecated Endpoints

- ❌ `POST /api/couples` - Returns 410 Gone with instructions

## 📊 Invitation States

| Status     | Description                              |
| ---------- | ---------------------------------------- |
| `pending`  | Waiting for receiver's response          |
| `accepted` | Invitation accepted - couple created     |
| `rejected` | Invitation rejected by receiver          |
| `expired`  | Invitation expired (7 days) or cancelled |

## 🛡️ Business Rules

### **Sending Invitations:**

- ✅ User must not be in a couple
- ✅ Receiver must exist and not be in a couple
- ✅ No duplicate pending invitations between same users
- ✅ Cannot invite yourself
- ✅ Anniversary date cannot be in future

### **Accepting Invitations:**

- ✅ Only receiver can accept
- ✅ Invitation must be pending and not expired
- ✅ Neither user can be in a couple at acceptance time
- ✅ Auto-cancels all other pending invitations for both users

### **Automatic Cleanup:**

- ✅ Invitations expire after 7 days
- ✅ Expired invitations are automatically marked as `expired`
- ✅ When couple is formed, all other invitations are cancelled

## 📁 New Database Schema

### `CoupleInvitation` Model

```typescript
interface ICoupleInvitation {
  sender: ObjectId; // User who sent invitation
  receiver: ObjectId; // User who received invitation
  anniversaryDate: Date; // Proposed anniversary date
  message?: string; // Optional personal message
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: Date; // Auto-expiry date (7 days)
  createdAt: Date;
  updatedAt: Date;
}
```

## 📖 API Endpoints

### **For Users:**

| Method   | Endpoint                             | Description              |
| -------- | ------------------------------------ | ------------------------ |
| `POST`   | `/api/couple-invitations`            | Send invitation          |
| `GET`    | `/api/couple-invitations/received`   | Get received invitations |
| `GET`    | `/api/couple-invitations/sent`       | Get sent invitations     |
| `POST`   | `/api/couple-invitations/:id/accept` | Accept invitation        |
| `POST`   | `/api/couple-invitations/:id/reject` | Reject invitation        |
| `DELETE` | `/api/couple-invitations/:id`        | Cancel sent invitation   |
| `GET`    | `/api/couple-invitations/:id`        | Get invitation details   |

### **For Admins:**

| Method | Endpoint                              | Description           |
| ------ | ------------------------------------- | --------------------- |
| `GET`  | `/api/couple-invitations/admin/stats` | Invitation statistics |

## 💡 Usage Examples

### **1. Send Invitation**

```javascript
const response = await fetch("/api/couple-invitations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  },
  body: JSON.stringify({
    receiverEmail: "love@example.com",
    anniversaryDate: "2024-02-14",
    message: "Will you be my couple partner? 💕",
  }),
});
```

### **2. Check Received Invitations**

```javascript
const response = await fetch("/api/couple-invitations/received", {
  headers: { Authorization: "Bearer " + token },
});

const { data: invitations } = await response.json();
```

### **3. Accept Invitation**

```javascript
const response = await fetch(`/api/couple-invitations/${invitationId}/accept`, {
  method: "POST",
  headers: { Authorization: "Bearer " + token },
});

const { data: couple } = await response.json();
// Couple is now created!
```

## 🔄 Migration Notes

### **Before (Direct Creation):**

```javascript
// OLD - No longer works
POST /api/couples
{
  "partnerEmail": "partner@example.com",
  "anniversaryDate": "2024-01-01"
}
```

### **After (Invitation System):**

```javascript
// NEW - Two-step process
// Step 1: Send invitation
POST /api/couple-invitations
{
  "receiverEmail": "partner@example.com",
  "anniversaryDate": "2024-01-01",
  "message": "Optional message"
}

// Step 2: Partner accepts
POST /api/couple-invitations/:id/accept
```

## ⚡ Benefits

1. **Consent**: Both parties must agree before couple formation
2. **Security**: Prevents unauthorized couple creation
3. **Flexibility**: Receivers can review before accepting
4. **Audit Trail**: Complete history of invitation process
5. **Expiration**: Automatic cleanup of old invitations
6. **Messaging**: Personal messages for context

## 🧪 Testing

Use these test scenarios:

1. **Happy Path**: Send → Receive → Accept → Couple Created
2. **Rejection**: Send → Receive → Reject
3. **Expiration**: Send → Wait 7 days → Auto-expire
4. **Validation**: Try sending to existing couple member
5. **Duplicates**: Try sending multiple invitations to same person
6. **Self-invite**: Try inviting yourself (should fail)

---

**The invitation system provides a more user-friendly and secure way to form couples! 🎉**
