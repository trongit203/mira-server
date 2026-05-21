# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mira Server is a financial app backend API built with Express, TypeScript, MongoDB (Mongoose), and JWT-based authentication. The API provides user authentication and transaction management endpoints.

## Common Commands

- **Development**: `npm run dev` — Runs the server with tsx watch for hot-reload on file changes
- **Build**: `npm run build` — Compiles TypeScript to JavaScript in `dist/` directory
- **Start**: `npm start` — Runs the compiled server from `dist/index.js`
- **Lint**: `npm run lint` — Lints TypeScript files using ESLint

## Architecture Overview

### Directory Structure
```
src/
├── config/          # Configuration modules (env, database connection)
├── controllers/     # Request handlers for routes (auth, transactions)
├── middleware/      # Express middleware (auth, error handling)
├── models/          # Mongoose schemas and models (User, Transaction)
├── routes/          # Express route definitions
├── types/           # Shared TypeScript types
└── utils/           # Utility classes and helpers (ApiError, JWT)
```

### Core Patterns

**Error Handling**: Uses a centralized `ApiError` class that extends Error with HTTP status codes. The `errorHandler` middleware catches both `ApiError` and `ZodError` (validation) and returns structured JSON responses.

**Request/Response Flow**: 
1. Routes (`routes/`) define endpoints and map them to controllers
2. Controllers (`controllers/`) handle business logic and call models
3. Middleware (`middleware/`) provides authentication and error handling
4. Models (`models/`) define data schemas with Mongoose

**Authentication**: JWT-based with:
- Access tokens (short-lived, 15m default) 
- Refresh tokens (long-lived, 7d default)
- `authenticate` middleware validates access tokens on protected routes
- User passwords are hashed with bcryptjs before storage

**Configuration**: Environment variables are loaded via `dotenv` and exposed through `src/config/env.ts`. Key variables:
- `PORT` (default: 3000)
- `MONGODB_URI` (default: mongodb://localhost:27017/mira)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `NODE_ENV` (used to differentiate dev/prod CORS origins)

**CORS**: Configured with allowed origins that differ by environment:
- Development: `localhost:3000`, `10.0.2.2:3000` (Android emulator), dev tunnel
- Production: `https://api.mira.vn`

### Data Models

**User Model** (`src/models/User.ts`):
- Fields: email (unique, lowercase), password (hashed), name, refreshToken (optional)
- Methods: `comparePassword()` for authentication
- Middleware: Auto-hashes password before save

**Transaction Model** (`src/models/Transaction.ts`):
- Represents financial transactions with user association

### API Routes

- `GET /health` — Health check endpoint
- `POST /v1/auth/register` — User registration
- `POST /v1/auth/login` — User login (returns access + refresh tokens)
- `POST /v1/auth/refresh` — Refresh access token
- `POST /v1/auth/logout` — Logout (invalidates refresh token)
- `GET /v1/auth/me` — Get current user (requires authentication)
- `POST /v1/transactions/*` — Transaction endpoints (require authentication)

## Development Notes

- **TypeScript Strict Mode**: Enabled in tsconfig.json — all types must be explicit
- **JSON Limit**: Set to 1MB for request payloads to prevent large uploads
- **Validation**: Use Zod schemas in routes/controllers for input validation; errors are caught by the errorHandler middleware
- **Database**: MongoDB connection happens in `bootstrap()` before server starts listening
- **Development Logger**: In dev mode (`NODE_ENV !== 'production'`), all HTTP requests and responses are logged with method, path, status code, response time, and payload size. Sensitive data (passwords, tokens, secrets) is automatically redacted. The logger is middleware that runs before route handlers.
