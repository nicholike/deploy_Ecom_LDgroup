/**
 * User hooks for data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import { QUERY_KEYS } from '@/shared/constants/config';
import type { UserFilters, CreateUserDto, UpdateUserDto } from '../types/user.types';
import type { PaginationParams } from '@/shared/types/common.types';

/**
 * Hook to fetch paginated users list
 */
export function useUsers(params: Partial<UserFilters & PaginationParams> = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, params],
    queryFn: () => userService.getUsers(params),
  });
}

/**
 * Hook to fetch single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.USER, id],
    queryFn: () => userService.getUserById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateUserDto) => userService.createUser(dto),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
    },
  });
}

/**
 * Hook to update user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) =>
      userService.updateUser(id, dto),
    onSuccess: (_, variables) => {
      // Invalidate specific user and users list
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER, variables.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
    },
  });
}

/**
 * Hook to delete user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
    },
  });
}

/**
 * Hook to get user's MLM tree
 */
export function useUserTree(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.USER_TREE, id],
    queryFn: () => userService.getUserTree(id),
    enabled: !!id,
  });
}
