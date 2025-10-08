# 🔐 Authentication Flow

## Login Flow Overview

```
User fills form → Submit → API Call → Success → Redirect based on Role
                                    ↓ Error
                                Show error message
```

## 📍 Redirect Logic After Login

### Automatic Redirect (by Role)

File: `src/features/auth/hooks/useAuth.ts` (line 32-39, 74-86)

```typescript
function getRedirectPath(role: string): string {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
      return '/dashboard';      // Admin/Manager Dashboard

    case 'DISTRIBUTOR':
      return '/distributor';    // Distributor Portal

    case 'CUSTOMER':
      return '/customer';       // Customer Portal

    default:
      return '/';               // Home Page (Ashion Template)
  }
}
```

### Redirect Routes Table

| User Role | Redirect To | Description |
|-----------|-------------|-------------|
| `ADMIN` | `/dashboard` | Admin dashboard với full permissions |
| `MANAGER` | `/dashboard` | Manager dashboard với limited permissions |
| `DISTRIBUTOR` | `/distributor` | Distributor portal để quản lý downline |
| `CUSTOMER` | `/customer` | Customer portal để mua hàng |
| **Others** | `/` | **Trang chính (Ashion)** |

## 🚀 How It Works

### 1. User submits login form
```typescript
// src/app/(auth)/login/page.tsx
const handleSignIn = (event) => {
  event.preventDefault();
  const email = formData.get('email');
  const password = formData.get('password');

  login({ email, password });
}
```

### 2. `useLogin` hook calls API
```typescript
// src/features/auth/hooks/useAuth.ts
export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (dto) => authService.login(dto),
    onSuccess: (data) => {
      // 1. Cache user data
      queryClient.setQueryData(['auth-me'], data.user);

      // 2. Get redirect path based on role
      const redirectPath = getRedirectPath(data.user.role);

      // 3. Redirect
      router.push(redirectPath);
    },
  });
}
```

### 3. API Response Format
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER"  // ← This determines redirect
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 4. Automatic Redirect
- ✅ **Role = CUSTOMER** → Redirect to `/` (Home page with Ashion template)
- ✅ **Role = ADMIN** → Redirect to `/dashboard`
- ✅ **No manual redirect needed in login page**

## 🔧 Login Page Implementation

File: `src/app/(auth)/login/page.tsx`

```typescript
login(
  { email, password },
  {
    onSuccess: () => {
      // ✅ Redirect happens automatically in useLogin hook
      console.log('Login successful, redirecting...');
    },
    onError: (err) => {
      // ❌ Show error message
      setErrorMessage(err?.response?.data?.error?.message);
    },
  }
);
```

## 🧪 Testing Login Flow

### Test Cases

1. **Login as Customer**
   - Email: `customer@example.com`
   - Expected: Redirect to `/` (Ashion home page)

2. **Login as Admin**
   - Email: `admin@example.com`
   - Expected: Redirect to `/dashboard`

3. **Login with Invalid Credentials**
   - Expected: Show error message, stay on login page

4. **Login with Network Error**
   - Expected: Show error message, stay on login page

## 🔄 Logout Flow

```typescript
// Anywhere in the app
const { mutate: logout } = useLogout();

logout(); // → Clears cache → Redirects to /login
```

## 📝 Notes

- ✅ **Automatic redirect** based on user role
- ✅ **No manual navigation** needed in login page
- ✅ **Token stored** automatically by authService
- ✅ **User data cached** in React Query
- ✅ **Error handling** with friendly messages
- ✅ **Loading state** shows "Đang đăng nhập..."

## 🐛 Troubleshooting

### Issue: Not redirecting after login
**Check:**
1. API response has `user.role` field
2. Console shows "Login successful, redirecting..."
3. No errors in browser console

### Issue: Redirecting to wrong page
**Check:**
1. User role in API response
2. `getRedirectPath()` function logic
3. Routes are correctly configured

## 🔗 Related Files

- Login Page: `src/app/(auth)/login/page.tsx`
- Auth Hook: `src/features/auth/hooks/useAuth.ts`
- Auth Service: `src/features/auth/services/auth.service.ts`
- Auth Types: `src/features/auth/types/auth.types.ts`
