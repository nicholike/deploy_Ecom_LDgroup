import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

/**
 * Custom hook to get user's display name (firstName + lastName)
 * Returns the full name if available, otherwise undefined
 */
export const useUserName = (): string | undefined => {
  const { accessToken, user } = useAuth();
  const [userName, setUserName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadUserName = async () => {
      if (!accessToken) {
        setUserName(undefined);
        return;
      }

      try {
        // If user is already available in context, use it
        if (user?.firstName || user?.lastName) {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          setUserName(fullName || undefined);
          return;
        }

        // Otherwise, fetch user profile
        const profile = await authService.getProfile(accessToken);
        if (profile.firstName || profile.lastName) {
          const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
          setUserName(fullName || undefined);
        } else {
          setUserName(undefined);
        }
      } catch (error) {
        console.error('Failed to load user name:', error);
        setUserName(undefined);
      }
    };

    loadUserName();
  }, [accessToken, user]);

  return userName;
};
