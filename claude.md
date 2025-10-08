# MLM E-commerce B2B Platform

> Hệ thống bán sỉ đa tầng (Multi-Level Marketing) dành cho doanh nghiệp, hỗ trợ quản lý mạng lưới phân phối, tính toán hoa hồng tự động, và theo dõi cây phả hệ.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup Instructions](#-setup-instructions)
- [Development Workflow](#-development-workflow)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Business Logic](#-business-logic)
- [Key Features](#-key-features)
- [Coding Conventions](#-coding-conventions)
- [Common Tasks](#-common-tasks)
- [Troubleshooting](#-troubleshooting)
- [Resources](#-resources)

---

## 🎯 Project Overview

### Mô tả
**MLM E-commerce B2B Platform** là hệ thống quản lý bán hàng đa cấp cho doanh nghiệp, cho phép:
- Quản lý mạng lưới phân phối nhiều tầng (F1 → F2 → F3 → F4...)
- Tự động tính toán hoa hồng theo cấp độ
- Theo dõi cây phả hệ (MLM Tree)
- Quản lý đơn hàng, sản phẩm, thanh toán
- Hệ thống rút tiền hoa hồng

### Đặc điểm chính
- **Không có public registration**: Chỉ Admin có thể tạo tài khoản Manager, Manager tạo Distributor, Distributor tạo Customer
- **Commission tính theo cấp**: F1 → F4 với tỷ lệ giảm dần
- **Batch calculation**: Hoa hồng được tính cuối tháng (không real-time)
- **Approval workflow**: Admin phải duyệt commission và withdrawal requests

### Architecture Philosophy
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Clean Architecture**: Tách biệt Domain → Application → Infrastructure → Presentation
- **Domain-Driven Design (DDD)**: Business logic độc lập với infrastructure
- **CQRS Pattern**: Tách Command (write) và Query (read)
- **Modular Design**: Mỗi module là một bounded context

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | 10.x | Enterprise Node.js framework |
| **Fastify** | 4.x | High-performance HTTP server (thay Express) |
| **TypeScript** | 5.x | Type-safe development |
| **Prisma** | 5.x | Type-safe ORM (recommended) |
| **MySQL** | 8.x | Relational database |
| **JWT** | - | Authentication & authorization |
| **Swagger** | - | API documentation |
| **class-validator** | - | DTO validation |
| **Bull** | - | Background job queue (Redis-based) |
| **bcrypt** | - | Password hashing |

**Alternative**: TypeORM nếu prefer decorator-based ORM

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.x | React framework với App Router |
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type-safe development |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **shadcn/ui** | - | Component library (Radix UI based) |
| **Zustand** | - | Lightweight state management |
| **TanStack Query** | 5.x | Data fetching & caching |
| **React Hook Form** | - | Form handling |
| **Zod** | - | Schema validation |
| **Recharts** | - | Data visualization |

**Alternatives**: 
- State: React Context (built-in)
- Charts: Chart.js, ApexCharts

### Payment Gateways
- **VNPay**: Primary payment gateway for Vietnam
- **Momo**: E-wallet integration
- **Stripe**: International payments
- **VietQR**: Bank transfer via QR code

### DevOps & Deployment
| Service | Purpose |
|---------|---------|
| **cPanel** | Hosting & server management |
| **Node.js App** | Backend deployment via cPanel |
| **MySQL** | Database via phpMyAdmin |
| **AutoSSL** | Free SSL certificates (Let's Encrypt) |
| **FTP/File Manager** | File uploads & management |
| **Cron Jobs** | Scheduled tasks (commission calculation) |
| **Error Logs** | Monitoring & debugging |

---

## 📁 Project Structure

### Monorepo Layout
```
Ecomerce_LDGroup/
├── backend/                 # NestJS API
├── frontend/                # Next.js Application
├── shared/                  # Shared types & constants (optional)
├── docs/                    # Documentation
├── .github/                 # GitHub workflows (CI/CD)
├── docker-compose.yml       # Local development
└── README.md
```

### Backend Structure (Clean Architecture + DDD)

```
backend/
├── src/
│   ├── core/                          # 🔵 CORE DOMAIN LAYER
│   │   ├── domain/                    # Domain Models (Pure Business Logic)
│   │   │   ├── user/
│   │   │   │   ├── entities/
│   │   │   │   │   └── user.entity.ts          # User domain entity
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── email.vo.ts             # Email value object
│   │   │   │   │   └── referral-code.vo.ts
│   │   │   │   ├── enums/
│   │   │   │   │   ├── user-role.enum.ts
│   │   │   │   │   └── user-status.enum.ts
│   │   │   │   └── interfaces/
│   │   │   │       └── user.repository.interface.ts
│   │   │   │
│   │   │   ├── product/
│   │   │   │   ├── entities/
│   │   │   │   │   └── product.entity.ts
│   │   │   │   └── interfaces/
│   │   │   │       └── product.repository.interface.ts
│   │   │   │
│   │   │   ├── order/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── order.entity.ts
│   │   │   │   │   └── order-item.entity.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   └── shipping-info.vo.ts
│   │   │   │   ├── enums/
│   │   │   │   │   ├── order-status.enum.ts
│   │   │   │   │   └── payment-status.enum.ts
│   │   │   │   └── interfaces/
│   │   │   │       └── order.repository.interface.ts
│   │   │   │
│   │   │   ├── commission/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── commission.entity.ts
│   │   │   │   │   ├── commission-config.entity.ts
│   │   │   │   │   └── withdrawal-request.entity.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   └── commission-rate.vo.ts
│   │   │   │   ├── enums/
│   │   │   │   │   ├── commission-status.enum.ts
│   │   │   │   │   └── withdrawal-status.enum.ts
│   │   │   │   └── interfaces/
│   │   │   │       ├── commission.repository.interface.ts
│   │   │   │       └── commission-calculator.interface.ts
│   │   │   │
│   │   │   └── shared/                # Shared domain logic
│   │   │       ├── base.entity.ts
│   │   │       └── result.type.ts     # Result<T, E> pattern
│   │   │
│   │   ├── application/               # 🟢 APPLICATION LAYER (Use Cases)
│   │   │   ├── user/
│   │   │   │   ├── commands/          # Write operations
│   │   │   │   │   ├── create-user/
│   │   │   │   │   │   ├── create-user.command.ts
│   │   │   │   │   │   ├── create-user.handler.ts
│   │   │   │   │   │   └── create-user.dto.ts
│   │   │   │   │   ├── update-user/
│   │   │   │   │   ├── delete-user/
│   │   │   │   │   └── change-password/
│   │   │   │   ├── queries/           # Read operations
│   │   │   │   │   ├── get-user/
│   │   │   │   │   │   ├── get-user.query.ts
│   │   │   │   │   │   └── get-user.handler.ts
│   │   │   │   │   ├── list-users/
│   │   │   │   │   └── get-user-tree/
│   │   │   │   └── services/
│   │   │   │       └── user.service.ts
│   │   │   │
│   │   │   ├── product/
│   │   │   │   ├── commands/
│   │   │   │   ├── queries/
│   │   │   │   └── services/
│   │   │   │
│   │   │   ├── order/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── create-order/
│   │   │   │   │   ├── update-order-status/
│   │   │   │   │   └── cancel-order/
│   │   │   │   ├── queries/
│   │   │   │   └── services/
│   │   │   │
│   │   │   ├── commission/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── calculate-commission/
│   │   │   │   │   │   ├── calculate-commission.command.ts
│   │   │   │   │   │   └── calculate-commission.handler.ts
│   │   │   │   │   ├── approve-commission/
│   │   │   │   │   └── reject-commission/
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-commission-summary/
│   │   │   │   │   ├── get-user-commissions/
│   │   │   │   │   └── get-commission-report/
│   │   │   │   └── services/
│   │   │   │       ├── commission-calculator.service.ts   # Core logic
│   │   │   │       ├── mlm-tree.service.ts               # Tree traversal
│   │   │   │       └── commission-config.service.ts
│   │   │   │
│   │   │   ├── withdrawal/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── create-withdrawal-request/
│   │   │   │   │   ├── approve-withdrawal/
│   │   │   │   │   └── process-withdrawal/
│   │   │   │   └── queries/
│   │   │   │
│   │   │   └── shared/
│   │   │       └── base.handler.ts
│   │   │
│   │   └── ports/                     # 🔌 Interfaces for Infrastructure
│   │       ├── repositories/          # Repository interfaces
│   │       │   ├── user.repository.port.ts
│   │       │   ├── product.repository.port.ts
│   │       │   └── commission.repository.port.ts
│   │       ├── services/              # External service interfaces
│   │       │   ├── payment.service.port.ts
│   │       │   ├── email.service.port.ts
│   │       │   └── storage.service.port.ts
│   │       └── events/                # Domain events
│   │           ├── order-completed.event.ts
│   │           └── commission-calculated.event.ts
│   │
│   ├── infrastructure/                # 🟡 INFRASTRUCTURE LAYER
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma      # Prisma schema definition
│   │   │   │   ├── migrations/
│   │   │   │   └── seed.ts            # Initial data seeding
│   │   │   │
│   │   │   └── repositories/          # Repository implementations
│   │   │       ├── user.repository.ts
│   │   │       ├── product.repository.ts
│   │   │       ├── order.repository.ts
│   │   │       └── commission.repository.ts
│   │   │
│   │   ├── services/                  # External service implementations
│   │   │   ├── payment/
│   │   │   │   ├── payment.service.ts         # Abstract payment service
│   │   │   │   ├── vnpay.service.ts
│   │   │   │   ├── momo.service.ts
│   │   │   │   ├── stripe.service.ts
│   │   │   │   └── vietqr.service.ts
│   │   │   │
│   │   │   ├── notification/
│   │   │   │   ├── email.service.ts           # Nodemailer
│   │   │   │   └── sms.service.ts             # Twilio/ESMS
│   │   │   │
│   │   │   └── storage/
│   │   │       ├── local-storage.service.ts   # cPanel file upload
│   │   │       └── s3-storage.service.ts      # Optional: AWS S3
│   │   │
│   │   └── config/                    # Configuration files
│   │       ├── database.config.ts
│   │       ├── jwt.config.ts
│   │       ├── payment.config.ts
│   │       └── email.config.ts
│   │
│   ├── presentation/                  # 🔴 PRESENTATION LAYER (API)
│   │   └── http/
│   │       ├── controllers/
│   │       │   ├── auth.controller.ts
│   │       │   ├── user.controller.ts
│   │       │   ├── product.controller.ts
│   │       │   ├── order.controller.ts
│   │       │   ├── commission.controller.ts
│   │       │   ├── withdrawal.controller.ts
│   │       │   └── report.controller.ts
│   │       │
│   │       ├── dto/                   # Data Transfer Objects
│   │       │   ├── user/
│   │       │   │   ├── create-user.dto.ts
│   │       │   │   ├── update-user.dto.ts
│   │       │   │   └── user-response.dto.ts
│   │       │   ├── commission/
│   │       │   │   ├── calculate-commission.dto.ts
│   │       │   │   └── commission-summary.dto.ts
│   │       │   └── shared/
│   │       │       ├── pagination.dto.ts
│   │       │       └── response.dto.ts
│   │       │
│   │       └── middlewares/
│   │           ├── auth.middleware.ts
│   │           └── logging.middleware.ts
│   │
│   ├── shared/                        # 🔷 SHARED KERNEL
│   │   ├── common/
│   │   │   ├── base.entity.ts
│   │   │   ├── base.repository.ts
│   │   │   └── pagination.interface.ts
│   │   │
│   │   ├── constants/
│   │   │   ├── commission-rates.constant.ts
│   │   │   ├── order-statuses.constant.ts
│   │   │   └── api-routes.constant.ts
│   │   │
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   ├── current-user.decorator.ts
│   │   │   └── api-response.decorator.ts
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   │
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   │
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   │
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   │
│   │   └── utils/
│   │       ├── date.util.ts
│   │       ├── crypto.util.ts
│   │       ├── tree.util.ts           # MLM tree helpers
│   │       └── pagination.util.ts
│   │
│   ├── modules/                       # NestJS Modules (Composition Root)
│   │   ├── user.module.ts
│   │   ├── product.module.ts
│   │   ├── order.module.ts
│   │   ├── commission.module.ts
│   │   ├── payment.module.ts
│   │   ├── withdrawal.module.ts
│   │   └── report.module.ts
│   │
│   ├── jobs/                          # Background Jobs (Bull Queue)
│   │   ├── processors/
│   │   │   ├── commission-calculator.processor.ts
│   │   │   ├── email-notification.processor.ts
│   │   │   └── order-status-sync.processor.ts
│   │   └── schedules/
│   │       └── monthly-commission.schedule.ts
│   │
│   ├── app.module.ts                  # Root module
│   └── main.ts                        # Application entry point
│
├── test/
│   ├── unit/                          # Unit tests
│   │   ├── domain/
│   │   │   └── commission/
│   │   │       └── commission-calculator.spec.ts
│   │   └── application/
│   │
│   ├── integration/                   # Integration tests
│   │   └── repositories/
│   │
│   └── e2e/                           # E2E tests
│       └── commission.e2e-spec.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

### Frontend Structure (Feature-Based Architecture)

```
frontend/
├── src/
│   ├── app/                           # Next.js 14 App Router
│   │   ├── (public)/                  # Public routes (no auth)
│   │   │   ├── page.tsx               # Homepage
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (auth)/                    # Authentication routes
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx             # Auth layout (centered form)
│   │   │
│   │   ├── dashboard/                 # 👨‍💼 Admin Portal
│   │   │   ├── layout.tsx             # Dashboard layout (sidebar + header)
│   │   │   ├── page.tsx               # Dashboard overview
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── page.tsx           # User list
│   │   │   │   ├── create/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # User detail
│   │   │   │       └── edit/
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── create/
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── commissions/
│   │   │   │   ├── page.tsx           # Commission management
│   │   │   │   ├── calculate/         # Batch calculation
│   │   │   │   ├── approve/           # Approval queue
│   │   │   │   └── config/            # Commission config
│   │   │   │
│   │   │   ├── withdrawals/
│   │   │   │   ├── page.tsx           # Withdrawal requests
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── sales/
│   │   │   │   ├── commissions/
│   │   │   │   └── network/
│   │   │   │
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── distributor/               # 👔 Distributor Portal
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Distributor dashboard
│   │   │   │
│   │   │   ├── network/               # MLM network tree
│   │   │   │   ├── page.tsx           # Tree visualization
│   │   │   │   └── [userId]/
│   │   │   │
│   │   │   ├── customers/             # Manage downline
│   │   │   │   ├── page.tsx
│   │   │   │   └── create/
│   │   │   │
│   │   │   ├── commissions/
│   │   │   │   ├── page.tsx           # Commission history
│   │   │   │   └── withdraw/
│   │   │   │
│   │   │   ├── orders/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── referral/
│   │   │       └── page.tsx           # Referral code & link
│   │   │
│   │   ├── customer/                  # 👤 Customer Portal
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   │
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── commissions/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── network/
│   │   │   │   └── page.tsx           # View downline
│   │   │   │
│   │   │   └── referral/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                       # API routes (optional BFF pattern)
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   │
│   │   ├── layout.tsx                 # Root layout
│   │   ├── loading.tsx                # Global loading
│   │   ├── error.tsx                  # Global error boundary
│   │   └── not-found.tsx
│   │
│   ├── features/                      # Feature Modules (Business Logic)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useLogin.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   ├── types/
│   │   │   │   └── auth.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── user/
│   │   │   ├── components/
│   │   │   │   ├── UserTable.tsx
│   │   │   │   ├── UserForm.tsx
│   │   │   │   └── UserCard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useUsers.ts
│   │   │   │   ├── useCreateUser.ts
│   │   │   │   └── useUpdateUser.ts
│   │   │   ├── services/
│   │   │   │   └── user.service.ts
│   │   │   └── types/
│   │   │       └── user.types.ts
│   │   │
│   │   ├── product/
│   │   │   ├── components/
│   │   │   │   ├── ProductGrid.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   └── ProductForm.tsx
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   │
│   │   ├── order/
│   │   │   ├── components/
│   │   │   │   ├── OrderTable.tsx
│   │   │   │   ├── OrderDetail.tsx
│   │   │   │   └── CreateOrderForm.tsx
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   │
│   │   ├── commission/
│   │   │   ├── components/
│   │   │   │   ├── CommissionTable.tsx
│   │   │   │   ├── CommissionSummary.tsx
│   │   │   │   ├── CommissionChart.tsx
│   │   │   │   └── WithdrawalForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCommissions.ts
│   │   │   │   ├── useCommissionSummary.ts
│   │   │   │   └── useWithdrawals.ts
│   │   │   ├── services/
│   │   │   │   └── commission.service.ts
│   │   │   └── types/
│   │   │       └── commission.types.ts
│   │   │
│   │   ├── mlm-tree/
│   │   │   ├── components/
│   │   │   │   ├── TreeVisualization.tsx     # React D3 Tree
│   │   │   │   ├── TreeNode.tsx
│   │   │   │   └── TreeStats.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMLMTree.ts
│   │   │   │   └── useTreeStats.ts
│   │   │   ├── services/
│   │   │   │   └── mlm-tree.service.ts
│   │   │   └── utils/
│   │   │       └── tree-transformer.ts
│   │   │
│   │   └── report/
│   │       ├── components/
│   │       │   ├── SalesChart.tsx
│   │       │   ├── CommissionReport.tsx
│   │       │   └── NetworkGrowthChart.tsx
│   │       └── hooks/
│   │
│   ├── shared/                        # Shared Resources
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── modal.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── dropdown.tsx
│   │   │   │   └── card.tsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── DashboardLayout.tsx
│   │   │   │
│   │   │   └── common/
│   │   │       ├── DataTable.tsx
│   │   │       ├── Pagination.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── ErrorMessage.tsx
│   │   │       └── ConfirmDialog.tsx
│   │   │
│   │   ├── lib/                       # Utilities & Configurations
│   │   │   ├── api-client.ts          # Axios instance with interceptors
│   │   │   ├── auth.ts                # Auth utilities
│   │   │   ├── utils.ts               # cn() helper, formatters
│   │   │   └── query-client.ts        # TanStack Query config
│   │   │
│   │   ├── hooks/                     # Global hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useToast.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── usePagination.ts
│   │   │
│   │   ├── store/                     # Zustand stores
│   │   │   ├── auth.store.ts
│   │   │   ├── ui.store.ts
│   │   │   └── cart.store.ts
│   │   │
│   │   ├── types/                     # Shared TypeScript types
│   │   │   ├── api.types.ts
│   │   │   ├── common.types.ts
│   │   │   └── env.d.ts
│   │   │
│   │   └── constants/
│   │       ├── routes.ts
│   │       ├── config.ts
│   │       └── roles.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.css
│   │
│   └── middleware.ts                  # Next.js middleware (auth)
│
├── public/
│   ├── images/
│   │   ├── logo.png
│   │   └── placeholder.png
│   ├── icons/
│   └── uploads/                       # User uploads (development only)
│
├── .env.local.example
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── components.json                    # shadcn/ui config
└── package.json
```

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js**: >= 18.x (recommend 20.x LTS)
- **pnpm**: >= 8.x (hoặc npm/yarn)
- **MySQL**: >= 8.0
- **Redis**: >= 6.x (cho Bull queue)
- **Git**: Latest version

### 1️⃣ Clone Repository
```bash
git clone <repository-url> Ecomerce_LDGroup
cd Ecomerce_LDGroup
```

### 2️⃣ Backend Setup

#### Install Dependencies
```bash
cd backend
pnpm install
```

#### Environment Variables
```bash
cp .env.example .env
```

Cấu hình `.env`:
```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database
DATABASE_URL="mysql://username:password@localhost:3306/mlm_ecommerce"

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Redis (Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Payment Gateways
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB

# Commission
COMMISSION_CALCULATION_DAY=1  # 1st of month
```

#### Database Setup
```bash
# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed database
pnpm prisma db seed
```

#### Run Development Server
```bash
pnpm run start:dev
```

API sẽ chạy tại: `http://localhost:3000`  
Swagger docs: `http://localhost:3000/api/docs`

### 3️⃣ Frontend Setup

#### Install Dependencies
```bash
cd frontend
pnpm install
```

#### Environment Variables
```bash
cp .env.local.example .env.local
```

Cấu hình `.env.local`:
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_REGISTRATION=false
```

#### Run Development Server
```bash
pnpm run dev
```

Frontend sẽ chạy tại: `http://localhost:3001`

### 4️⃣ Verify Installation

✅ **Backend health check**:
```bash
curl http://localhost:3000/api/v1/health
```

✅ **Login with seeded admin**:
- Email: `admin@mlm.com`
- Password: `Admin@123456`

---

## 💻 Development Workflow

### Branch Strategy (Git Flow)
```
main                    # Production-ready code
├── develop             # Development branch
    ├── feature/xxx     # New features
    ├── fix/xxx         # Bug fixes
    └── refactor/xxx    # Code refactoring
```

### Commit Convention (Conventional Commits)
```bash
feat: Add commission calculation batch job
fix: Fix MLM tree infinite loop
refactor: Restructure user module to clean architecture
docs: Update API documentation
test: Add unit tests for commission calculator
chore: Update dependencies
```

### Development Flow
1. **Create feature branch**:
   ```bash
   git checkout -b feature/commission-calculation
   ```

2. **Make changes & commit**:
   ```bash
   git add .
   git commit -m "feat: implement commission calculation logic"
   ```

3. **Push & create PR**:
   ```bash
   git push origin feature/commission-calculation
   ```

4. **Code review** → Merge to `develop` → Deploy to staging → Merge to `main`

### Code Quality Tools

#### Backend
```bash
# Linting
pnpm run lint
pnpm run lint:fix

# Formatting
pnpm run format

# Testing
pnpm run test                 # Unit tests
pnpm run test:watch
pnpm run test:cov            # Coverage report
pnpm run test:e2e            # E2E tests
```

#### Frontend
```bash
# Linting
pnpm run lint
pnpm run lint:fix

# Type checking
pnpm run type-check

# Build
pnpm run build
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram (ERD)

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   users     │◄────────│  user_tree      │────────►│   users      │
│             │ sponsor │                 │ downline│              │
└─────────────┘         └─────────────────┘         └──────────────┘
       │                                                      │
       │                                                      │
       │ 1                                                   │ 1
       │                                                      │
       │ *                                                   │ *
       ▼                                                      ▼
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   orders    │────────►│  order_items    │────────►│  products    │
│             │         │                 │         │              │
└─────────────┘         └─────────────────┘         └──────────────┘
       │
       │ 1
       │
       │ *
       ▼
┌─────────────────────┐
│   commissions       │
│                     │
└─────────────────────┘
       │
       │ *
       │
       │ *
       ▼
┌──────────────────────────┐
│  withdrawal_requests     │
│                          │
└──────────────────────────┘
```

### Core Tables (Prisma Schema)

#### 1. Users Table
```prisma
model User {
  id             String    @id @default(uuid())
  email          String    @unique
  username       String    @unique
  passwordHash   String    @map("password_hash")
  
  // Profile
  firstName      String?   @map("first_name")
  lastName       String?   @map("last_name")
  phone          String?   @unique
  avatar         String?
  
  // MLM
  role           UserRole  @default(CUSTOMER)
  sponsorId      String?   @map("sponsor_id")
  sponsor        User?     @relation("UserSponsor", fields: [sponsorId], references: [id])
  downline       User[]    @relation("UserSponsor")
  referralCode   String    @unique @map("referral_code")
  
  // Status
  status         UserStatus @default(ACTIVE)
  emailVerified  Boolean   @default(false) @map("email_verified")
  
  // Timestamps
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  lastLoginAt    DateTime? @map("last_login_at")
  
  // Relations
  orders         Order[]
  commissions    Commission[]
  withdrawals    WithdrawalRequest[]
  
  @@map("users")
  @@index([sponsorId])
  @@index([referralCode])
  @@index([role])
}

enum UserRole {
  ADMIN
  MANAGER
  DISTRIBUTOR
  CUSTOMER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  BANNED
}
```

#### 2. User Tree (Closure Table)
```prisma
model UserTree {
  ancestor      String
  descendant    String
  level         Int       @default(0)
  
  ancestorUser  User      @relation("Ancestor", fields: [ancestor], references: [id], onDelete: Cascade)
  descendantUser User     @relation("Descendant", fields: [descendant], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now()) @map("created_at")
  
  @@id([ancestor, descendant])
  @@map("user_tree")
  @@index([ancestor, level])
  @@index([descendant])
}
```

#### 3. Products
```prisma
model Product {
  id                    String    @id @default(uuid())
  name                  String
  slug                  String    @unique
  description           String?   @db.Text
  
  // Pricing
  price                 Decimal   @db.Decimal(10, 2)
  costPrice             Decimal?  @map("cost_price") @db.Decimal(10, 2)
  salePrice             Decimal?  @map("sale_price") @db.Decimal(10, 2)
  
  // Inventory
  sku                   String    @unique
  stock                 Int       @default(0)
  lowStockThreshold     Int       @default(10) @map("low_stock_threshold")
  
  // Commission
  isCommissionEligible  Boolean   @default(true) @map("is_commission_eligible")
  
  // Media
  images                String[]  @default([])
  thumbnail             String?
  
  // Category
  categoryId            String?   @map("category_id")
  category              Category? @relation(fields: [categoryId], references: [id])
  
  // Status
  status                ProductStatus @default(DRAFT)
  
  // Timestamps
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  
  // Relations
  orderItems            OrderItem[]
  
  @@map("products")
  @@index([slug])
  @@index([categoryId])
  @@index([status])
}

enum ProductStatus {
  DRAFT
  PUBLISHED
  OUT_OF_STOCK
  DISCONTINUED
}
```

#### 4. Orders
```prisma
model Order {
  id                String        @id @default(uuid())
  orderNumber       String        @unique @map("order_number")
  
  // Customer
  userId            String        @map("user_id")
  user              User          @relation(fields: [userId], references: [id])
  
  // Pricing
  subtotal          Decimal       @db.Decimal(10, 2)
  shippingFee       Decimal       @default(0) @map("shipping_fee") @db.Decimal(10, 2)
  tax               Decimal       @default(0) @db.Decimal(10, 2)
  discount          Decimal       @default(0) @db.Decimal(10, 2)
  totalAmount       Decimal       @map("total_amount") @db.Decimal(10, 2)
  
  // Status
  status            OrderStatus   @default(PENDING)
  paymentStatus     PaymentStatus @default(PENDING) @map("payment_status")
  
  // Shipping
  shippingAddress   Json?         @map("shipping_address")
  shippingMethod    String?       @map("shipping_method")
  trackingNumber    String?       @map("tracking_number")
  
  // Payment
  paymentMethod     String?       @map("payment_method")
  paymentGateway    String?       @map("payment_gateway")
  transactionId     String?       @map("transaction_id")
  paidAt            DateTime?     @map("paid_at")
  
  // Notes
  customerNote      String?       @map("customer_note") @db.Text
  adminNote         String?       @map("admin_note") @db.Text
  
  // Timestamps
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")
  completedAt       DateTime?     @map("completed_at")
  
  // Relations
  items             OrderItem[]
  commissions       Commission[]
  
  @@map("orders")
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  COMPLETED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}
```

#### 5. Order Items
```prisma
model OrderItem {
  id            String    @id @default(uuid())
  
  orderId       String    @map("order_id")
  order         Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId     String    @map("product_id")
  product       Product   @relation(fields: [productId], references: [id])
  
  quantity      Int
  price         Decimal   @db.Decimal(10, 2)  // Price at time of purchase
  subtotal      Decimal   @db.Decimal(10, 2)  // quantity * price
  
  createdAt     DateTime  @default(now()) @map("created_at")
  
  @@map("order_items")
  @@index([orderId])
  @@index([productId])
}
```

#### 6. Commissions (CRITICAL TABLE)
```prisma
model Commission {
  id              String            @id @default(uuid())
  
  // User receiving commission
  userId          String            @map("user_id")
  user            User              @relation(fields: [userId], references: [id])
  
  // Order that generated commission
  orderId         String            @map("order_id")
  order           Order             @relation(fields: [orderId], references: [id])
  
  // Downline user who made the purchase
  fromUserId      String            @map("from_user_id")
  
  // MLM Level (1=F1, 2=F2, 3=F3, 4=F4)
  level           Int
  
  // Calculation
  orderValue      Decimal           @map("order_value") @db.Decimal(10, 2)
  commissionRate  Decimal           @map("commission_rate") @db.Decimal(5, 2)  // e.g., 10.00 for 10%
  commissionAmount Decimal          @map("commission_amount") @db.Decimal(10, 2)
  
  // Period
  period          String            // Format: YYYY-MM
  
  // Status
  status          CommissionStatus  @default(PENDING)
  
  // Timestamps
  calculatedAt    DateTime          @default(now()) @map("calculated_at")
  approvedAt      DateTime?         @map("approved_at")
  rejectedAt      DateTime?         @map("rejected_at")
  paidAt          DateTime?         @map("paid_at")
  
  // Notes
  notes           String?           @db.Text
  
  @@map("commissions")
  @@index([userId, period])
  @@index([orderId])
  @@index([status])
  @@index([period])
}

enum CommissionStatus {
  PENDING       // Calculated but not approved
  APPROVED      // Approved by admin
  REJECTED      // Rejected by admin
  PAID          // Paid to user
  CANCELLED     // Order cancelled/refunded
}
```

#### 7. Commission Configs
```prisma
model CommissionConfig {
  id              String    @id @default(uuid())
  
  level           Int       @unique  // 1, 2, 3, 4
  commissionRate  Decimal   @map("commission_rate") @db.Decimal(5, 2)
  commissionType  String    @default("PERCENTAGE") @map("commission_type")
  
  // Constraints
  minOrderValue   Decimal?  @map("min_order_value") @db.Decimal(10, 2)
  maxCommission   Decimal?  @map("max_commission") @db.Decimal(10, 2)
  
  // Status
  active          Boolean   @default(true)
  effectiveFrom   DateTime  @default(now()) @map("effective_from")
  effectiveTo     DateTime? @map("effective_to")
  
  // Timestamps
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  @@map("commission_configs")
  @@index([level, active])
}
```

#### 8. Withdrawal Requests
```prisma
model WithdrawalRequest {
  id              String              @id @default(uuid())
  
  userId          String              @map("user_id")
  user            User                @relation(fields: [userId], references: [id])
  
  amount          Decimal             @db.Decimal(10, 2)
  
  // Bank information (JSON)
  bankInfo        Json                @map("bank_info")
  // { bankName, accountNumber, accountName, branch }
  
  // Commission IDs being withdrawn (array)
  commissionIds   String[]            @map("commission_ids")
  
  // Status
  status          WithdrawalStatus    @default(PENDING)
  
  // Processing
  processedBy     String?             @map("processed_by")
  processedAt     DateTime?           @map("processed_at")
  
  // Notes
  userNote        String?             @map("user_note") @db.Text
  adminNote       String?             @map("admin_note") @db.Text
  
  // Timestamps
  requestedAt     DateTime            @default(now()) @map("requested_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")
  
  @@map("withdrawal_requests")
  @@index([userId])
  @@index([status])
}

enum WithdrawalStatus {
  PENDING
  APPROVED
  REJECTED
  PROCESSING
  COMPLETED
  FAILED
}
```

#### 9. Categories
```prisma
model Category {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?   @db.Text
  
  parentId    String?   @map("parent_id")
  parent      Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  
  image       String?
  order       Int       @default(0)
  active      Boolean   @default(true)
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  products    Product[]
  
  @@map("categories")
  @@index([slug])
  @@index([parentId])
}
```

### Database Indexes Strategy

**Critical indexes đã được thêm:**
- `users`: `sponsorId`, `referralCode`, `role`
- `user_tree`: `(ancestor, level)`, `descendant`
- `orders`: `userId`, `status`, `createdAt`
- `commissions`: `(userId, period)`, `orderId`, `status`, `period`

---

## 🔌 API Endpoints

### Base URL
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://yourdomain.com/api/v1`

### Authentication
Tất cả endpoints (trừ login) yêu cầu JWT token:
```http
Authorization: Bearer <jwt_token>
```

### Endpoints Overview

#### 🔐 Authentication (`/auth`)
```http
POST   /auth/login                    # Login
POST   /auth/refresh                  # Refresh token
POST   /auth/logout                   # Logout
GET    /auth/me                       # Get current user
POST   /auth/change-password          # Change password
```

#### 👥 Users (`/users`)
```http
GET    /users                         # List users (Admin, Manager)
GET    /users/:id                     # Get user by ID
POST   /users                         # Create user (Admin, Manager)
PUT    /users/:id                     # Update user
DELETE /users/:id                     # Delete user (soft delete)
GET    /users/:id/tree                # Get MLM tree
GET    /users/:id/downline            # Get direct downline
GET    /users/:id/upline              # Get upline chain
```

**Example: Create User**
```http
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "customer@example.com",
  "username": "customer01",
  "password": "Password@123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+84901234567",
  "role": "CUSTOMER",
  "sponsorId": "uuid-of-sponsor"
}
```

#### 📦 Products (`/products`)
```http
GET    /products                      # List products (public)
GET    /products/:id                  # Get product by ID
POST   /products                      # Create product (Admin)
PUT    /products/:id                  # Update product (Admin)
DELETE /products/:id                  # Delete product (Admin)
GET    /products/slug/:slug           # Get product by slug
```

#### 🛒 Orders (`/orders`)
```http
GET    /orders                        # List orders
GET    /orders/:id                    # Get order by ID
POST   /orders                        # Create order
PUT    /orders/:id/status             # Update order status (Admin)
POST   /orders/:id/cancel             # Cancel order
GET    /orders/:id/invoice            # Get invoice PDF
```

**Example: Create Order**
```http
POST /api/v1/orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "phone": "+84901234567",
    "address": "123 Main St",
    "city": "Ho Chi Minh",
    "district": "District 1",
    "ward": "Ward 1"
  },
  "paymentMethod": "VNPAY",
  "customerNote": "Giao hàng giờ hành chính"
}
```

#### 💰 Commissions (`/commissions`)
```http
GET    /commissions                           # List user's commissions
GET    /commissions/summary                   # Get commission summary
POST   /commissions/calculate                 # Calculate commissions (Admin, Cron)
PUT    /commissions/:id/approve               # Approve commission (Admin)
PUT    /commissions/:id/reject                # Reject commission (Admin)
GET    /commissions/report                    # Get commission report
```

**Example: Calculate Monthly Commissions**
```http
POST /api/v1/commissions/calculate
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "period": "2025-10",
  "orderStatuses": ["COMPLETED", "DELIVERED"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "2025-10",
    "totalOrders": 150,
    "totalCommissions": 350,
    "totalAmount": "45,500,000",
    "byLevel": {
      "1": { "count": 120, "amount": "25,000,000" },
      "2": { "count": 100, "amount": "12,500,000" },
      "3": { "count": 80, "amount": "6,000,000" },
      "4": { "count": 50, "amount": "2,000,000" }
    }
  }
}
```

#### 🏦 Withdrawals (`/withdrawals`)
```http
GET    /withdrawals                   # List withdrawal requests
GET    /withdrawals/:id               # Get withdrawal by ID
POST   /withdrawals                   # Create withdrawal request
PUT    /withdrawals/:id/approve       # Approve withdrawal (Admin)
PUT    /withdrawals/:id/reject        # Reject withdrawal (Admin)
PUT    /withdrawals/:id/process       # Mark as processed (Admin)
```

**Example: Create Withdrawal Request**
```http
POST /api/v1/withdrawals
Content-Type: application/json
Authorization: Bearer <token>

{
  "commissionIds": [
    "commission-uuid-1",
    "commission-uuid-2"
  ],
  "bankInfo": {
    "bankName": "Vietcombank",
    "accountNumber": "0123456789",
    "accountName": "NGUYEN VAN A",
    "branch": "Ho Chi Minh"
  },
  "userNote": "Rút tiền hoa hồng tháng 10"
}
```

#### 📊 Reports (`/reports`)
```http
GET    /reports/sales                 # Sales report
GET    /reports/commissions           # Commission report
GET    /reports/network-growth        # Network growth analytics
GET    /reports/top-performers        # Top performers
```

#### ⚙️ Settings (`/settings`)
```http
GET    /settings/commission-config    # Get commission config
PUT    /settings/commission-config    # Update commission config (Admin)
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email already exists"
      }
    ]
  },
  "timestamp": "2025-10-07T10:30:00Z"
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., email exists) |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 💼 Business Logic

### 1. MLM Tree Structure

#### Cấu trúc phả hệ
```
Admin
└── Manager 1
    ├── Distributor 1 (F0 - sponsor)
    │   ├── Customer A (F1)
    │   │   ├── Customer B (F2)
    │   │   │   ├── Customer C (F3)
    │   │   │   │   └── Customer D (F4)
    │   │   │   │       └── Customer E (F5) ← MUA HÀNG
    │   │   │   └── Customer F (F3)
    │   │   └── Customer G (F2)
    │   └── Customer H (F1)
    └── Distributor 2
```

**Khi Customer E (F5) mua hàng:**
- Customer D (F4 của E = F1 của cây): 10%
- Customer C (F3 của E = F2 của cây): 7%
- Customer B (F2 của E = F3 của cây): 5%
- Customer A (F1 của E = F4 của cây): 3%

### 2. Commission Calculation Logic

#### Flow diagram
```
Order Created
    ↓
[Status = PENDING]
    ↓
Payment Completed
    ↓
[Status = CONFIRMED]
    ↓
Processing
    ↓
[Status = COMPLETED or DELIVERED] ← COMMISSION ELIGIBLE
    ↓
End of Month
    ↓
Admin runs: POST /commissions/calculate
    ↓
System:
  1. Lọc orders với status = COMPLETED/DELIVERED trong tháng
  2. Với mỗi order:
     a. Lấy userId (người mua)
     b. Trace upline chain (dùng user_tree)
     c. Get commission config cho từng level
     d. Calculate commission amount
     e. Create commission records
  3. Set status = PENDING
    ↓
Admin reviews & approves
    ↓
[Status = APPROVED]
    ↓
User creates withdrawal request
    ↓
Admin processes withdrawal
    ↓
[Status = PAID]
```

#### Pseudo Code
```typescript
async calculateCommissions(period: string) {
  // 1. Get eligible orders
  const orders = await this.orderRepository.find({
    where: {
      status: In(['COMPLETED', 'DELIVERED']),
      createdAt: Between(startOfMonth, endOfMonth)
    }
  });

  const commissions = [];

  for (const order of orders) {
    // 2. Get upline chain (F1 → F2 → F3 → F4)
    const uplineChain = await this.mlmTreeService.getUplineChain(
      order.userId,
      4 // Max 4 levels
    );

    // 3. Calculate commission for each level
    for (let i = 0; i < uplineChain.length; i++) {
      const level = i + 1;
      const uplineUser = uplineChain[i];

      // Get commission config
      const config = await this.getCommissionConfig(level);
      
      if (!config || !config.active) continue;

      // Calculate
      const commissionAmount = (order.totalAmount * config.rate) / 100;

      // Create commission record
      commissions.push({
        userId: uplineUser.id,
        orderId: order.id,
        fromUserId: order.userId,
        level,
        orderValue: order.totalAmount,
        commissionRate: config.rate,
        commissionAmount,
        period,
        status: 'PENDING'
      });
    }
  }

  // 4. Bulk insert
  await this.commissionRepository.bulkCreate(commissions);

  return {
    totalOrders: orders.length,
    totalCommissions: commissions.length,
    totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0)
  };
}
```

### 3. User Registration Flow

**QUAN TRỌNG**: KHÔNG có public registration!

```
Admin
  ↓ creates
Manager (role: MANAGER)
  ↓ creates
Distributor (role: DISTRIBUTOR, sponsor_id: Manager.id)
  ↓ creates
Customer (role: CUSTOMER, sponsor_id: Distributor.id)
  ↓ shares referral_code
Customer 2 (sponsor_id: Customer.id)
```

**Validation rules:**
- Admin chỉ có thể tạo Manager
- Manager chỉ có thể tạo Distributor
- Distributor có thể tạo Customer
- Customer có thể giới thiệu Customer khác (downline)
- Mỗi user PHẢI có `sponsor_id` (trừ Admin)

### 4. Withdrawal Process

```
User có approved commissions
    ↓
Tạo withdrawal request
    ↓
Select commissions to withdraw
    ↓
Enter bank info
    ↓
[Status = PENDING]
    ↓
Admin reviews
    ↓
Option 1: APPROVE          Option 2: REJECT
    ↓                           ↓
[Status = APPROVED]        [Status = REJECTED]
    ↓                      Commissions unlocked
Admin processes payment
(bank transfer)
    ↓
[Status = COMPLETED]
    ↓
Update commissions.status = PAID
```

---

## ✨ Key Features

### Phase 1: MVP (Essential)
- ✅ JWT Authentication
- ✅ Role-based access control
- ✅ User management (hierarchical creation)
- ✅ Product catalog (CRUD)
- ✅ Order management
- ✅ MLM tree structure (closure table)
- ✅ Commission calculation (batch)

### Phase 2: Commission & Withdrawal
- ✅ Commission configuration
- ✅ Commission approval workflow
- ✅ Withdrawal requests
- ✅ Payment gateway integration (VNPay)

### Phase 3: Dashboard & Reports
- ✅ Admin dashboard
- ✅ Distributor dashboard
- ✅ Commission reports
- ✅ Network analytics

### Phase 4: Advanced
- ⬜ Referral code system
- ⬜ Email/SMS notifications
- ⬜ Invoice PDF generation
- ⬜ Activity logs (audit trail)
- ⬜ Export reports (Excel, CSV)

---

## 📐 Coding Conventions

### TypeScript Style Guide

#### Naming Conventions
```typescript
// Classes, Interfaces, Types, Enums: PascalCase
class UserService {}
interface IUserRepository {}
type UserRole = 'admin' | 'manager';
enum OrderStatus {}

// Functions, variables: camelCase
const calculateCommission = () => {};
let totalAmount = 0;

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 5242880;
const API_BASE_URL = 'https://api.example.com';

// Private properties: prefix with _
class User {
  private _password: string;
}

// Files: kebab-case
// user.service.ts
// commission-calculator.service.ts
```

#### Function/Method Documentation
```typescript
/**
 * Calculate commissions for a specific period
 * 
 * @param period - Period in format YYYY-MM (e.g., "2025-10")
 * @param orderStatuses - Array of eligible order statuses
 * @returns Commission calculation summary
 * @throws {NotFoundException} If no orders found
 * @throws {ValidationException} If period format is invalid
 * 
 * @example
 * ```typescript
 * const result = await calculateCommissions('2025-10', ['COMPLETED']);
 * console.log(result.totalAmount);
 * ```
 */
async calculateCommissions(
  period: string,
  orderStatuses: OrderStatus[]
): Promise<CommissionSummary> {
  // Implementation
}
```

#### Error Handling
```typescript
// Use custom exceptions
throw new NotFoundException(`User with ID ${id} not found`);
throw new ValidationException('Invalid email format');
throw new UnauthorizedException('Invalid credentials');

// Use Result pattern for business logic
class Result<T, E = Error> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: E
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result(true, value);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result(false, undefined, error);
  }
}

// Usage
const result = await this.userService.createUser(dto);
if (!result.isSuccess) {
  throw new BadRequestException(result.error);
}
return result.value;
```

### Backend (NestJS)

#### Module Structure
```typescript
// user.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // or
    PrismaModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    // Repository
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    // Use cases
    CreateUserHandler,
    GetUserHandler,
  ],
  exports: [UserService],
})
export class UserModule {}
```

#### Controller Pattern
```typescript
@Controller('users')
@ApiTags('Users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly createUserHandler: CreateUserHandler,
    private readonly getUserQuery: GetUserQuery,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const command = new CreateUserCommand(dto);
    return this.createUserHandler.execute(command);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const query = new GetUserQuery(id);
    return this.getUserQuery.execute(query);
  }
}
```

#### Service/Handler Pattern (CQRS)
```typescript
// create-user.handler.ts
@Injectable()
export class CreateUserHandler {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly hashService: HashService,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    // 1. Validate business rules
    await this.validateSponsor(command.sponsorId);

    // 2. Hash password
    const passwordHash = await this.hashService.hash(command.password);

    // 3. Generate referral code
    const referralCode = this.generateReferralCode();

    // 4. Create user
    const user = User.create({
      ...command,
      passwordHash,
      referralCode,
    });

    // 5. Save to database
    return this.userRepository.save(user);
  }

  private async validateSponsor(sponsorId: string): Promise<void> {
    const sponsor = await this.userRepository.findById(sponsorId);
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }
    // Additional business rules...
  }
}
```

### Frontend (Next.js + React)

#### Component Pattern
```tsx
// features/user/components/UserTable.tsx
'use client';

import { useUsers } from '../hooks/useUsers';
import { DataTable } from '@/shared/components/common/DataTable';
import { userColumns } from './user-columns';

interface UserTableProps {
  role?: UserRole;
}

export function UserTable({ role }: UserTableProps) {
  const { data, isLoading, error } = useUsers({ role });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <DataTable
      columns={userColumns}
      data={data?.users ?? []}
      pagination={data?.pagination}
    />
  );
}
```

#### Custom Hook Pattern
```typescript
// features/commission/hooks/useCommissions.ts
import { useQuery } from '@tanstack/react-query';
import { commissionService } from '../services/commission.service';

interface UseCommissionsOptions {
  userId?: string;
  period?: string;
  status?: CommissionStatus;
}

export function useCommissions(options: UseCommissionsOptions = {}) {
  return useQuery({
    queryKey: ['commissions', options],
    queryFn: () => commissionService.getCommissions(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commissionService.createWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Withdrawal request created');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
```

#### Service Pattern
```typescript
// features/commission/services/commission.service.ts
import { apiClient } from '@/shared/lib/api-client';
import type { Commission, WithdrawalRequest } from '../types';

class CommissionService {
  async getCommissions(params?: any): Promise<{ commissions: Commission[] }> {
    const { data } = await apiClient.get('/commissions', { params });
    return data;
  }

  async getSummary(period: string): Promise<CommissionSummary> {
    const { data } = await apiClient.get('/commissions/summary', {
      params: { period },
    });
    return data;
  }

  async createWithdrawal(dto: CreateWithdrawalDto): Promise<WithdrawalRequest> {
    const { data } = await apiClient.post('/withdrawals', dto);
    return data;
  }
}

export const commissionService = new CommissionService();
```

### Git Commit Messages
```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:      # New feature
fix:       # Bug fix
refactor:  # Code refactoring
docs:      # Documentation
style:     # Code style (formatting, semicolons, etc)
test:      # Adding tests
chore:     # Maintenance tasks

# Examples:
feat(commission): implement monthly batch calculation
fix(auth): resolve JWT token expiration issue
refactor(user): restructure user module to clean architecture
docs(api): update commission endpoints documentation
test(order): add unit tests for order service
```

---

## 🛠️ Common Tasks

### Backend Tasks

#### Generate new migration
```bash
pnpm prisma migrate dev --name add_withdrawal_table
```

#### Reset database
```bash
pnpm prisma migrate reset
```

#### Seed database
```bash
pnpm prisma db seed
```

#### Generate Prisma Client
```bash
pnpm prisma generate
```

#### Create new module
```bash
nest g module modules/payment
nest g controller presentation/http/controllers/payment
nest g service core/application/payment/services/payment
```

#### Run tests
```bash
pnpm run test                    # Unit tests
pnpm run test:watch              # Watch mode
pnpm run test:cov                # With coverage
pnpm run test:e2e                # E2E tests
```

### Frontend Tasks

#### Add shadcn/ui component
```bash
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add table
pnpm dlx shadcn-ui@latest add dialog
```

#### Create new feature
```bash
mkdir -p src/features/payment/{components,hooks,services,types}
```

#### Build for production
```bash
pnpm run build
pnpm run start  # Start production server
```

#### Analyze bundle
```bash
pnpm run build
pnpm run analyze
```

### Database Tasks

#### Backup database
```bash
# Local
mysqldump -u username -p mlm_ecommerce > backup_$(date +%Y%m%d).sql

# cPanel: Use phpMyAdmin Export or cPanel Backup
```

#### Restore database
```bash
mysql -u username -p mlm_ecommerce < backup_20251007.sql
```

### Deployment Tasks (cPanel)

#### Deploy backend
```bash
# 1. Build locally
cd backend
pnpm run build

# 2. Upload via FTP
# - Upload dist/, node_modules/, package.json
# - Or use Git deployment

# 3. In cPanel Node.js App
# - Set Application Root: /home/username/backend
# - Set Application URL: api.yourdomain.com
# - Set Application Startup File: dist/main.js
# - Run: npm install --production
# - Restart application
```

#### Deploy frontend
```bash
# Option 1: Static export
cd frontend
pnpm run build
# Upload .next/ to public_html

# Option 2: Node.js app
# Same as backend, but set startup file to: node_modules/next/dist/bin/next start
```

#### Setup cron job (Commission calculation)
```bash
# cPanel Cron Jobs
# Run at 00:00 on 1st day of month
0 0 1 * * /usr/bin/curl -X POST https://api.yourdomain.com/api/v1/commissions/calculate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period":"$(date +\%Y-\%m)"}'
```

---

## 🐛 Troubleshooting

### Backend Issues

#### Port already in use
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### Prisma Client not generated
```bash
pnpm prisma generate
# Restart TS server in VSCode: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

#### Database connection failed
```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u root -p -e "SELECT 1"

# Verify DATABASE_URL in .env
```

#### JWT token invalid
```bash
# Clear old tokens
# Frontend: localStorage.clear()

# Verify JWT_SECRET matches between backend and frontend
# Check token expiration time
```

### Frontend Issues

#### API calls failing (CORS)
```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['http://localhost:3001', 'https://yourdomain.com'],
  credentials: true,
});
```

#### Hydration error (Next.js)
```bash
# Ensure server and client render the same
# Check for dynamic data (dates, random numbers)
# Use useEffect for client-only code
```

#### Environment variables not loaded
```bash
# Restart dev server after changing .env.local
# Ensure variables start with NEXT_PUBLIC_ for client-side access
```

### Database Issues

#### Slow queries
```sql
-- Check slow queries
SHOW PROCESSLIST;

-- Add indexes
CREATE INDEX idx_user_sponsor ON users(sponsor_id);
CREATE INDEX idx_commission_period ON commissions(user_id, period);

-- Analyze table
ANALYZE TABLE commissions;
```

#### MLM tree query performance
```sql
-- Use closure table instead of recursive CTEs
-- Materialize path for read-heavy operations
-- Cache frequently accessed trees in Redis
```

### Deployment Issues (cPanel)

#### Node.js app not starting
```bash
# Check error logs in cPanel
# Verify Node.js version (18.x or 20.x)
# Ensure all dependencies installed: npm install --production
# Check Application Startup File path
```

#### Database connection on production
```bash
# Use 127.0.0.1 instead of localhost
DATABASE_URL="mysql://user:pass@127.0.0.1:3306/dbname"

# Or use cPanel database hostname
DATABASE_URL="mysql://user:pass@hostname:3306/dbname"
```

#### SSL certificate issues
```bash
# In cPanel, enable AutoSSL
# Force HTTPS redirect in .htaccess
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 📚 Resources

### Official Documentation
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)

### Payment Gateways
- [VNPay Documentation](https://sandbox.vnpayment.vn/apis/)
- [Momo Documentation](https://developers.momo.vn/)
- [Stripe Documentation](https://stripe.com/docs)
- [VietQR Specification](https://www.vietqr.io/danh-sach-api)

### Learning Resources
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [DBeaver](https://dbeaver.io/) - Database management
- [TablePlus](https://tableplus.com/) - Modern database client
- [Excalidraw](https://excalidraw.com/) - Diagrams & flowcharts

### Community
- [NestJS Discord](https://discord.gg/nestjs)
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [Prisma Community](https://www.prisma.io/community)

---

## 🎯 Next Steps

1. **Setup development environment**
   - Install prerequisites
   - Clone repository
   - Run backend & frontend

2. **Study the codebase**
   - Read this documentation thoroughly
   - Explore project structure
   - Run existing tests

3. **Start developing**
   - Pick a feature from Phase 1
   - Create feature branch
   - Implement following clean architecture
   - Write tests
   - Submit PR

4. **Deploy to staging**
   - Setup cPanel hosting
   - Deploy backend & frontend
   - Test in production-like environment

5. **Go to production**
   - Final testing
   - Deploy to production cPanel
   - Monitor logs & performance

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 👥 Contributors

- **Lead Developer**: [Your Name]
- **Backend Team**: [Names]
- **Frontend Team**: [Names]

---

**Last Updated**: October 7, 2025  
**Version**: 1.0.0  
**Maintained by**: Development Team

---

## 💡 Tips for New Developers

1. **Đọc kỹ Business Logic section** - Hiểu rõ cách MLM hoạt động trước khi code
2. **Follow Clean Architecture** - Tách biệt concerns, dễ test và maintain
3. **Write tests** - Đặc biệt là commission calculation logic
4. **Use TypeScript strictly** - Enable strict mode, avoid `any`
5. **Document your code** - Viết JSDoc cho public APIs
6. **Ask questions** - Prefer clarifying trước khi implement sai
7. **Code review** - Luôn request review trước khi merge
8. **Security first** - Validate inputs, sanitize outputs, check permissions

**Happy Coding! 🚀**
