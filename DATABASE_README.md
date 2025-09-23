# Two Gether - Couple Management Application

A modern Express.js + TypeScript + MongoDB application built with ES6 modules for couple relationship management.

## 🚀 Features

- **Express.js** - Fast, unopinionated, minimalist web framework
- **TypeScript** - Type safety and modern JavaScript features
- **MongoDB + Mongoose** - NoSQL database with ODM
- **ES6 Modules** - Modern module system with import/export
- **Security** - Helmet, CORS, rate limiting, password hashing
- **Authentication** - JWT-based authentication system
- **Code Quality** - ESLint, Prettier, pre-configured rules
- **Error Handling** - Centralized error handling with custom error classes
- **Logging** - Structured logging with different levels
- **Hot Reload** - Development server with auto-restart
- **Path Aliases** - Clean imports with @ aliases

## 📁 Project Structure

```
src/
├── controllers/        # Request handlers and business logic
├── routes/            # API route definitions
├── middleware/        # Custom middleware functions
├── database/          # Database models and services
│   ├── models/        # Mongoose schemas
│   ├── services/      # Database service layer
│   └── connection.ts  # Database connection
├── services/          # Business logic and external service integrations
├── utils/             # Utility functions and helpers
├── types/             # TypeScript type definitions
└── app.ts             # Application entry point

dist/                  # Compiled JavaScript output
tests/                 # Test files
```

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  passwordHash: String,
  name: String,
  gender: 'male' | 'female' | 'other',
  birthday: Date,
  avatarUrl: String,
  coupleId: ObjectId | null,
  preferences: {
    notifications: Boolean,
    darkMode: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Couples Collection
```javascript
{
  _id: ObjectId,
  users: [ObjectId],              // Array of 2 user IDs
  anniversaryDate: Date,
  inviteCode: String (unique),    // Short code for partner to join
  settings: {
    allowLocationShare: Boolean,
    theme: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Additional Collections
- **anniversaries** - Special dates and reminders
- **notes** - Shared and private notes between couples
- **photos** - Photo sharing with favorites
- **moods** - Daily mood tracking
- **location_shares** - Temporary location sharing

## 🛠️ Installation

1. **Prerequisites:**
   - Node.js 18+ 
   - MongoDB 6.0+ (local or cloud)

2. **Clone and install:**
```bash
git clone <repository-url>
cd two_gether
npm install
```

3. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB:**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

## 🚦 Getting Started

### Development
```bash
npm run dev
```
Server starts at `http://localhost:3000` with auto-restart

### Production Build
```bash
npm run build
npm start
```

### Other Scripts
```bash
npm run lint          # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format code with Prettier
npm test              # Run tests
npm run clean         # Clean build directory
```

## 📋 API Endpoints

### Health & Info
- `GET /health` - Server health status
- `GET /api` - API welcome message

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Send password reset email
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/profile/me` - Get current user profile
- `PUT /api/users/profile/me` - Update current user profile

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/two_gether |
| `JWT_SECRET` | JWT signing secret | fallback-secret-key |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `CORS_ORIGIN` | CORS allowed origins | * |

### MongoDB Connection
```javascript
// Local MongoDB
MONGODB_URI=mongodb://localhost:27017/two_gether

// MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/two_gether
```

## 🏗️ Architecture

### Database Layer
- **Models** - Mongoose schemas with validation
- **Services** - Business logic and database operations
- **Connection** - Singleton database connection manager

### API Layer
- **Controllers** - Request/response handling
- **Routes** - Endpoint definitions
- **Middleware** - Authentication, validation, error handling

### Security Features
- **Password Hashing** - bcryptjs with salt rounds
- **JWT Authentication** - Stateless authentication
- **Input Validation** - Mongoose validators + custom validation
- **Rate Limiting** - Request throttling
- **CORS Protection** - Cross-origin resource sharing
- **Security Headers** - Helmet middleware

## 🎯 Core Features

### User Management
- User registration and authentication
- Profile management with preferences
- Password change functionality
- Account deletion with cleanup

### Couple System
- Create couples with invite codes
- Join existing couples
- Couple settings and themes
- Anniversary date tracking
- Partner relationship management

### Data Models
- **Users** - Complete user profiles
- **Couples** - Relationship management
- **Notes** - Shared/private note system
- **Photos** - Photo sharing with favorites
- **Moods** - Daily mood tracking
- **Anniversaries** - Special date reminders
- **Location Shares** - Temporary location sharing

## 🧪 Testing

Run tests with:
```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

Test files location: `tests/`

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production MongoDB
3. Set secure JWT secrets
4. Enable SSL/HTTPS
5. Use process manager (PM2)

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

## 📊 Database Indexes

Optimized indexes for performance:
- User: email, coupleId, createdAt
- Couple: users, inviteCode, anniversaryDate
- Note: coupleId, authorId, tags, text search
- Photo: coupleId, uploaderId, isFavorite
- And more...

## 🔒 Security Considerations

- **Passwords** - Never stored in plain text
- **JWT Tokens** - Short expiration times
- **Data Validation** - Input sanitization
- **Private Data** - Notes can be private to author
- **Couple Verification** - Users verified against couple membership

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License

## 🔗 Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT.io](https://jwt.io/)

---

Built with ❤️ for couples, using Express.js, TypeScript, and MongoDB