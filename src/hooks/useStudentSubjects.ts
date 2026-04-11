import { useQuery } from '@tanstack/react-query';
import { getStoredToken } from '../lib/auth';

export type StudentSubject = {
  id: string;
  title: string;
  code: string;
  slug: string;
  iconKey: string;
  description: string;
};

export function useStudentSubjects(enabled = true) {
  const token = getStoredToken();

  return useQuery({
    queryKey: ['student-subjects'],
    queryFn: async () => {
      const response = await fetch('/api/student/subjects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: StudentSubject[];
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load subjects');
      }

      return data.data;
    },
    enabled: Boolean(token && enabled),
  });
}
