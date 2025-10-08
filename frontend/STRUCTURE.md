# Project Structure & Conventions

## 📁 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth routes group (no header/footer)
│   │   ├── layout.tsx           # Auth layout (Tailwind CSS)
│   │   └── login/               # Login page
│   ├── dashboard/               # Protected dashboard routes
│   ├── layout.tsx               # Root layout (Bootstrap CSS for Ashion)
│   ├── page.tsx                 # Home page (Ashion template)
│   └── providers.tsx            # React Query provider
│
├── components/                   # Reusable UI components
│   ├── layouts/                 # Layout components (Ashion template)
│   │   ├── Header.tsx           # Main header (Bootstrap)
│   │   ├── Footer.tsx           # Main footer (Bootstrap)
│   │   └── index.ts             # Exports
│   ├── auth/                    # Auth-specific components
│   │   ├── SignInPage.tsx       # Login UI (Tailwind)
│   │   └── index.ts             # Exports
│   └── index.ts                 # Barrel export
│
├── features/                     # Feature-based modules
│   ├── auth/                    # Authentication feature
│   │   ├── hooks/               # useLogin, useAuth
│   │   ├── services/            # API calls
│   │   ├── types/               # TypeScript types
│   │   └── index.ts             # Feature exports
│   └── user/                    # User management feature
│
├── shared/                       # Shared utilities
│   ├── components/              # Shared UI components
│   ├── hooks/                   # Shared hooks
│   ├── lib/                     # Utilities (API client, etc)
│   └── types/                   # Shared types
│
└── styles/
    └── globals.css              # Tailwind CSS + custom animations
```

## 🎨 CSS Strategy

### Two Separate CSS Systems

1. **Bootstrap (Ashion Template)** - Main pages
   - Loaded in: `app/layout.tsx`
   - Used by: Home, Shop, Product pages
   - Files: `/public/css/bootstrap.min.css`, `/public/css/style.css`

2. **Tailwind CSS** - Auth pages
   - Loaded in: `app/(auth)/layout.tsx`
   - Used by: Login, Register pages
   - File: `src/styles/globals.css`

### Why Two Systems?

- ✅ **Isolation**: Auth pages don't interfere with Ashion template
- ✅ **Maintainability**: Easy to update each system independently
- ✅ **Performance**: Only load necessary CSS per route group

## 📦 Component Organization

### Naming Conventions

```typescript
// Components: PascalCase
export const SignInPage = () => { ... }
export const Header = () => { ... }

// Files: PascalCase.tsx
SignInPage.tsx
Header.tsx

// Folders: lowercase-with-dashes (if needed) or lowercase
components/
layouts/
auth/
```

### Import Patterns

```typescript
// ✅ Good: Import from index barrel
import { SignInPage } from '@/components/auth';
import { Header, Footer } from '@/components/layouts';

// ❌ Bad: Direct file imports
import { SignInPage } from '@/components/auth/SignInPage';
```

## 🔧 Adding New Components

### 1. Layout Components (Ashion Template)
```bash
src/components/layouts/NewComponent.tsx
```
- Use Bootstrap classes
- Export in `layouts/index.ts`

### 2. Auth Components (Tailwind)
```bash
src/components/auth/NewAuthComponent.tsx
```
- Use Tailwind classes
- Export in `auth/index.ts`

### 3. Shared Components
```bash
src/shared/components/common/NewSharedComponent.tsx
```

## 🚀 Feature Development

### Feature Structure
```
features/
└── feature-name/
    ├── components/      # Feature-specific UI
    ├── hooks/          # Feature-specific hooks
    ├── services/       # API calls
    ├── types/          # TypeScript types
    └── index.ts        # Public API
```

### Example: New Feature
```typescript
// features/product/index.ts
export { useProducts } from './hooks/useProducts';
export { ProductCard } from './components/ProductCard';
export type { Product } from './types/product.types';
```

## 📝 Best Practices

1. **Component Location**
   - Layout/Template components → `components/layouts/`
   - Auth UI → `components/auth/`
   - Feature UI → `features/[feature]/components/`
   - Shared UI → `shared/components/`

2. **CSS Classes**
   - Main pages → Bootstrap classes (`container`, `row`, `col-lg-6`)
   - Auth pages → Tailwind classes (`flex`, `items-center`, `bg-primary`)

3. **Imports**
   - Always use barrel exports (`index.ts`)
   - Use path aliases (`@/components`, `@/features`)

4. **TypeScript**
   - Define interfaces/types in separate files
   - Export types alongside components

## 🧪 Testing Routes

- Home (Ashion): http://localhost:3001
- Login (Tailwind): http://localhost:3001/login
- Dashboard: http://localhost:3001/dashboard

## 📚 Related Docs

- Next.js App Router: https://nextjs.org/docs/app
- Tailwind CSS: https://tailwindcss.com/docs
- Bootstrap 4: https://getbootstrap.com/docs/4.6
