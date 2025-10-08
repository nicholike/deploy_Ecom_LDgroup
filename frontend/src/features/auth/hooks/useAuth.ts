/**
 * Authentication hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import { QUERY_KEYS } from '@/shared/constants/config';
import type { LoginDto, ChangePasswordDto } from '../types/auth.types';
import { useRouter } from 'next/navigation';

/**
 * Hook to get current authenticated user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: [QUERY_KEYS.AUTH_ME],
    queryFn: () => authService.getCurrentUser(),
    enabled: authService.isAuthenticated(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for login
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: LoginDto) => authService.login(dto),
    onSuccess: (data) => {
      // Set user data in cache
      queryClient.setQueryData([QUERY_KEYS.AUTH_ME], data.user);
      
      // Redirect based on role
      const redirectPath = getRedirectPath(data.user.role);
      router.push(redirectPath);
    },
  });
}

/**
 * Hook for logout
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      
      // Redirect to login
      router.push('/login');
    },
  });
}

/**
 * Hook to change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => authService.changePassword(dto),
  });
}

/**
 * Helper function to get redirect path based on role
 */
function getRedirectPath(role: string): string {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
      return '/dashboard';
    case 'DISTRIBUTOR':
      return '/distributor';
    case 'CUSTOMER':
      return '/customer';
    default:
      return '/';
  }
}
