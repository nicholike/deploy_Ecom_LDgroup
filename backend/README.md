# MLM E-commerce Backend

Backend API cho hệ thống MLM E-commerce B2B Platform, được xây dựng với NestJS và Clean Architecture.

## 📋 Tech Stack

- **Framework**: NestJS 10.x với Fastify
- **Language**: TypeScript 5.x
- **Database**: MySQL 8.0 với Prisma ORM
- **Authentication**: JWT (JSON Web Token)
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator & class-transformer

## 🏗️ Architecture

Dự án sử dụng **Clean Architecture** + **Domain-Driven Design (DDD)** với các layers:

```
src/
├── core/                 # Business Logic Layer
│   ├── domain/          # Entities, Value Objects, Interfaces
│   ├── application/     # Use Cases (Commands, Queries, Services)
│   └── ports/           # Interfaces for Infrastructure
├── infrastructure/       # External Services & Database
├── presentation/         # API Controllers & DTOs
├── shared/              # Shared utilities, guards, decorators
└── modules/             # NestJS Modules (Composition Root)
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- MySQL >= 8.0
- pnpm (recommended) hoặc npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Update .env with your database credentials
```

### Database Setup

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed database with initial data
pnpm prisma:seed
```

### Running the App

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

Server sẽ chạy tại: `http://localhost:3000`  
API Documentation: `http://localhost:3000/api/docs`

## 📚 API Documentation

Sau khi chạy server, truy cập Swagger UI tại:
```
http://localhost:3000/api/docs
```

### Default Admin Account

```
Email: admin@mlm.com
Password: Admin@123456
```

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## 📝 Available Scripts

```bash
pnpm run start:dev       # Start development server
pnpm run build           # Build for production
pnpm run start:prod      # Start production server
pnpm run lint            # Lint code
pnpm run format          # Format code with Prettier
pnpm prisma:generate     # Generate Prisma Client
pnpm prisma:migrate      # Run database migrations
pnpm prisma:seed         # Seed database
pnpm prisma:studio       # Open Prisma Studio (DB GUI)
```

## 🔑 Environment Variables

Xem file `.env.example` để biết các biến môi trường cần thiết.

Các biến quan trọng:
- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Secret key cho JWT tokens
- `PORT`: Server port (default: 3000)

## 📁 Module Structure

### User Module (Đã hoàn thành)

- **Domain**: User Entity, Email VO, ReferralCode VO
- **Application**: 
  - Commands: CreateUser, UpdateUser
  - Queries: GetUser, ListUsers
- **Infrastructure**: UserRepository (Prisma)
- **Presentation**: UserController, DTOs

### Auth Module (Đã hoàn thành)

- JWT Strategy
- Login/Logout endpoints
- Token refresh
- Password hashing với bcrypt

## 🔐 Security

- JWT-based authentication
- Password hashing với bcrypt (10 salt rounds)
- Role-based access control (RBAC)
- Input validation trên tất cả endpoints
- CORS protection
- Rate limiting (cần cấu hình thêm)

## 🎯 Next Steps

1. ✅ User & Auth module hoàn thành
2. 🔲 Product module
3. 🔲 Order module
4. 🔲 Commission module (core business logic)
5. 🔲 Withdrawal module
6. 🔲 Payment gateway integration

## 📖 Documentation

Xem `claude.md` ở root directory để biết chi tiết về:
- Project overview
- Database schema
- Business logic
- API endpoints
- Coding conventions

## 🤝 Contributing

1. Tạo feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'feat: add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Tạo Pull Request

## 📄 License

Proprietary - All rights reserved
