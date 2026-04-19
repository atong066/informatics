import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCode,
  FiCpu,
  FiDatabase,
  FiEdit2,
  FiEye,
  FiExternalLink,
  FiLayers,
  FiLink2,
  FiList,
  FiPackage,
  FiPaperclip,
  FiPlay,
  FiPlus,
  FiTrash2,
  FiTrendingUp,
  FiUploadCloud,
  FiUsers,
  FiVideo,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomMultiSelect from '../../components/CustomMultiSelect';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { getStoredToken } from '../../lib/auth';

type AttachmentRecord = {
  id?: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  size: number;
};

type MeetingRecord = {
  id: string;
  title: string;
  agenda: string;
  roomName: string;
  sectionName: string;
  schedule: string;
  source: 'manual' | 'schedule';
  status: 'scheduled' | 'live' | 'ended';
  startedAt: string;
  endedAt: string;
  aiStatus: 'idle' | 'processing' | 'ready' | 'failed';
  aiStatusLabel: string;
  transcriptText: string;
  aiNotes: string;
  recordingName: string;
  recordingUrl: string;
  recordingMimeType: string;
  recordingSize: number;
  noteError: string;
  createdAt: string;
  updatedAt: string;
  joinUrl: string;
};

type FacultySubjectDetailsResponse = {
  id: string;
  title: string;
  code: string;
  slug: string;
  iconKey: string;
  description: string;
  availableSections: string[];
  lessonProgress: Array<{
    id: string;
    lesson: string;
    summary: string;
    completion: number;
    state: string;
    subtopics: Array<{
      id: string;
      title: string;
      isCompleted: boolean;
    }>;
  }>;
  modules: Array<{
    id: string;
    title: string;
    summary: string;
    lessonId: string;
    topicTitle: string;
    referenceLinks: string[];
    attachments: AttachmentRecord[];
    progress: string;
    completion?: number;
  }>;
  activities: Array<{
    id: string;
    title: string;
    detail: string;
    dueDate: string;
    activityType: 'text' | 'file';
    attachments: AttachmentRecord[];
    submittedCount: number;
    totalStudents: number;
    status: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    detail: string;
    dueDate: string;
    assignmentType: 'text' | 'file';
    attachments: AttachmentRecord[];
    submittedCount: number;
    totalStudents: number;
    status: string;
  }>;
  assessments: Array<{
    id: string;
    title: string;
    detail: string;
    schedule: string;
    assessmentType: 'quiz' | 'quarter-exam';
    targetSections: string[];
    targetSectionLabel: string;
    startTime: string;
    endTime: string;
    questionCount: number;
    takenCount: number;
    totalStudents: number;
    status: string;
  }>;
  meetings: MeetingRecord[];
};

const subjectTabs = [
  { id: 'lesson-progress', label: 'Lesson Progress', icon: FiTrendingUp },
  { id: 'modules', label: 'Modules', icon: FiPackage },
  { id: 'activities', label: 'Activities', icon: FiLayers },
  { id: 'assignments', label: 'Assignments', icon: FiClipboard },
  { id: 'assessments', label: 'Assessment', icon: FiCheckCircle },
  { id: 'meetings', label: 'Meetings', icon: FiVideo },
] as const;

type SubjectTabId = (typeof subjectTabs)[number]['id'];

function getSubjectIcon(iconKey: string) {
  switch (iconKey) {
    case 'database':
      return FiDatabase;
    case 'code':
      return FiCode;
    case 'cpu':
      return FiCpu;
    default:
      return FiBookOpen;
  }
}

function statusTone(status: string) {
  switch (status) {
    case 'Open':
    case 'Scheduled':
    case 'Active':
    case 'Completed':
    case 'Live':
    case 'Ready':
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
    case 'In progress':
    case 'Due soon':
    case 'Upcoming':
    case 'Processing':
      return 'border-[#f2d9bc] bg-[#fff5e8] text-[#b06b15]';
    case 'Ended':
      return 'border-[#c8d9ec] bg-[#eef4fa] text-[#2f78bc]';
    case 'Failed':
      return 'border-[#ecd0d0] bg-[#fff2f2] text-[#b35a5a]';
    default:
      return 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]';
  }
}

function EmptyTabState({ label }: { label: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#cfdeea] bg-[linear-gradient(180deg,rgba(252,254,255,0.98)_0%,rgba(240,246,252,0.96)_100%)] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      <p className="text-fluid-md font-semibold text-[#173b70]">No {label.toLowerCase()} yet</p>
      <p className="mt-2 text-fluid-sm text-[#6a839d]">
        This section will stay empty until records are added from the database.
      </p>
    </div>
  );
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCalendarDate(value: string) {
  if (!value) {
    return 'No deadline';
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string, fallback = 'Not available') {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTimeLabel(value: string) {
  if (!value) {
    return '';
  }

  const [hours, minutes] = value.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAssessmentWindow(startTime: string, endTime: string) {
  if (!startTime && !endTime) {
    return 'Time not set';
  }

  if (startTime && endTime) {
    return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
  }

  return formatTimeLabel(startTime || endTime);
}

function formatMeetingStatus(status: MeetingRecord['status']) {
  switch (status) {
    case 'live':
      return 'Live';
    case 'ended':
      return 'Ended';
    default:
      return 'Scheduled';
  }
}

const activityTypeOptions = [
  { label: 'Text only', value: 'text' },
  { label: 'File upload', value: 'file' },
] as const;

const assessmentTypeOptions = [
  { label: 'Quiz', value: 'quiz' },
  { label: 'Quarter exam', value: 'quarter-exam' },
] as const;

function formatAssessmentType(value: 'quiz' | 'quarter-exam') {
  return value === 'quarter-exam' ? 'Quarter exam' : 'Quiz';
}

async function readFilesAsDataUrls(fileList: FileList | null) {
  if (!fileList || fileList.length === 0) {
    return [];
  }

  const files = Array.from(fileList);

  return Promise.all(
    files.map(
      (file) =>
        new Promise<AttachmentRecord>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (typeof reader.result !== 'string') {
              reject(new Error(`Unable to read "${file.name}"`));
              return;
            }

            resolve({
              name: file.name,
              dataUrl: reader.result,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
            });
          };

          reader.onerror = () => {
            reject(new Error(`Unable to read "${file.name}"`));
          };

          reader.readAsDataURL(file);
        }),
    ),
  );
}

function FacultySubjectDetails() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const activityAttachmentInputRef = useRef<HTMLInputElement>(null);
  const assignmentAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SubjectTabId>('lesson-progress');
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [isSubtopicModalOpen, setIsSubtopicModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<MeetingRecord | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [subtopicTitle, setSubtopicTitle] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleSummary, setModuleSummary] = useState('');
  const [moduleLessonId, setModuleLessonId] = useState('');
  const [moduleLinkInput, setModuleLinkInput] = useState('');
  const [moduleReferenceLinks, setModuleReferenceLinks] = useState<string[]>([]);
  const [moduleAttachments, setModuleAttachments] = useState<AttachmentRecord[]>([]);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityType, setActivityType] = useState<'text' | 'file'>('text');
  const [activityDetail, setActivityDetail] = useState('');
  const [activityDeadline, setActivityDeadline] = useState('');
  const [activityAttachments, setActivityAttachments] = useState<AttachmentRecord[]>([]);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentType, setAssignmentType] = useState<'text' | 'file'>('text');
  const [assignmentDetail, setAssignmentDetail] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');
  const [assignmentAttachments, setAssignmentAttachments] = useState<AttachmentRecord[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'quarter-exam'>('quiz');
  const [assessmentTargetSections, setAssessmentTargetSections] = useState<string[]>(['All sections']);
  const [assessmentDetail, setAssessmentDetail] = useState('');
  const [assessmentSchedule, setAssessmentSchedule] = useState('');
  const [assessmentStartTime, setAssessmentStartTime] = useState('');
  const [assessmentEndTime, setAssessmentEndTime] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    lessonTitle?: string;
    lessonSummary?: string;
    subtopicTitle?: string;
    moduleTitle?: string;
    moduleSummary?: string;
    moduleLessonId?: string;
    moduleLinkInput?: string;
    moduleAttachments?: string;
    activityTitle?: string;
    activityType?: string;
    activityDetail?: string;
    activityDeadline?: string;
    activityAttachments?: string;
    assignmentTitle?: string;
    assignmentType?: string;
    assignmentDetail?: string;
    assignmentDeadline?: string;
    assignmentAttachments?: string;
    assessmentTitle?: string;
    assessmentType?: string;
    assessmentTargetSections?: string;
    assessmentDetail?: string;
    assessmentSchedule?: string;
    assessmentStartTime?: string;
    assessmentEndTime?: string;
  }>({});
  const [popupState, setPopupState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const subjectQuery = useQuery({
    queryKey: ['faculty-subject-detail', subjectId],
    queryFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: FacultySubjectDetailsResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load subject details');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId),
    refetchInterval: (query) =>
      query.state.data?.meetings.some((meeting) => meeting.aiStatus === 'processing')
        ? 5000
        : false,
  });

  const addLessonMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: lessonTitle,
          summary: lessonSummary,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to create lesson',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      setIsAddLessonModalOpen(false);
      setLessonTitle('');
      setLessonSummary('');
      setFieldErrors({});
      setPopupState({
        open: true,
        title: 'Lesson added',
        message: 'The lesson is now saved and ready for tracking.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors({
        lessonTitle: error.errors?.title?.[0],
        lessonSummary: error.errors?.summary?.[0],
      });
      setPopupState({
        open: true,
        title: 'Unable to add lesson',
        message: error.message || 'Please review the lesson details and try again.',
        variant: 'error',
      });
    },
  });

  const addSubtopicMutation = useMutation({
    mutationFn: async ({ lessonId, title }: { lessonId: string; title: string }) => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/lessons/${lessonId}/subtopics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to add subtopic',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      setSubtopicTitle('');
      setFieldErrors((current) => ({ ...current, subtopicTitle: undefined }));
      setPopupState({
        open: true,
        title: 'Subtopic added',
        message: 'The lesson now has a new subtopic ready for completion tracking.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors((current) => ({
        ...current,
        subtopicTitle: error.errors?.title?.[0],
      }));
      setPopupState({
        open: true,
        title: 'Unable to add subtopic',
        message: error.message || 'Please review the subtopic details and try again.',
        variant: 'error',
      });
    },
  });

  const toggleSubtopicMutation = useMutation({
    mutationFn: async ({
      lessonId,
      subtopicId,
      isCompleted,
    }: {
      lessonId: string;
      subtopicId: string;
      isCompleted: boolean;
    }) => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/lessons/${lessonId}/subtopics/${subtopicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isCompleted }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update subtopic');
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: Error) => {
      setPopupState({
        open: true,
        title: 'Unable to update progress',
        message: error.message || 'Please try again.',
        variant: 'error',
      });
    },
  });

  const createModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: moduleTitle,
          summary: moduleSummary,
          lessonId: moduleLessonId,
          referenceLinks: moduleReferenceLinks,
          attachments: moduleAttachments,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to create module',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      closeModuleModal(true);
      setPopupState({
        open: true,
        title: 'Module added',
        message: 'The module is now attached to the selected topic.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors((current) => ({
        ...current,
        moduleTitle: error.errors?.title?.[0],
        moduleSummary: error.errors?.summary?.[0],
        moduleLessonId: error.errors?.lessonId?.[0],
      }));
      setPopupState({
        open: true,
        title: 'Unable to add module',
        message: error.message || 'Please review the module details and try again.',
        variant: 'error',
      });
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: activityTitle,
          activityType,
          detail: activityDetail,
          dueDate: activityDeadline,
          attachments: activityAttachments,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to create activity',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      closeActivityModal(true);
      setPopupState({
        open: true,
        title: 'Activity added',
        message: 'The activity is now available in this subject tab.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors((current) => ({
        ...current,
        activityTitle: error.errors?.title?.[0],
        activityType: error.errors?.activityType?.[0],
        activityDetail: error.errors?.detail?.[0],
        activityDeadline: error.errors?.dueDate?.[0],
        activityAttachments: error.errors?.attachments?.[0],
      }));
      setPopupState({
        open: true,
        title: 'Unable to add activity',
        message: error.message || 'Please review the activity details and try again.',
        variant: 'error',
      });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: assignmentTitle,
          assignmentType,
          detail: assignmentDetail,
          dueDate: assignmentDeadline,
          attachments: assignmentAttachments,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to create assignment',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      closeAssignmentModal(true);
      setPopupState({
        open: true,
        title: 'Assignment added',
        message: 'The assignment is now available in this subject tab.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors((current) => ({
        ...current,
        assignmentTitle: error.errors?.title?.[0],
        assignmentType: error.errors?.assignmentType?.[0],
        assignmentDetail: error.errors?.detail?.[0],
        assignmentDeadline: error.errors?.dueDate?.[0],
        assignmentAttachments: error.errors?.attachments?.[0],
      }));
      setPopupState({
        open: true,
        title: 'Unable to add assignment',
        message: error.message || 'Please review the assignment details and try again.',
        variant: 'error',
      });
    },
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: assessmentTitle,
          assessmentType,
          targetSections: assessmentTargetSections,
          detail: assessmentDetail,
          schedule: assessmentSchedule,
          startTime: assessmentStartTime,
          endTime: assessmentEndTime,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to create assessment',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      closeAssessmentModal(true);
      setPopupState({
        open: true,
        title: 'Assessment added',
        message: 'The assessment is ready. You can open it now to start adding questions.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors((current) => ({
        ...current,
        assessmentTitle: error.errors?.title?.[0],
        assessmentType: error.errors?.assessmentType?.[0],
        assessmentTargetSections: error.errors?.targetSections?.[0],
        assessmentDetail: error.errors?.detail?.[0],
        assessmentSchedule: error.errors?.schedule?.[0],
        assessmentStartTime: error.errors?.startTime?.[0],
        assessmentEndTime: error.errors?.endTime?.[0],
      }));
      setPopupState({
        open: true,
        title: 'Unable to add assessment',
        message: error.message || 'Please review the assessment details and try again.',
        variant: 'error',
      });
    },
  });

  const updateAssessmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/assessments/${editingAssessmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: assessmentTitle,
          assessmentType,
          targetSections: assessmentTargetSections,
          detail: assessmentDetail,
          schedule: assessmentSchedule,
          startTime: assessmentStartTime,
          endTime: assessmentEndTime,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to update assessment',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      closeAssessmentModal(true);
      setPopupState({
        open: true,
        title: 'Assessment updated',
        message: 'The assessment details were updated successfully.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors((current) => ({
        ...current,
        assessmentTitle: error.errors?.title?.[0],
        assessmentType: error.errors?.assessmentType?.[0],
        assessmentTargetSections: error.errors?.targetSections?.[0],
        assessmentDetail: error.errors?.detail?.[0],
        assessmentSchedule: error.errors?.schedule?.[0],
        assessmentStartTime: error.errors?.startTime?.[0],
        assessmentEndTime: error.errors?.endTime?.[0],
      }));
      setPopupState({
        open: true,
        title: 'Unable to update assessment',
        message: error.message || 'Please review the assessment details and try again.',
        variant: 'error',
      });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/modules/${editingModuleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: moduleTitle,
          summary: moduleSummary,
          lessonId: moduleLessonId,
          referenceLinks: moduleReferenceLinks,
          attachments: moduleAttachments,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to update module',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      closeModuleModal(true);
      setPopupState({
        open: true,
        title: 'Module updated',
        message: 'The module details were updated successfully.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors((current) => ({
        ...current,
        moduleTitle: error.errors?.title?.[0],
        moduleSummary: error.errors?.summary?.[0],
        moduleLessonId: error.errors?.lessonId?.[0],
      }));
      setPopupState({
        open: true,
        title: 'Unable to update module',
        message: error.message || 'Please review the module details and try again.',
        variant: 'error',
      });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete module');
      }

      return data;
    },
    onSuccess: async () => {
      setPopupState({
        open: true,
        title: 'Module deleted',
        message: 'The module was removed from this subject.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: Error) => {
      setPopupState({
        open: true,
        title: 'Unable to delete module',
        message: error.message || 'Please try again.',
        variant: 'error',
      });
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete assessment');
      }

      return data;
    },
    onSuccess: async () => {
      setPopupState({
        open: true,
        title: 'Assessment deleted',
        message: 'The assessment was removed from this subject.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] });
    },
    onError: (error: Error) => {
      setPopupState({
        open: true,
        title: 'Unable to delete assessment',
        message: error.message || 'Please try again.',
        variant: 'error',
      });
    },
  });

  const startMeetingMutation = useMutation({
    mutationFn: async (nextMeetingId: string) => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/meetings/${nextMeetingId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start conference');
      }

      return data;
    },
    onSuccess: async (_data, nextMeetingId) => {
      setPopupState({
        open: true,
        title: 'Conference started',
        message: 'Students can now open the live room.',
        variant: 'success',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-classroom'] }),
      ]);
      navigate(`/faculty/subjects/${subjectId}/meetings/${nextMeetingId}/classroom`);
    },
    onError: (error: Error) => {
      setPopupState({
        open: true,
        title: 'Unable to start conference',
        message: error.message || 'Please try again.',
        variant: 'error',
      });
    },
  });

  if (!activeUser || isError) {
    return null;
  }

  const fullName = [activeUser.firstName, activeUser.middleName, activeUser.lastName]
    .filter(Boolean)
    .join(' ');

  if (!subjectQuery.isLoading && subjectQuery.isError) {
    return <Navigate to="/faculty/dashboard" replace />;
  }

  const subject = subjectQuery.data;
  const SubjectIcon = getSubjectIcon(subject?.iconKey ?? 'book');
  const activeLesson = subject?.lessonProgress.find((item) => item.id === activeLessonId) ?? null;
  const topicOptions =
    subject?.lessonProgress.map((item) => ({
      label: item.lesson,
      value: item.id,
    })) ?? [];

  const activeCount = useMemo(() => {
    if (!subject) {
      return 0;
    }

    switch (activeTab) {
      case 'lesson-progress':
        return subject.lessonProgress.length;
      case 'modules':
        return subject.modules.length;
      case 'activities':
        return subject.activities.length;
      case 'assignments':
        return subject.assignments.length;
      case 'assessments':
        return subject.assessments.length;
      case 'meetings':
        return subject.meetings.length;
      default:
        return 0;
    }
  }, [activeTab, subject]);

  function resetActivityForm() {
    setActivityTitle('');
    setActivityType('text');
    setActivityDetail('');
    setActivityDeadline('');
    setActivityAttachments([]);
    setFieldErrors((current) => ({
      ...current,
      activityTitle: undefined,
      activityType: undefined,
      activityDetail: undefined,
      activityDeadline: undefined,
      activityAttachments: undefined,
    }));
    if (activityAttachmentInputRef.current) {
      activityAttachmentInputRef.current.value = '';
    }
  }

  function resetAssignmentForm() {
    setAssignmentTitle('');
    setAssignmentType('text');
    setAssignmentDetail('');
    setAssignmentDeadline('');
    setAssignmentAttachments([]);
    setFieldErrors((current) => ({
      ...current,
      assignmentTitle: undefined,
      assignmentType: undefined,
      assignmentDetail: undefined,
      assignmentDeadline: undefined,
      assignmentAttachments: undefined,
    }));
    if (assignmentAttachmentInputRef.current) {
      assignmentAttachmentInputRef.current.value = '';
    }
  }

  function resetAssessmentForm() {
    setEditingAssessmentId(null);
    setAssessmentTitle('');
    setAssessmentType('quiz');
    setAssessmentTargetSections(['All sections']);
    setAssessmentDetail('');
    setAssessmentSchedule('');
    setAssessmentStartTime('');
    setAssessmentEndTime('');
    setFieldErrors((current) => ({
      ...current,
      assessmentTitle: undefined,
      assessmentType: undefined,
      assessmentTargetSections: undefined,
      assessmentDetail: undefined,
      assessmentSchedule: undefined,
      assessmentStartTime: undefined,
      assessmentEndTime: undefined,
    }));
  }

  function closeActivityModal(force = false) {
    if (!force && createActivityMutation.isPending) {
      return;
    }

    setIsActivityModalOpen(false);
    resetActivityForm();
  }

  function closeAssignmentModal(force = false) {
    if (!force && createAssignmentMutation.isPending) {
      return;
    }

    setIsAssignmentModalOpen(false);
    resetAssignmentForm();
  }

  function closeAssessmentModal(force = false) {
    if (!force && (createAssessmentMutation.isPending || updateAssessmentMutation.isPending)) {
      return;
    }

    setIsAssessmentModalOpen(false);
    resetAssessmentForm();
  }

  function resetModuleForm() {
    setEditingModuleId(null);
    setModuleTitle('');
    setModuleSummary('');
    setModuleLessonId('');
    setModuleLinkInput('');
    setModuleReferenceLinks([]);
    setModuleAttachments([]);
    setFieldErrors((current) => ({
      ...current,
      moduleTitle: undefined,
      moduleSummary: undefined,
      moduleLessonId: undefined,
      moduleLinkInput: undefined,
      moduleAttachments: undefined,
    }));
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  }

  function closeModuleModal(force = false) {
    if (!force && (createModuleMutation.isPending || updateModuleMutation.isPending)) {
      return;
    }

    setIsModuleModalOpen(false);
    resetModuleForm();
  }

  const openAddLessonModal = () => {
    setFieldErrors({});
    setIsAddLessonModalOpen(true);
  };

  const openSubtopicModal = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setSubtopicTitle('');
    setFieldErrors((current) => ({ ...current, subtopicTitle: undefined }));
    setIsSubtopicModalOpen(true);
  };

  const openCreateModuleModal = () => {
    resetModuleForm();
    setIsModuleModalOpen(true);
  };

  const openCreateActivityModal = () => {
    resetActivityForm();
    setIsActivityModalOpen(true);
  };

  const openCreateAssignmentModal = () => {
    resetAssignmentForm();
    setIsAssignmentModalOpen(true);
  };

  const openCreateAssessmentModal = () => {
    resetAssessmentForm();
    setIsAssessmentModalOpen(true);
  };

  const openEditAssessmentModal = (assessmentRecord: FacultySubjectDetailsResponse['assessments'][number]) => {
    setEditingAssessmentId(assessmentRecord.id);
    setAssessmentTitle(assessmentRecord.title);
    setAssessmentType(assessmentRecord.assessmentType);
    setAssessmentTargetSections(assessmentRecord.targetSections);
    setAssessmentDetail(assessmentRecord.detail);
    setAssessmentSchedule(assessmentRecord.schedule);
    setAssessmentStartTime(assessmentRecord.startTime);
    setAssessmentEndTime(assessmentRecord.endTime);
    setFieldErrors((current) => ({
      ...current,
      assessmentTitle: undefined,
      assessmentType: undefined,
      assessmentTargetSections: undefined,
      assessmentDetail: undefined,
      assessmentSchedule: undefined,
      assessmentStartTime: undefined,
      assessmentEndTime: undefined,
    }));
    setIsAssessmentModalOpen(true);
  };

  const openEditModuleModal = (moduleRecord: FacultySubjectDetailsResponse['modules'][number]) => {
    setEditingModuleId(moduleRecord.id);
    setModuleTitle(moduleRecord.title);
    setModuleSummary(moduleRecord.summary);
    setModuleLessonId(moduleRecord.lessonId);
    setModuleReferenceLinks(moduleRecord.referenceLinks);
    setModuleAttachments(moduleRecord.attachments);
    setModuleLinkInput('');
    setFieldErrors((current) => ({
      ...current,
      moduleTitle: undefined,
      moduleSummary: undefined,
      moduleLessonId: undefined,
      moduleLinkInput: undefined,
      moduleAttachments: undefined,
    }));
    setIsModuleModalOpen(true);
  };

  const closeSubtopicModal = () => {
    if (addSubtopicMutation.isPending || toggleSubtopicMutation.isPending) {
      return;
    }

    setIsSubtopicModalOpen(false);
    setActiveLessonId(null);
    setSubtopicTitle('');
    setFieldErrors((current) => ({ ...current, subtopicTitle: undefined }));
  };

  const handleAddSubtopic = (lessonId: string) => {
    const normalizedTitle = subtopicTitle.trim();

    if (!normalizedTitle) {
      setFieldErrors((current) => ({
        ...current,
        subtopicTitle: 'Subtopic title is required',
      }));
      return;
    }

    addSubtopicMutation.mutate({
      lessonId,
      title: normalizedTitle,
    });
  };

  const handleAddReferenceLink = () => {
    const normalizedLink = moduleLinkInput.trim();

    if (!normalizedLink) {
      setFieldErrors((current) => ({
        ...current,
        moduleLinkInput: 'Reference link is required',
      }));
      return;
    }

    try {
      const parsedUrl = new URL(normalizedLink);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Reference link must use http or https');
      }
    } catch {
      setFieldErrors((current) => ({
        ...current,
        moduleLinkInput: 'Enter a valid reference link',
      }));
      return;
    }

    if (moduleReferenceLinks.includes(normalizedLink)) {
      setFieldErrors((current) => ({
        ...current,
        moduleLinkInput: 'This reference link is already added',
      }));
      return;
    }

    setModuleReferenceLinks((current) => [...current, normalizedLink]);
    setModuleLinkInput('');
    setFieldErrors((current) => ({ ...current, moduleLinkInput: undefined }));
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = await readFilesAsDataUrls(event.target.files);

      if (files.length === 0) {
        return;
      }

      setModuleAttachments((current) => [...current, ...files]);
      setFieldErrors((current) => ({ ...current, moduleAttachments: undefined }));
    } catch (error) {
      setPopupState({
        open: true,
        title: 'Unable to attach file',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  };

  const handleActivityFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = await readFilesAsDataUrls(event.target.files);

      if (files.length === 0) {
        return;
      }

      setActivityAttachments((current) => [...current, ...files]);
      setFieldErrors((current) => ({ ...current, activityAttachments: undefined }));
    } catch (error) {
      setPopupState({
        open: true,
        title: 'Unable to attach file',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      if (activityAttachmentInputRef.current) {
        activityAttachmentInputRef.current.value = '';
      }
    }
  };

  const handleAssignmentFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = await readFilesAsDataUrls(event.target.files);

      if (files.length === 0) {
        return;
      }

      setAssignmentAttachments((current) => [...current, ...files]);
      setFieldErrors((current) => ({ ...current, assignmentAttachments: undefined }));
    } catch (error) {
      setPopupState({
        open: true,
        title: 'Unable to attach file',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      if (assignmentAttachmentInputRef.current) {
        assignmentAttachmentInputRef.current.value = '';
      }
    }
  };

  const handleSubmitModule = () => {
    const trimmedTitle = moduleTitle.trim();
    const trimmedSummary = moduleSummary.trim();
    const nextErrors: typeof fieldErrors = {};

    if (!trimmedTitle) {
      nextErrors.moduleTitle = 'Module title is required';
    }

    if (!trimmedSummary) {
      nextErrors.moduleSummary = 'Module summary is required';
    }

    if (!moduleLessonId) {
      nextErrors.moduleLessonId = 'Topic is required';
    }

    setFieldErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setModuleTitle(trimmedTitle);
    setModuleSummary(trimmedSummary);

    if (editingModuleId) {
      updateModuleMutation.mutate();
      return;
    }

    createModuleMutation.mutate();
  };

  const handleSubmitActivity = () => {
    const trimmedTitle = activityTitle.trim();
    const trimmedDetail = activityDetail.trim();
    const nextErrors: typeof fieldErrors = {
      activityTitle: undefined,
      activityType: undefined,
      activityDetail: undefined,
      activityDeadline: undefined,
      activityAttachments: undefined,
    };

    if (!trimmedTitle) {
      nextErrors.activityTitle = 'Activity title is required';
    }

    if (!activityDeadline) {
      nextErrors.activityDeadline = 'Deadline is required';
    }

    if (activityType === 'text' && !trimmedDetail) {
      nextErrors.activityDetail = 'Activity instructions are required';
    }

    if (activityType === 'file' && activityAttachments.length === 0) {
      nextErrors.activityAttachments = 'Upload at least one file';
    }

    setFieldErrors((current) => ({
      ...current,
      activityTitle: nextErrors.activityTitle,
      activityType: nextErrors.activityType,
      activityDetail: nextErrors.activityDetail,
      activityDeadline: nextErrors.activityDeadline,
      activityAttachments: nextErrors.activityAttachments,
    }));

    if (
      nextErrors.activityTitle ||
      nextErrors.activityType ||
      nextErrors.activityDetail ||
      nextErrors.activityDeadline ||
      nextErrors.activityAttachments
    ) {
      return;
    }

    setActivityTitle(trimmedTitle);
    setActivityDetail(trimmedDetail);
    createActivityMutation.mutate();
  };

  const handleSubmitAssignment = () => {
    const trimmedTitle = assignmentTitle.trim();
    const trimmedDetail = assignmentDetail.trim();
    const nextErrors: typeof fieldErrors = {
      assignmentTitle: undefined,
      assignmentType: undefined,
      assignmentDetail: undefined,
      assignmentDeadline: undefined,
      assignmentAttachments: undefined,
    };

    if (!trimmedTitle) {
      nextErrors.assignmentTitle = 'Assignment title is required';
    }

    if (!assignmentDeadline) {
      nextErrors.assignmentDeadline = 'Deadline is required';
    }

    if (assignmentType === 'text' && !trimmedDetail) {
      nextErrors.assignmentDetail = 'Assignment instructions are required';
    }

    if (assignmentType === 'file' && assignmentAttachments.length === 0) {
      nextErrors.assignmentAttachments = 'Upload at least one file';
    }

    setFieldErrors((current) => ({
      ...current,
      assignmentTitle: nextErrors.assignmentTitle,
      assignmentType: nextErrors.assignmentType,
      assignmentDetail: nextErrors.assignmentDetail,
      assignmentDeadline: nextErrors.assignmentDeadline,
      assignmentAttachments: nextErrors.assignmentAttachments,
    }));

    if (
      nextErrors.assignmentTitle ||
      nextErrors.assignmentType ||
      nextErrors.assignmentDetail ||
      nextErrors.assignmentDeadline ||
      nextErrors.assignmentAttachments
    ) {
      return;
    }

    setAssignmentTitle(trimmedTitle);
    setAssignmentDetail(trimmedDetail);
    createAssignmentMutation.mutate();
  };

  const handleSubmitAssessment = () => {
    const trimmedTitle = assessmentTitle.trim();
    const trimmedDetail = assessmentDetail.trim();
    const nextErrors: typeof fieldErrors = {
      assessmentTitle: undefined,
      assessmentType: undefined,
      assessmentTargetSections: undefined,
      assessmentDetail: undefined,
      assessmentSchedule: undefined,
      assessmentStartTime: undefined,
      assessmentEndTime: undefined,
    };

    if (!trimmedTitle) {
      nextErrors.assessmentTitle = 'Assessment title is required';
    }

    if (!assessmentSchedule) {
      nextErrors.assessmentSchedule = 'Assessment date is required';
    }

    if (assessmentTargetSections.length === 0) {
      nextErrors.assessmentTargetSections = 'Choose at least one section';
    }

    if (!assessmentStartTime) {
      nextErrors.assessmentStartTime = 'Start time is required';
    }

    if (!assessmentEndTime) {
      nextErrors.assessmentEndTime = 'End time is required';
    } else if (assessmentStartTime && assessmentEndTime <= assessmentStartTime) {
      nextErrors.assessmentEndTime = 'End time must be later than the start time';
    }

    setFieldErrors((current) => ({
      ...current,
      assessmentTitle: nextErrors.assessmentTitle,
      assessmentType: nextErrors.assessmentType,
      assessmentTargetSections: nextErrors.assessmentTargetSections,
      assessmentDetail: nextErrors.assessmentDetail,
      assessmentSchedule: nextErrors.assessmentSchedule,
      assessmentStartTime: nextErrors.assessmentStartTime,
      assessmentEndTime: nextErrors.assessmentEndTime,
    }));

    if (
      nextErrors.assessmentTitle ||
      nextErrors.assessmentType ||
      nextErrors.assessmentTargetSections ||
      nextErrors.assessmentSchedule ||
      nextErrors.assessmentStartTime ||
      nextErrors.assessmentEndTime
    ) {
      return;
    }

    setAssessmentTitle(trimmedTitle);
    setAssessmentDetail(trimmedDetail);

    if (editingAssessmentId) {
      updateAssessmentMutation.mutate();
      return;
    }

    createAssessmentMutation.mutate();
  };

  const handleDeleteModule = (moduleId: string) => {
    if (!window.confirm('Delete this module? This action cannot be undone.')) {
      return;
    }

    deleteModuleMutation.mutate(moduleId);
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    if (!window.confirm('Delete this assessment? This action cannot be undone.')) {
      return;
    }

    deleteAssessmentMutation.mutate(assessmentId);
  };

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Faculty subjects"
      pageTitle={subject?.title ?? 'Subject'}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[1.65rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(238,245,251,0.96)_100%)] px-5 py-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
          {subjectQuery.isLoading ? (
            <p className="text-fluid-md text-[#6b8198]">Loading subject details...</p>
          ) : subject ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.05rem] bg-[linear-gradient(180deg,#eef6ff_0%,#e1edf8_100%)] text-[#2b6fb0] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                  <SubjectIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-fluid-2xs font-semibold uppercase tracking-[0.26em] text-[#2d7dc3]">
                    Faculty subject view
                  </p>
                  <h1 className="mt-1.5 text-fluid-2xl font-semibold tracking-[-0.04em] text-[#173b70] sm:text-fluid-3xl">
                    {subject.title}
                  </h1>
                  <p className="mt-1.5 max-w-3xl text-fluid-base leading-[1.6] text-[#607b95]">
                    {subject.description}
                  </p>
                </div>
              </div>

              <div className="grid min-w-[14rem] gap-2 self-start rounded-[1.2rem] bg-[linear-gradient(180deg,#2f4f76_0%,#223f5f_100%)] px-4 py-3 text-white shadow-[0_16px_28px_rgba(29,58,92,0.18)]">
                <p className="text-fluid-2xs uppercase tracking-[0.2em] text-[#d5e2ef]">
                  Subject details
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-fluid-lg font-semibold">{subject.code}</p>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#eef5fb]">
                    {activeCount} items
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {subject ? (
          <section className="mt-5 rounded-[1.55rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(236,243,250,0.96)_100%)] p-4 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {subjectTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-fluid-sm font-semibold transition ${
                        isActive
                          ? 'border-[#8ab8de] bg-[linear-gradient(180deg,#edf6ff_0%,#dfecfa_100%)] text-[#215f99] shadow-[0_8px_16px_rgba(43,121,186,0.1)]'
                          : 'border-[#d5e0ea] bg-[rgba(255,255,255,0.9)] text-[#5b738c] hover:bg-[#f2f7fc]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'lesson-progress' ? (
                <button
                  type="button"
                  onClick={openAddLessonModal}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-1.5 text-fluid-sm font-semibold text-white shadow-[0_8px_16px_rgba(41,124,198,0.14)] transition hover:brightness-105"
                >
                  <FiPlus className="h-4 w-4" />
                  Add lesson
                </button>
              ) : null}

              {activeTab === 'modules' ? (
                <button
                  type="button"
                  onClick={openCreateModuleModal}
                  disabled={subject.lessonProgress.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-1.5 text-fluid-sm font-semibold text-white shadow-[0_8px_16px_rgba(41,124,198,0.14)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <FiPlus className="h-4 w-4" />
                  Add module
                </button>
              ) : null}

              {activeTab === 'activities' ? (
                <button
                  type="button"
                  onClick={openCreateActivityModal}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-1.5 text-fluid-sm font-semibold text-white shadow-[0_8px_16px_rgba(41,124,198,0.14)] transition hover:brightness-105"
                >
                  <FiPlus className="h-4 w-4" />
                  Add activity
                </button>
              ) : null}

              {activeTab === 'assignments' ? (
                <button
                  type="button"
                  onClick={openCreateAssignmentModal}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-1.5 text-fluid-sm font-semibold text-white shadow-[0_8px_16px_rgba(41,124,198,0.14)] transition hover:brightness-105"
                >
                  <FiPlus className="h-4 w-4" />
                  Add assignment
                </button>
              ) : null}

              {activeTab === 'assessments' ? (
                <button
                  type="button"
                  onClick={openCreateAssessmentModal}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-1.5 text-fluid-sm font-semibold text-white shadow-[0_8px_16px_rgba(41,124,198,0.14)] transition hover:brightness-105"
                >
                  <FiPlus className="h-4 w-4" />
                  Add assessment
                </button>
              ) : null}

              {activeTab === 'meetings' ? (
                <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c9d8e6] bg-white px-3.5 py-1.5 text-fluid-sm font-semibold text-[#607790]">
                  <FiClock className="h-4 w-4" />
                  Fixed from schedule
                </span>
              ) : null}
            </div>

            <div className="mt-5">
              {activeTab === 'lesson-progress' ? (
                subject.lessonProgress.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.lessonProgress.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#d8e3ec] bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fd_100%)] px-5 py-5 shadow-[0_12px_24px_rgba(39,77,117,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-fluid-lg font-semibold text-[#173b70]">{item.lesson}</h2>
                            <p className="mt-2 text-fluid-sm leading-[1.6] text-[#68839d]">
                              {item.summary}
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.state)}`}>
                            {item.state}
                          </span>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-fluid-sm font-medium text-[#5f7892]">Completion</p>
                            <p className="text-fluid-sm font-semibold text-[#173b70]">{item.completion}%</p>
                          </div>
                          <div className="h-[0.42rem] rounded-full bg-[#e3ebf3]">
                            <div
                              className="h-full rounded-full bg-[#3c7de0]"
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 rounded-[1.1rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,#f7fbff_0%,#ebf3f9_100%)] p-4">
                          <div>
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Subtopics
                            </p>
                            <p className="mt-2 text-fluid-base font-semibold text-[#37506c]">
                              {item.subtopics.length} subtopic{item.subtopics.length === 1 ? '' : 's'} added
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openSubtopicModal(item.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#cddbe8] bg-white px-3 py-1.5 text-fluid-xs font-semibold text-[#2f78bc] transition hover:bg-[#f3f8fd]"
                          >
                            <FiList className="h-3.5 w-3.5" />
                            Manage subtopics
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Lesson Progress" />
                )
              ) : null}

              {activeTab === 'modules' ? (
                subject.modules.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.modules.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#b3c4d2] bg-[linear-gradient(180deg,#d3dee8_0%,#c9d5e0_100%)] px-5 py-5 shadow-[0_8px_18px_rgba(27,46,70,0.07)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <p className="mt-2 text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Topic
                            </p>
                            <p className="mt-1 text-fluid-base text-[#43617d]">{item.topicTitle}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.progress)}`}>
                            {item.progress}
                          </span>
                        </div>

                        <p className="mt-4 text-fluid-sm leading-[1.65] text-[#617d98]">{item.summary}</p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                            <div className="flex items-center gap-2 text-[#2f78bc]">
                              <FiLink2 className="h-4 w-4" />
                              <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Reference links
                              </p>
                            </div>
                            <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                              {item.referenceLinks.length}
                            </p>
                          </div>

                          <div className="rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                            <div className="flex items-center gap-2 text-[#2f78bc]">
                              <FiPaperclip className="h-4 w-4" />
                              <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Attachments
                              </p>
                            </div>
                            <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                              {item.attachments.length}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModuleModal(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                            Edit module
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModule(item.id)}
                            disabled={deleteModuleMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d3b0b0] bg-[rgba(220,204,204,0.9)] px-3 py-2 text-fluid-sm font-semibold text-[#9f4a4a] transition hover:bg-[rgba(228,212,212,0.96)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                            Delete module
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Modules" />
                )
              ) : null}

              {activeTab === 'activities' ? (
                subject.activities.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.activities.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#b3c4d2] bg-[linear-gradient(180deg,#d3dee8_0%,#c9d5e0_100%)] px-5 py-5 shadow-[0_8px_18px_rgba(27,46,70,0.07)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#5d7690]">
                                {formatCalendarDate(item.dueDate)}
                              </span>
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {item.activityType === 'file' ? 'File upload' : 'Text only'}
                              </span>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="formatted-text mt-4 text-fluid-sm leading-[1.65] text-[#617d98]">{item.detail}</p>

                        <div className="mt-5 rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                          <div className="flex items-center gap-2 text-[#2f78bc]">
                            <FiUsers className="h-4 w-4" />
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Student submissions
                            </p>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-fluid-xl font-semibold text-[#173b70]">
                                {item.submittedCount} submitted
                              </p>
                              <p className="mt-1 text-fluid-sm text-[#617d98]">
                                out of {item.totalStudents} student{item.totalStudents === 1 ? '' : 's'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/faculty/subjects/${subjectId}/activities/${item.id}/submissions`)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                            >
                              View list
                              <FiArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {item.attachments.length > 0 ? (
                          <div className="mt-5 rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                            <div className="flex items-center gap-2 text-[#2f78bc]">
                              <FiPaperclip className="h-4 w-4" />
                              <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Attached files
                              </p>
                            </div>
                            <div className="mt-3 space-y-2">
                              {item.attachments.map((attachment) => (
                                <a
                                  key={attachment.id ?? attachment.name}
                                  href={attachment.dataUrl}
                                  download={attachment.name}
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex items-center justify-between gap-3 rounded-[0.95rem] border border-[#c3d2de] bg-[rgba(214,224,234,0.94)] px-4 py-3 text-fluid-sm font-medium text-[#2f78bc] transition hover:bg-[rgba(221,230,238,0.98)] hover:text-[#215f99]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#b7c8d6] bg-[rgba(228,235,242,0.98)] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Download
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Activities" />
                )
              ) : null}
              {activeTab === 'assignments' ? (
                subject.assignments.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.assignments.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#b3c4d2] bg-[linear-gradient(180deg,#d3dee8_0%,#c9d5e0_100%)] px-5 py-5 shadow-[0_8px_18px_rgba(27,46,70,0.07)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#5d7690]">
                                {formatCalendarDate(item.dueDate)}
                              </span>
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {item.assignmentType === 'file' ? 'File upload' : 'Text only'}
                              </span>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="formatted-text mt-4 text-fluid-sm leading-[1.65] text-[#617d98]">{item.detail}</p>

                        <div className="mt-5 rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                          <div className="flex items-center gap-2 text-[#2f78bc]">
                            <FiUsers className="h-4 w-4" />
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Student submissions
                            </p>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-fluid-xl font-semibold text-[#173b70]">
                                {item.submittedCount} submitted
                              </p>
                              <p className="mt-1 text-fluid-sm text-[#617d98]">
                                out of {item.totalStudents} student{item.totalStudents === 1 ? '' : 's'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/faculty/subjects/${subjectId}/assignments/${item.id}/submissions`)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                            >
                              View list
                              <FiArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {item.attachments.length > 0 ? (
                          <div className="mt-5 rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                            <div className="flex items-center gap-2 text-[#2f78bc]">
                              <FiPaperclip className="h-4 w-4" />
                              <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Attached files
                              </p>
                            </div>
                            <div className="mt-3 space-y-2">
                              {item.attachments.map((attachment) => (
                                <a
                                  key={attachment.id ?? attachment.name}
                                  href={attachment.dataUrl}
                                  download={attachment.name}
                                  className="flex items-center justify-between gap-3 rounded-[0.95rem] border border-[#c3d2de] bg-[rgba(214,224,234,0.94)] px-4 py-3 text-fluid-sm font-medium text-[#2f78bc] transition hover:bg-[rgba(221,230,238,0.98)] hover:text-[#215f99]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#b7c8d6] bg-[rgba(228,235,242,0.98)] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Download
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Assignments" />
                )
              ) : null}
              {activeTab === 'assessments' ? (
                subject.assessments.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.assessments.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(`/faculty/subjects/${subjectId}/assessments/${item.id}`)}
                        className="rounded-[1.3rem] border border-[#b3c4d2] bg-[linear-gradient(180deg,#d3dee8_0%,#c9d5e0_100%)] px-5 py-5 text-left shadow-[0_8px_18px_rgba(27,46,70,0.07)] transition hover:border-[#9eb7cb] hover:shadow-[0_12px_24px_rgba(27,46,70,0.11)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#5d7690]">
                                {formatCalendarDate(item.schedule)}
                              </span>
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {formatAssessmentType(item.assessmentType)}
                              </span>
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {item.targetSectionLabel}
                              </span>
                              <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatAssessmentWindow(item.startTime, item.endTime)}
                              </span>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="formatted-text mt-4 text-fluid-sm leading-[1.65] text-[#617d98]">{item.detail}</p>

                        <div className="mt-5 flex items-end justify-between gap-3 rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                          <div>
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Question bank
                            </p>
                            <p className="mt-2 text-fluid-lg font-semibold text-[#173b70]">
                              {item.questionCount} question{item.questionCount === 1 ? '' : 's'}
                            </p>
                            <p className="mt-1 text-fluid-sm text-[#617d98]">
                              Open this card to add options and set the answer key.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc]">
                            Build assessment
                            <FiArrowRight className="h-4 w-4" />
                          </span>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3 rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                          <div>
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Exam takers
                            </p>
                            <p className="mt-2 text-fluid-lg font-semibold text-[#173b70]">
                              {item.takenCount} of {item.totalStudents} students
                            </p>
                            <p className="mt-1 text-fluid-sm text-[#617d98]">
                              Review students who already completed this assessment.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/faculty/subjects/${subjectId}/assessments/${item.id}/takers`);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                          >
                            View students
                            <FiArrowRight className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditAssessmentModal(item);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                            Edit assessment
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteAssessment(item.id);
                            }}
                            disabled={deleteAssessmentMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d3b0b0] bg-[rgba(220,204,204,0.9)] px-3 py-2 text-fluid-sm font-semibold text-[#9f4a4a] transition hover:bg-[rgba(228,212,212,0.96)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                            Delete assessment
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Assessment" />
                )
              ) : null}

              {activeTab === 'meetings' ? (
                subject.meetings.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.meetings.map((item) => {
                      const meetingStatusLabel = formatMeetingStatus(item.status);

                      return (
                        <article
                          key={item.id}
                          className="rounded-[1.3rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_.8rem_1.9rem_rgba(40,68,99,0.1)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(meetingStatusLabel)}`}>
                                  {meetingStatusLabel}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.aiStatusLabel)}`}>
                                  AI notes: {item.aiStatusLabel}
                                </span>
                                {item.sectionName ? (
                                  <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                    {item.sectionName}
                                  </span>
                                ) : null}
                                {item.schedule ? (
                                  <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                    {item.schedule}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="rounded-[0.95rem] border border-[#c9d8e3] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-right">
                              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.12em] text-[#6d86a0]">
                                Room
                              </p>
                              <p className="mt-1 max-w-[12rem] break-all text-fluid-xs font-semibold text-[#173b70]">
                                {item.roomName}
                              </p>
                            </div>
                          </div>

                          <p className="formatted-text mt-4 text-fluid-sm leading-[1.65] text-[#617d98]">
                            {item.agenda || 'No agenda added for this conference yet.'}
                          </p>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                              <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Timeline
                              </p>
                              <p className="mt-2 text-fluid-sm text-[#45627f]">
                                Created {formatDateTime(item.createdAt)}
                              </p>
                              <p className="mt-1 text-fluid-xs text-[#7088a1]">
                                Started {formatDateTime(item.startedAt, 'not yet')} and ended {formatDateTime(item.endedAt, 'not yet')}
                              </p>
                            </div>

                            <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                              <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Recording
                              </p>
                              <p className="mt-2 text-fluid-sm font-semibold text-[#173b70]">
                                {item.recordingName || 'No recording uploaded'}
                              </p>
                              <p className="mt-1 text-fluid-xs text-[#7088a1]">
                                {item.recordingName ? formatBytes(item.recordingSize) : 'Attach one when ending the conference to generate notes.'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(
                                item.status === 'ended'
                                  ? `/faculty/subjects/${subjectId}/meetings/${item.id}`
                                  : `/faculty/subjects/${subjectId}/meetings/${item.id}/classroom`,
                              )}
                              className="inline-flex items-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3 py-2 text-fluid-sm font-semibold text-white transition hover:brightness-105"
                            >
                              <FiArrowRight className="h-3.5 w-3.5" />
                              {item.status === 'ended' ? 'Review conference' : 'Open classroom'}
                            </button>
                            {item.recordingUrl ? (
                              <button
                                type="button"
                                onClick={() => setSelectedRecording(item)}
                                className="inline-flex items-center gap-2 rounded-full border border-[#c9d8e6] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#2b79ba] transition hover:bg-[#f4f8fb]"
                              >
                                <FiEye className="h-3.5 w-3.5" />
                                Play recording
                              </button>
                            ) : null}

                            {item.status !== 'live' ? (
                              <button
                                type="button"
                                onClick={() => startMeetingMutation.mutate(item.id)}
                                disabled={startMeetingMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <FiPlay className="h-3.5 w-3.5" />
                                Start now
                              </button>
                            ) : null}

                            {item.status === 'live' ? (
                              <div className="inline-flex items-center gap-2 rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc]">
                                <FiClock className="h-3.5 w-3.5" />
                                Session is live
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyTabState label="Meetings" />
                )
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <Modal
        open={Boolean(selectedRecording)}
        title="Session recording"
        description={selectedRecording?.recordingName || selectedRecording?.title || 'Saved class recording'}
        onClose={() => setSelectedRecording(null)}
        panelClassName="max-w-5xl"
      >
        {selectedRecording?.recordingUrl ? (
          selectedRecording.recordingMimeType.startsWith('audio/') ? (
            <audio src={selectedRecording.recordingUrl} controls className="w-full" />
          ) : (
            <video src={selectedRecording.recordingUrl} controls className="max-h-[68vh] w-full rounded-[1rem] bg-black" />
          )
        ) : (
          <p className="text-fluid-sm text-[#607b95]">No recording has been saved yet.</p>
        )}
      </Modal>

      <Modal
        open={isAddLessonModalOpen}
        title="Add lesson"
        description="Create a new lesson entry for this subject. It will appear in lesson progress once saved."
        onClose={() => {
          if (addLessonMutation.isPending) {
            return;
          }
          setIsAddLessonModalOpen(false);
        }}
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsAddLessonModalOpen(false)}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setFieldErrors({});
                addLessonMutation.mutate();
              }}
              disabled={addLessonMutation.isPending}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addLessonMutation.isPending ? 'Saving...' : 'Save lesson'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="lesson-title">
              Lesson title
            </label>
            <input
              id="lesson-title"
              type="text"
              value={lessonTitle}
              onChange={(event) => {
                setLessonTitle(event.target.value);
                setFieldErrors((current) => ({ ...current, lessonTitle: undefined }));
              }}
              className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                fieldErrors.lessonTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
              placeholder="Introduction and orientation"
            />
            {fieldErrors.lessonTitle ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.lessonTitle}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="lesson-summary">
              Summary
            </label>
            <textarea
              id="lesson-summary"
              value={lessonSummary}
              onChange={(event) => {
                setLessonSummary(event.target.value);
                setFieldErrors((current) => ({ ...current, lessonSummary: undefined }));
              }}
              rows={4}
              className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition ${
                fieldErrors.lessonSummary ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
              placeholder="Outline the lesson focus, expectations, and what students should learn."
            />
            {fieldErrors.lessonSummary ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.lessonSummary}</p>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={isSubtopicModalOpen && Boolean(activeLesson)}
        title={activeLesson ? `Subtopics for ${activeLesson.lesson}` : 'Subtopics'}
        description="Add subtopics here and mark them complete to update lesson progress."
        onClose={closeSubtopicModal}
        actions={
          <>
            <button
              type="button"
              onClick={closeSubtopicModal}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Close
            </button>
            {activeLesson ? (
              <button
                type="button"
                onClick={() => handleAddSubtopic(activeLesson.id)}
                disabled={addSubtopicMutation.isPending}
                className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addSubtopicMutation.isPending ? 'Saving...' : 'Add subtopic'}
              </button>
            ) : null}
          </>
        }
      >
        {activeLesson ? (
          <div className="space-y-4">
            <div className="rounded-[1rem] border border-[#bacbd9] bg-[rgba(255,255,255,0.82)] px-4 py-3">
              <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                Progress summary
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-fluid-md font-semibold text-[#173b70]">
                  {activeLesson.subtopics.length} subtopic{activeLesson.subtopics.length === 1 ? '' : 's'}
                </p>
                <p className="text-fluid-base font-semibold text-[#2f78bc]">
                  {activeLesson.completion}% complete
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="subtopic-title">
                New subtopic
              </label>
              <input
                id="subtopic-title"
                type="text"
                value={subtopicTitle}
                onChange={(event) => {
                  setSubtopicTitle(event.target.value);
                  setFieldErrors((current) => ({ ...current, subtopicTitle: undefined }));
                }}
                placeholder="Add a subtopic"
                className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                  fieldErrors.subtopicTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                }`}
              />
              {fieldErrors.subtopicTitle ? (
                <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.subtopicTitle}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              {activeLesson.subtopics.length > 0 ? (
                activeLesson.subtopics.map((subtopic) => (
                  <label
                    key={subtopic.id}
                    className="flex items-center gap-3 rounded-[1rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3 text-fluid-base text-[#37506c]"
                  >
                    <input
                      type="checkbox"
                      checked={subtopic.isCompleted}
                      onChange={(event) => {
                        toggleSubtopicMutation.mutate({
                          lessonId: activeLesson.id,
                          subtopicId: subtopic.id,
                          isCompleted: event.target.checked,
                        });
                      }}
                      className="h-4 w-4 rounded border border-[#b9cad9] accent-[#2f78bc]"
                    />
                    <span className={subtopic.isCompleted ? 'text-[#56738f] line-through' : ''}>
                      {subtopic.title}
                    </span>
                  </label>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-[#bfceda] bg-[linear-gradient(180deg,#f5f9fc_0%,#e8eff5_100%)] px-5 py-6 text-center">
                  <p className="text-fluid-base font-semibold text-[#173b70]">No subtopics yet</p>
                  <p className="mt-2 text-fluid-sm text-[#7088a1]">
                    Add your first subtopic here to start building lesson progress.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isActivityModalOpen}
        title="Add activity"
        description="Create a classroom activity with either written instructions or downloadable files, then set the deadline students should follow."
        onClose={closeActivityModal}
        actions={
          <>
            <button
              type="button"
              onClick={() => closeActivityModal()}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitActivity}
              disabled={createActivityMutation.isPending}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createActivityMutation.isPending ? 'Saving...' : 'Save activity'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="activity-title">
              Activity title
            </label>
            <input
              id="activity-title"
              type="text"
              value={activityTitle}
              onChange={(event) => {
                setActivityTitle(event.target.value);
                setFieldErrors((current) => ({ ...current, activityTitle: undefined }));
              }}
              placeholder="Week 1 reflection"
              className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                fieldErrors.activityTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.activityTitle ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.activityTitle}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="activity-type">
                Activity type
              </label>
              <CustomSelect
                id="activity-type"
                options={activityTypeOptions.map((option) => ({ ...option }))}
                placeholder="Select activity type"
                value={activityType}
                onChange={(value) => {
                  setActivityType(value as 'text' | 'file');
                  setFieldErrors((current) => ({
                    ...current,
                    activityType: undefined,
                    activityDetail: undefined,
                    activityAttachments: undefined,
                  }));
                }}
                error={fieldErrors.activityType}
                tone="muted"
              />
            </div>

            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="activity-deadline">
                Deadline
              </label>
              <CustomDatePicker
                id="activity-deadline"
                value={activityDeadline}
                placeholder="Select deadline"
                onChange={(value) => {
                  setActivityDeadline(value);
                  setFieldErrors((current) => ({ ...current, activityDeadline: undefined }));
                }}
                error={fieldErrors.activityDeadline}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="activity-detail">
              {activityType === 'file' ? 'Instructions or note (optional)' : 'Activity instructions'}
            </label>
            <textarea
              id="activity-detail"
              value={activityDetail}
              onChange={(event) => {
                setActivityDetail(event.target.value);
                setFieldErrors((current) => ({ ...current, activityDetail: undefined }));
              }}
              rows={4}
              placeholder={
                activityType === 'file'
                  ? 'Add optional guidance for students before they open the files.'
                  : 'Describe what students should read, write, or submit.'
              }
              className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition ${
                fieldErrors.activityDetail ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.activityDetail ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.activityDetail}</p>
            ) : null}
          </div>

          {activityType === 'file' ? (
            <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-fluid-base font-semibold text-[#173b70]">Activity files</p>
                  <p className="mt-1 text-fluid-xs text-[#7088a1]">
                    Upload the files students should download. Keep each file under 2 MB.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => activityAttachmentInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-white"
                >
                  <FiUploadCloud className="h-4 w-4" />
                  Upload files
                </button>
                <input
                  ref={activityAttachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleActivityFilesSelected}
                />
              </div>

              {fieldErrors.activityAttachments ? (
                <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.activityAttachments}</p>
              ) : null}

              {activityAttachments.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {activityAttachments.map((attachment, index) => (
                    <div
                      key={`${attachment.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-fluid-sm font-semibold text-[#173b70]">{attachment.name}</p>
                        <p className="mt-1 text-fluid-xs text-[#7088a1]">{formatBytes(attachment.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActivityAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
                        }}
                        className="rounded-full p-2 text-[#7f93a8] transition hover:bg-[#fff7f7] hover:text-[#b75353]"
                        aria-label={`Remove ${attachment.name}`}
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-[#bfceda] bg-[linear-gradient(180deg,#f5f9fc_0%,#e8eff5_100%)] px-5 py-6 text-center">
                  <p className="text-fluid-base font-semibold text-[#173b70]">No files uploaded yet</p>
                  <p className="mt-2 text-fluid-sm text-[#7088a1]">
                    Add worksheets, PDFs, or activity reference files here.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={isAssignmentModalOpen}
        title="Add assignment"
        description="Create an assignment with either written instructions or downloadable files, then set the deadline students should follow."
        onClose={closeAssignmentModal}
        actions={
          <>
            <button
              type="button"
              onClick={() => closeAssignmentModal()}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAssignment}
              disabled={createAssignmentMutation.isPending}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createAssignmentMutation.isPending ? 'Saving...' : 'Save assignment'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assignment-title">
              Assignment title
            </label>
            <input
              id="assignment-title"
              type="text"
              value={assignmentTitle}
              onChange={(event) => {
                setAssignmentTitle(event.target.value);
                setFieldErrors((current) => ({ ...current, assignmentTitle: undefined }));
              }}
              placeholder="Midterm reflection"
              className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                fieldErrors.assignmentTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.assignmentTitle ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.assignmentTitle}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assignment-type">
                Assignment type
              </label>
              <CustomSelect
                id="assignment-type"
                options={activityTypeOptions.map((option) => ({ ...option }))}
                placeholder="Select assignment type"
                value={assignmentType}
                onChange={(value) => {
                  setAssignmentType(value as 'text' | 'file');
                  setFieldErrors((current) => ({
                    ...current,
                    assignmentType: undefined,
                    assignmentDetail: undefined,
                    assignmentAttachments: undefined,
                  }));
                }}
                error={fieldErrors.assignmentType}
                tone="muted"
              />
            </div>

            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assignment-deadline">
                Deadline
              </label>
              <CustomDatePicker
                id="assignment-deadline"
                value={assignmentDeadline}
                placeholder="Select deadline"
                onChange={(value) => {
                  setAssignmentDeadline(value);
                  setFieldErrors((current) => ({ ...current, assignmentDeadline: undefined }));
                }}
                error={fieldErrors.assignmentDeadline}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assignment-detail">
              {assignmentType === 'file' ? 'Instructions or note (optional)' : 'Assignment instructions'}
            </label>
            <textarea
              id="assignment-detail"
              value={assignmentDetail}
              onChange={(event) => {
                setAssignmentDetail(event.target.value);
                setFieldErrors((current) => ({ ...current, assignmentDetail: undefined }));
              }}
              rows={4}
              placeholder={
                assignmentType === 'file'
                  ? 'Add optional guidance for students before they open the files.'
                  : 'Describe what students need to complete and submit.'
              }
              className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition ${
                fieldErrors.assignmentDetail ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.assignmentDetail ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.assignmentDetail}</p>
            ) : null}
          </div>

          {assignmentType === 'file' ? (
            <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-fluid-base font-semibold text-[#173b70]">Assignment files</p>
                  <p className="mt-1 text-fluid-xs text-[#7088a1]">
                    Upload the files students should download. Keep each file under 2 MB.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => assignmentAttachmentInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-white"
                >
                  <FiUploadCloud className="h-4 w-4" />
                  Upload files
                </button>
                <input
                  ref={assignmentAttachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAssignmentFilesSelected}
                />
              </div>

              {fieldErrors.assignmentAttachments ? (
                <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.assignmentAttachments}</p>
              ) : null}

              {assignmentAttachments.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {assignmentAttachments.map((attachment, index) => (
                    <div
                      key={`${attachment.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-fluid-sm font-semibold text-[#173b70]">{attachment.name}</p>
                        <p className="mt-1 text-fluid-xs text-[#7088a1]">{formatBytes(attachment.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
                        }}
                        className="rounded-full p-2 text-[#7f93a8] transition hover:bg-[#fff7f7] hover:text-[#b75353]"
                        aria-label={`Remove ${attachment.name}`}
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-[#bfceda] bg-[linear-gradient(180deg,#f5f9fc_0%,#e8eff5_100%)] px-5 py-6 text-center">
                  <p className="text-fluid-base font-semibold text-[#173b70]">No files uploaded yet</p>
                  <p className="mt-2 text-fluid-sm text-[#7088a1]">
                    Add worksheets, templates, or assignment reference files here.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={isAssessmentModalOpen}
        title={editingAssessmentId ? 'Edit assessment' : 'Add assessment'}
        description={
          editingAssessmentId
            ? 'Update the assessment details here before opening the builder again.'
            : 'Choose whether this is a quiz or a quarter exam, then set the section and schedule before you start building questions.'
        }
        onClose={closeAssessmentModal}
        actions={
          <>
            <button
              type="button"
              onClick={() => closeAssessmentModal()}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAssessment}
              disabled={createAssessmentMutation.isPending || updateAssessmentMutation.isPending}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createAssessmentMutation.isPending || updateAssessmentMutation.isPending
                ? 'Saving...'
                : editingAssessmentId
                  ? 'Save changes'
                  : 'Save assessment'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assessment-title">
              Assessment title
            </label>
            <input
              id="assessment-title"
              type="text"
              value={assessmentTitle}
              onChange={(event) => {
                setAssessmentTitle(event.target.value);
                setFieldErrors((current) => ({ ...current, assessmentTitle: undefined }));
              }}
              placeholder="Quiz 1: Platform concepts"
              className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                fieldErrors.assessmentTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.assessmentTitle ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.assessmentTitle}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assessment-type">
                Assessment type
              </label>
              <CustomSelect
                id="assessment-type"
                options={assessmentTypeOptions.map((option) => ({ ...option }))}
                placeholder="Select assessment type"
                value={assessmentType}
                onChange={(value) => {
                  setAssessmentType(value as 'quiz' | 'quarter-exam');
                  setFieldErrors((current) => ({ ...current, assessmentType: undefined }));
                }}
                error={fieldErrors.assessmentType}
                tone="muted"
              />
            </div>

            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assessment-schedule">
                Assessment date
              </label>
              <CustomDatePicker
                id="assessment-schedule"
                value={assessmentSchedule}
                placeholder="Select assessment date"
                onChange={(value) => {
                  setAssessmentSchedule(value);
                  setFieldErrors((current) => ({ ...current, assessmentSchedule: undefined }));
                }}
                error={fieldErrors.assessmentSchedule}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assessment-target-section">
                Section taking the exam
              </label>
              <CustomMultiSelect
                id="assessment-target-section"
                options={['All sections', ...Array.from(new Set(subject?.availableSections ?? []))]}
                placeholder="Select section"
                values={assessmentTargetSections}
                onChange={(values) => {
                  setAssessmentTargetSections(values);
                  setFieldErrors((current) => ({ ...current, assessmentTargetSections: undefined }));
                }}
                error={fieldErrors.assessmentTargetSections}
                tone="muted"
              />
            </div>

            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]">
                Assessment window
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-fluid-xs font-semibold uppercase tracking-[0.12em] text-[#6d86a0]" htmlFor="assessment-start-time">
                    Start
                  </label>
                  <input
                    id="assessment-start-time"
                    type="time"
                    value={assessmentStartTime}
                    onChange={(event) => {
                      setAssessmentStartTime(event.target.value);
                      setFieldErrors((current) => ({ ...current, assessmentStartTime: undefined, assessmentEndTime: undefined }));
                    }}
                    className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                      fieldErrors.assessmentStartTime ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                    }`}
                  />
                  {fieldErrors.assessmentStartTime ? (
                    <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.assessmentStartTime}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-fluid-xs font-semibold uppercase tracking-[0.12em] text-[#6d86a0]" htmlFor="assessment-end-time">
                    End
                  </label>
                  <input
                    id="assessment-end-time"
                    type="time"
                    value={assessmentEndTime}
                    onChange={(event) => {
                      setAssessmentEndTime(event.target.value);
                      setFieldErrors((current) => ({ ...current, assessmentStartTime: undefined, assessmentEndTime: undefined }));
                    }}
                    className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                      fieldErrors.assessmentEndTime ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                    }`}
                  />
                  {fieldErrors.assessmentEndTime ? (
                    <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.assessmentEndTime}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="assessment-detail">
              Notes or instructions
            </label>
            <textarea
              id="assessment-detail"
              value={assessmentDetail}
              onChange={(event) => {
                setAssessmentDetail(event.target.value);
                setFieldErrors((current) => ({ ...current, assessmentDetail: undefined }));
              }}
              rows={4}
              placeholder="Add optional notes for students before you begin writing the questions."
              className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition ${
                fieldErrors.assessmentDetail ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.assessmentDetail ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.assessmentDetail}</p>
            ) : null}
          </div>

          <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <p className="text-fluid-base font-semibold text-[#173b70]">Next step after saving</p>
            <p className="mt-1 text-fluid-xs leading-6 text-[#7088a1]">
              The new assessment card will keep the chosen section and time window, then open a
              dedicated builder page where you can add questions, write options, and set the answer key.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={isModuleModalOpen}
        title={editingModuleId ? 'Update module' : 'Add module'}
        description="Attach a module to a lesson topic, then add files and reference links students can access."
        onClose={closeModuleModal}
        actions={
          <>
            <button
              type="button"
              onClick={() => closeModuleModal()}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitModule}
              disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createModuleMutation.isPending || updateModuleMutation.isPending
                ? 'Saving...'
                : editingModuleId
                  ? 'Update module'
                  : 'Save module'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="module-title">
                Module title
              </label>
              <input
                id="module-title"
                type="text"
                value={moduleTitle}
                onChange={(event) => {
                  setModuleTitle(event.target.value);
                  setFieldErrors((current) => ({ ...current, moduleTitle: undefined }));
                }}
                placeholder="Module 1 handout"
                className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                  fieldErrors.moduleTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                }`}
              />
              {fieldErrors.moduleTitle ? (
                <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.moduleTitle}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="module-topic">
                Topic
              </label>
              <CustomSelect
                id="module-topic"
                options={topicOptions}
                placeholder={topicOptions.length > 0 ? 'Select topic' : 'Add a lesson first'}
                value={moduleLessonId}
                onChange={(value) => {
                  setModuleLessonId(value);
                  setFieldErrors((current) => ({ ...current, moduleLessonId: undefined }));
                }}
                error={fieldErrors.moduleLessonId}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="module-summary">
              Summary
            </label>
            <textarea
              id="module-summary"
              value={moduleSummary}
              onChange={(event) => {
                setModuleSummary(event.target.value);
                setFieldErrors((current) => ({ ...current, moduleSummary: undefined }));
              }}
              rows={4}
              placeholder="Describe what the file set or references cover."
              className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition ${
                fieldErrors.moduleSummary ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.moduleSummary ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.moduleSummary}</p>
            ) : null}
          </div>

          <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="module-link-input">
                  Reference link
                </label>
                <input
                  id="module-link-input"
                  type="url"
                  value={moduleLinkInput}
                  onChange={(event) => {
                    setModuleLinkInput(event.target.value);
                    setFieldErrors((current) => ({ ...current, moduleLinkInput: undefined }));
                  }}
                  placeholder="https://example.com/reference"
                  className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                    fieldErrors.moduleLinkInput ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleAddReferenceLink}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-white"
              >
                <FiLink2 className="h-4 w-4" />
                Add link
              </button>
            </div>

            {fieldErrors.moduleLinkInput ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.moduleLinkInput}</p>
            ) : null}

            {moduleReferenceLinks.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {moduleReferenceLinks.map((link) => (
                  <div
                    key={link}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#bcccd9] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-fluid-xs text-[#37506c]"
                  >
                    <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-[#2f78bc]" />
                    <span className="truncate">{link}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setModuleReferenceLinks((current) => current.filter((item) => item !== link));
                      }}
                      className="rounded-full p-1 text-[#7f93a8] transition hover:bg-white hover:text-[#b75353]"
                      aria-label={`Remove ${link}`}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-fluid-base font-semibold text-[#173b70]">Attachments</p>
                <p className="mt-1 text-fluid-xs text-[#7088a1]">
                  Upload module files for students. Keep each file under 2 MB.
                </p>
              </div>
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-white"
              >
                <FiUploadCloud className="h-4 w-4" />
                Upload files
              </button>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />
            </div>

            {fieldErrors.moduleAttachments ? (
              <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.moduleAttachments}</p>
            ) : null}

            {moduleAttachments.length > 0 ? (
              <div className="mt-4 space-y-2">
                {moduleAttachments.map((attachment, index) => (
                  <div
                    key={`${attachment.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-fluid-sm font-semibold text-[#173b70]">{attachment.name}</p>
                      <p className="mt-1 text-fluid-xs text-[#7088a1]">{formatBytes(attachment.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModuleAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
                      }}
                      className="rounded-full p-2 text-[#7f93a8] transition hover:bg-[#fff7f7] hover:text-[#b75353]"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[1rem] border border-dashed border-[#bfceda] bg-[linear-gradient(180deg,#f5f9fc_0%,#e8eff5_100%)] px-5 py-6 text-center">
                <p className="text-fluid-base font-semibold text-[#173b70]">No files uploaded yet</p>
                <p className="mt-2 text-fluid-sm text-[#7088a1]">
                  Add handouts, PDFs, or other module references here.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <NotificationPopup
        open={popupState.open}
        title={popupState.title}
        message={popupState.message}
        variant={popupState.variant}
        onClose={() => setPopupState((current) => ({ ...current, open: false }))}
      />
    </FacultyLayout>
  );
}

export default FacultySubjectDetails;

