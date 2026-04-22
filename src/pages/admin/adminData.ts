import { useQuery } from '@tanstack/react-query';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import { getStoredToken } from '../../lib/auth';

export type AdminFacultyUser = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  username: string;
  email: string;
  address: string;
  contactNumber: string;
  birthdate: string;
  section: string;
  profileImage?: string | null;
};

export type AdminHrUser = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  username: string;
  email: string;
  address: string;
  contactNumber: string;
  birthdate: string;
  section: string;
  department: string;
  employeeNumber: string;
  position: string;
  employmentStatus: 'onboarding' | 'active' | 'on-leave' | 'inactive';
  hireDate: string;
  salaryRate: number;
  paySchedule: 'monthly' | 'semi-monthly' | 'hourly';
  emergencyContactName: string;
  emergencyContactNumber: string;
  profileImage?: string | null;
};

export type AdminStudentUser = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  username: string;
  email: string;
  address: string;
  contactNumber: string;
  birthdate: string;
  section: string;
  course: string;
  batchNumber: string;
  sectionNumber: string;
  studentType: 'new' | 'old';
  completedSubjectIds: string[];
  studentEvaluation: {
    status: 'not-required' | 'pending' | 'eligible' | 'blocked';
    evaluatedAt: string;
    remarks: string;
    subjectResults: Array<{
      subjectId: string;
      prerequisiteSubjectIds: string[];
      metPrerequisiteSubjectIds: string[];
      missingPrerequisiteSubjectIds: string[];
      isEligible: boolean;
    }>;
  };
  profileImage?: string | null;
};

export type AdminSubject = {
  id: string;
  title: string;
  code: string;
  slug: string;
  iconKey: string;
  description: string;
  yearLevel: string;
  semester: string;
  units: {
    lec: number;
    lab: number;
  };
  hours: {
    lec: number;
    lab: number;
  };
  prerequisiteSubjectIds: string[];
  prerequisites: Array<{
    subjectId: string;
    subjectTitle: string;
    subjectCode: string;
  }>;
  resultantQualification: string;
  jobRoles: string[];
  curriculumCount: number;
  teacherCount: number;
};

export type AdminCurriculum = {
  id: string;
  title: string;
  code: string;
  description: string;
  linkedSectionCount: number;
  subjects: Array<{
    subjectId: string;
    subjectTitle: string;
    subjectCode: string;
  }>;
};

export type AdminSection = {
  id: string;
  name: string;
  course: string;
  batchNumber: string;
  sectionNumber: string;
  adviserId: string | null;
  adviserName: string;
  adviserUsername: string;
  adviserSection: string;
  curriculumId: string | null;
  curriculumTitle: string;
  curriculumCode: string;
  studentCount: number;
  subjectAssignments: Array<{
    subjectId: string;
    subjectTitle: string;
    subjectCode: string;
    teacherId: string | null;
    teacherName: string;
    teacherSection: string;
    teacherUsername: string;
    schedule: string;
  }>;
};

export type AdminOverviewResponse = {
  metrics: {
    subjectCount: number;
    curriculumCount: number;
    facultyCount: number;
    hrCount: number;
    studentCount: number;
    sectionCount: number;
  };
  availableSections: string[];
  facultyUsers: AdminFacultyUser[];
  hrUsers: AdminHrUser[];
  studentUsers: AdminStudentUser[];
  subjects: AdminSubject[];
  curriculums: AdminCurriculum[];
  sections: AdminSection[];
};

async function fetchAdminOverview(token: string) {
  const response = await fetch('/api/admin/overview', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as {
    message?: string;
    data?: AdminOverviewResponse;
  };

  if (!response.ok || !data.data) {
    throw new Error(data.message || 'Failed to load admin overview');
  }

  return data.data;
}

export function useAdminOverview() {
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();

  const adminOverviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => fetchAdminOverview(token ?? ''),
    enabled: Boolean(token && activeUser && !isError),
  });

  return {
    activeUser,
    isError,
    token,
    adminOverviewQuery,
  };
}

export function getFullName(user?: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
} | null) {
  return [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(' ');
}
