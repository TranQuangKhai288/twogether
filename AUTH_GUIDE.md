# JWT Authentication Middleware

## 📋 Tổng quan

Hệ thống authentication đã được triển khai sử dụng JWT (JSON Web Token) với các middleware bảo mật:

## 🔐 Các Middleware

### 1. `protect` - Authentication bắt buộc
```typescript
import { protect } from '@/middleware/auth.js';

// Áp dụng cho route cần authentication
router.get('/profile', protect, userController.getProfile);
```

### 2. `optionalAuth` - Authentication tùy chọn
```typescript
import { optionalAuth } from '@/middleware/auth.js';

// Route có thể hoạt động với hoặc không có user đăng nhập
router.get('/public-data', optionalAuth, controller.getPublicData);
```

### 3. `restrictTo` - Phân quyền theo role (đã chuẩn bị)
```typescript
import { protect, restrictTo } from '@/middleware/auth.js';

// Chỉ admin mới truy cập được (cần thêm role field vào User model)
router.delete('/users/:id', protect, restrictTo('admin'), userController.deleteUser);
```

## 🚀 Cách sử dụng

### 1. Login và nhận token:
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Sử dụng token trong requests:

#### Option 1: Authorization Header (Recommended)
```bash
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Option 2: Cookie (tự động set khi login)
```bash
GET /api/users/profile
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📝 Protected Routes

### User Profile Routes:
- `GET /api/users/profile` - Lấy thông tin profile hiện tại
- `PUT /api/users/profile` - Cập nhật profile hiện tại

### All User Routes (Admin only):
- `GET /api/users` - Lấy tất cả users
- `GET /api/users/:id` - Lấy user theo ID
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

## 🔍 Request Object Enhancement

Khi sử dụng `protect` middleware, `req.user` sẽ chứa thông tin user:

```typescript
export const someProtectedController = async (req: Request, res: Response) => {
  const currentUser = req.user; // IUser object
  console.log(currentUser.email); // Email của user đang login
  console.log(currentUser._id); // ID của user
};
```

## 🛡️ Security Features

1. **Token Verification**: Kiểm tra chữ ký JWT
2. **Token Expiration**: Tự động reject token hết hạn
3. **User Existence Check**: Đảm bảo user vẫn tồn tại trong DB
4. **Password Change Detection**: (Có thể thêm) Vô hiệu hóa token khi user đổi password
5. **Secure Cookie**: HttpOnly, Secure trong production

## 🚨 Error Handling

Middleware sẽ trả về các lỗi phù hợp:

- `401 Unauthorized`: Không có token hoặc token không hợp lệ
- `401 Token Expired`: Token đã hết hạn
- `401 Invalid Token`: Token bị sai format
- `401 User Not Found`: User không còn tồn tại

## 📋 TODO cho tương lai

1. **Refresh Token**: Implement refresh token mechanism
2. **Role-based Access**: Thêm role field vào User model
3. **Password Change Tracking**: Thêm passwordChangedAt field
4. **Device Management**: Track user devices/sessions
5. **Rate Limiting**: Limit failed login attempts