# 🛍️ MLM E-commerce Platform

Multi-tier e-commerce system với multi-level marketing (MLM) commission structure.

## 🚀 Quick Deploy to Railway

### Option 1: Auto-Deploy (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Run auto-deploy script
./deploy-railway.sh
```

### Option 2: Manual Deploy

See detailed guide: **[DEPLOY.md](./DEPLOY.md)**

---

## 📦 Tech Stack

### Backend
- **Framework:** NestJS 10.3.0 with Fastify
- **Database:** MySQL with Prisma ORM
- **Authentication:** JWT with refresh tokens
- **Payment:** SePay integration
- **Security:** Helmet, CORS, Rate limiting

### Frontend
- **Framework:** React 18.3.1 with Vite
- **UI:** Tailwind CSS
- **State:** Zustand
- **Data Fetching:** TanStack React Query

---

## 📁 Project Structure

```
├── backend/              # NestJS backend API
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── infrastructure/
│   │   └── main.ts       # Entry point
│   ├── prisma/           # Database schema & migrations
│   ├── railway.json      # Railway config
│   └── package.json
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── main.tsx
│   └── package.json
│
├── deploy-railway.sh     # 🤖 Auto-deploy script
├── verify-deployment.sh  # 🔍 Deployment verification
└── DEPLOY.md            # Quick deploy guide
```

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your config

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start development server
npm run start:dev
```

Backend runs at: `http://localhost:3000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your backend URL

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🌐 Production Deployment

### Backend (Railway)

```bash
# Auto-deploy
./deploy-railway.sh

# Or manual
cd backend
railway init
railway add -d mysql
railway variables set NODE_ENV=production
# ... (see DEPLOY.md for full list)
railway up
```

### Frontend (Vercel)

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variable
vercel env add VITE_API_URL production
# Enter: https://your-backend.up.railway.app/api/v1
```

---

## ✅ Verify Deployment

```bash
# Run verification script
./verify-deployment.sh

# Or manual checks
curl https://your-backend.up.railway.app/api/v1/health
```

---

## 📚 Key Features

### MLM Commission System
- Multi-level commission tracking (F1-F6)
- Automatic commission calculation on order completion
- Wallet system with withdrawal requests
- Real-time commission notifications

### E-commerce
- Product catalog with variants
- Price tiers (quantity-based discounts)
- Shopping cart with checkout
- Order management
- Payment integration (SePay)

### Admin Panel
- User management with MLM tree visualization
- Product & variant management
- Order & commission tracking
- Dashboard with analytics
- Withdrawal request approval

### Security
- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting (100 req/min)
- CORS protection
- Helmet security headers
- Input validation
- SePay webhook authentication

---

## 🔐 Environment Variables

### Backend (Production)

See `.env.example` in backend folder for complete list.

**Critical variables:**
- `DATABASE_URL` - Auto-injected by Railway
- `JWT_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `JWT_REFRESH_SECRET` - Different from JWT_SECRET
- `SEPAY_API_KEY` - From SePay dashboard
- `CORS_ORIGIN` - Your frontend domain

### Frontend (Production)

```env
VITE_API_URL=https://your-backend.up.railway.app/api/v1
```

---

## 🛠️ Useful Commands

### Backend

```bash
# Development
npm run start:dev         # Start with hot reload
npm run build             # Build for production
npm run start:prod        # Start production server

# Database
npx prisma generate       # Generate Prisma Client
npx prisma migrate dev    # Run migrations (dev)
npx prisma migrate deploy # Run migrations (prod)
npx prisma studio         # Open Prisma Studio UI

# Admin
npm run admin:create      # Create admin user
```

### Frontend

```bash
npm run dev              # Development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
```

### Railway

```bash
railway logs             # View logs
railway logs --follow    # Real-time logs
railway status           # Service status
railway variables        # List env variables
railway domain           # Get domain
railway restart          # Restart service
```

---

## 📖 Documentation

- **[DEPLOY.md](./DEPLOY.md)** - Quick deployment guide
- **[backend/RAILWAY_DEPLOY_GUIDE.md](./backend/RAILWAY_DEPLOY_GUIDE.md)** - Detailed Railway deployment
- **[backend/START_HERE.md](./backend/START_HERE.md)** - Project navigation guide

---

## 🐛 Troubleshooting

### Build Failed
```bash
# Check logs
railway logs

# Verify dependencies
npm install

# Rebuild
railway up --detach
```

### Database Connection Issues
```bash
# Verify DATABASE_URL
railway variables | grep DATABASE_URL

# Check MySQL service
railway status

# Run migrations
railway run npx prisma migrate deploy
```

### CORS Errors
```bash
# Update CORS_ORIGIN
railway variables set CORS_ORIGIN="https://your-frontend.vercel.app,https://your-backend.up.railway.app"
```

---

## 📞 Support

- Check logs: `railway logs`
- View status: `railway status`
- Restart service: `railway restart`
- See troubleshooting: `backend/RAILWAY_DEPLOY_GUIDE.md`

---

## 📄 License

MIT

---

**Built with ❤️ using NestJS, React, and Railway**
