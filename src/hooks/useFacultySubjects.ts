import { useQuery } from '@tanstack/react-query';
import { getStoredToken } from '../lib/auth';

export type FacultySubject = {
  id: string;
  title: string;
  code: string;
  slug: string;
  iconKey: string;
  description: string;
};

export function useFacultySubjects() {
  const token = getStoredToken();

  return useQuery({
    queryKey: ['faculty-subjects'],
    queryFn: async () => {
      const response = await fetch('/api/faculty/subjects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: FacultySubject[];
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load faculty subjects');
      }

      return data.data;
    },
    enabled: Boolean(token),
  });
}
