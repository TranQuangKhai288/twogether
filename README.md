# Two Gether

A modern Express.js + TypeScript application built with ES6 modules and best practices.

## 🚀 Features

- **Express.js** - Fast, unopinionated, minimalist web framework
- **TypeScript** - Type safety and modern JavaScript features
- **ES6 Modules** - Modern module system with import/export
- **Security** - Helmet, CORS, rate limiting
- **Code Quality** - ESLint, Prettier, pre-configured rules
- **Error Handling** - Centralized error handling with custom error classes
- **Logging** - Structured logging with different levels
- **Hot Reload** - Development server with auto-restart
- **Path Aliases** - Clean imports with @ aliases

## 📁 Project Structure

```
src/
├── controllers/     # Request handlers and business logic
├── routes/         # API route definitions
├── middleware/     # Custom middleware functions
├── services/       # Business logic and external service integrations
├── utils/          # Utility functions and helpers
├── types/          # TypeScript type definitions
└── app.ts          # Application entry point

dist/               # Compiled JavaScript output
tests/              # Test files
```

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd two_gether
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🚦 Getting Started

### Development
```bash
npm run dev
```
This starts the development server with hot reload on `http://localhost:3000`

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

### Health Check
- `GET /health` - Server health status

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
Key environment variables (see `.env.example`):

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - CORS allowed origins
- `JWT_SECRET` - JWT signing secret
- `DB_*` - Database configuration

### TypeScript Configuration
The project uses strict TypeScript configuration with:
- ES2022 target
- ES Modules
- Strict type checking
- Path aliases for clean imports

### Code Quality
- **ESLint** - Code linting with TypeScript rules
- **Prettier** - Code formatting
- **Husky** - Git hooks (can be added)

## 🏗️ Architecture

### MVC Pattern
- **Models** - Data structures and business logic
- **Views** - JSON API responses
- **Controllers** - Request handling and response formatting

### Middleware Stack
1. Security (Helmet)
2. CORS
3. Rate limiting
4. Body parsing
5. Compression
6. Logging
7. Custom middleware
8. Routes
9. Error handling

### Error Handling
- Custom `AppError` class for operational errors
- Global error handler middleware
- Structured error responses
- Development vs production error details

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request rate limiting
- **Input Validation** - Request validation
- **Error Sanitization** - Safe error responses

## 📈 Monitoring & Logging

- Structured logging with levels (info, warn, error, debug)
- Request logging middleware
- Error tracking and reporting
- Health check endpoint

## 🧪 Testing

Testing setup with Jest and TypeScript:
```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## 🚀 Deployment

### Production Considerations
1. Set `NODE_ENV=production`
2. Use environment-specific configuration
3. Enable SSL/HTTPS
4. Set up proper logging
5. Configure monitoring
6. Use process manager (PM2)

### Docker Support
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [REST API Design Guide](https://restfulapi.net/)

---

Built with ❤️ using Express.js and TypeScript