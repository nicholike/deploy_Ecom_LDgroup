import { useEffect } from 'react';

/**
 * Custom hook to dynamically update document title
 * @param title - The page title (will append " | LDGroup" automatically)
 * @param options - Optional configuration
 */
export const useDocumentTitle = (
  title: string,
  options?: {
    suffix?: string;
    preserveOnUnmount?: boolean;
  }
) => {
  const suffix = options?.suffix || 'LDGroup';
  const fullTitle = title ? `${title} | ${suffix}` : suffix;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = fullTitle;

    return () => {
      if (!options?.preserveOnUnmount) {
        document.title = previousTitle;
      }
    };
  }, [fullTitle, options?.preserveOnUnmount]);
};

export default useDocumentTitle;
