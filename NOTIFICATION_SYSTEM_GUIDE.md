# Hệ thống Notification Service - Two Gether

## Tổng quan

Hệ thống notification service được thiết kế để gửi thông báo cho người dùng khi có các sự kiện quan trọng như:

- Kỷ niệm sắp tới hoặc đến ngày
- Ghi chú nhắc nhở đến hạn
- Ngày quan trọng được đánh dấu

## Cấu trúc hệ thống

### 1. Model Note đã được cập nhật

```typescript
export enum NoteType {
  GENERAL = "general",
  REMINDER = "reminder",
  IMPORTANT = "important",
  ANNIVERSARY = "anniversary",
  DATE = "date",
  TODO = "todo",
}

interface INote {
  // ... các field cũ
  type: NoteType;
  reminderDate?: Date;
  notificationEnabled: boolean;
  notificationSent: boolean;
}
```

### 2. NotificationService

- **Chức năng chính**: Quản lý và gửi thông báo
- **Phương thức quan trọng**:
  - `checkAndSendAnniversaryReminders()`: Kiểm tra và gửi thông báo kỷ niệm
  - `checkAndSendNoteReminders()`: Kiểm tra và gửi thông báo ghi chú
  - `scheduleNotifications()`: Chạy tất cả kiểm tra thông báo
  - `updateNoteNotificationSettings()`: Cập nhật cài đặt thông báo cho ghi chú

### 3. NotificationController

- **API endpoints** để quản lý thông báo:
  - `GET /api/notifications/couples/:coupleId/pending`: Lấy thông báo chờ
  - `PUT /api/notifications/notes/:noteId/settings`: Cập nhật setting thông báo
  - `POST /api/notifications/trigger`: Kích hoạt kiểm tra thông báo (admin)
  - `GET /api/notifications/couples/:coupleId/history`: Lịch sử thông báo
  - `GET /api/notifications/couples/:coupleId/stats`: Thống kê thông báo

### 4. NotificationScheduler

- **Tự động chạy định kỳ**:
  - Mỗi giờ: Kiểm tra tổng quát
  - Mỗi 30 phút: Kiểm tra ghi chú nhắc nhở
  - Hàng ngày lúc 8h sáng: Kiểm tra kỷ niệm

## Cách sử dụng

### 1. Tạo ghi chú có thông báo

```typescript
const noteData = {
  coupleId: "couple_id",
  authorId: "user_id",
  title: "Nhắc nhở quan trọng",
  content: "Nhớ mua hoa cho bạn gái",
  type: NoteType.REMINDER,
  reminderDate: new Date("2024-01-15T09:00:00Z"),
  notificationEnabled: true,
};

await noteService.createNote(noteData);
```

### 2. Cập nhật cài đặt thông báo

```typescript
await noteService.updateNotificationSettings(noteId, userId, {
  notificationEnabled: true,
  reminderDate: new Date("2024-01-16T10:00:00Z"),
});
```

### 3. Lấy thông báo chờ

```javascript
// API call
GET /api/notifications/couples/{coupleId}/pending

// Response
{
  "success": true,
  "data": {
    "anniversaries": [...],
    "notes": [...]
  }
}
```

### 4. Khởi động scheduler (trong app.ts)

```typescript
import { notificationScheduler } from "./utils/NotificationScheduler";

// Khởi động khi app start
notificationScheduler.start();

// Dừng khi app stop
process.on("SIGTERM", () => {
  notificationScheduler.stop();
});
```

## Tích hợp với Mobile App

### Push Notification (Cần implement)

Hiện tại hệ thống đã chuẩn bị sẵn interface để tích hợp:

```typescript
interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    type: "anniversary" | "note_reminder";
    id: string;
    coupleId: string;
  };
}
```

### Các bước tích hợp:

1. **Cài đặt Firebase Cloud Messaging** hoặc **Apple Push Notification Service**
2. **Lưu device tokens** của người dùng
3. **Cập nhật NotificationService.sendPushNotification()** để gửi thật
4. **Handle notification** trên mobile app

### Ví dụ cấu trúc device token:

```typescript
interface PushNotificationToken {
  userId: Types.ObjectId;
  token: string;
  platform: "ios" | "android" | "web";
  isActive: boolean;
}
```

## Testing

### Manual trigger

```bash
# Kích hoạt kiểm tra thông báo ngay lập tức
POST /api/notifications/trigger
```

### Kiểm tra logs

```typescript
// Logs sẽ xuất hiện khi:
- Gửi thông báo thành công
- Có lỗi trong quá trình gửi
- Scheduler chạy định kỳ
```

## Cấu hình Environment

Cần thêm vào `.env`:

```env
# Notification settings
NOTIFICATION_ENABLED=true
PUSH_NOTIFICATION_KEY=your_firebase_key
NOTIFICATION_SCHEDULE_ENABLED=true
```

## Mở rộng trong tương lai

1. **Email notifications** as backup
2. **SMS notifications** cho những trường hợp quan trọng
3. **In-app notifications** real-time với WebSocket
4. **Notification templates** có thể tùy chỉnh
5. **User preferences** cho từng loại thông báo
6. **Timezone support** đầy đủ
7. **Rich notifications** với hình ảnh, actions

## Notes quan trọng

- Thông báo chỉ gửi một lần (dùng `notificationSent` flag)
- Hỗ trợ múi giờ cần được cải thiện
- Cần implement thực tế push notification service
- Database indexes đã được tạo để tối ưu query
- Error handling và retry logic cần được thêm vào
