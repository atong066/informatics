import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiCode,
  FiCpu,
  FiDatabase,
  FiEye,
  FiExternalLink,
  FiLayers,
  FiPackage,
  FiPaperclip,
  FiSend,
  FiTrash2,
  FiTrendingUp,
  FiUploadCloud,
  FiVideo,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import { getStoredToken } from '../../lib/auth';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import StudentLayout from '../../layout/student/StudentLayout';

type AttachmentRecord = {
  id?: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  size: number;
};

type StudentSubmissionRecord = {
  id: string;
  submissionType: 'text' | 'file';
  textContent: string;
  attachments: AttachmentRecord[];
  submittedAt: string;
  isManualReview: boolean;
  reviewScore: number | null;
  reviewComment: string;
  reviewedAt: string;
};

type AssessmentAttemptSummary = {
  id: string;
  status: string;
  score: number;
  totalPoints: number;
  pendingManualPoints: number;
  manualReviewPending: boolean;
  percentage: number;
  submittedAt: string;
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

type SubjectDetailsResponse = {
  id: string;
  title: string;
  code: string;
  slug: string;
  iconKey: string;
  description: string;
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
    attachments: Array<{
      id: string;
      name: string;
      dataUrl: string;
      mimeType: string;
      size: number;
    }>;
    progress: string;
    completion?: number;
  }>;
  activities: Array<{
    id: string;
    title: string;
    detail: string;
    dueDate: string;
    deadlineTime: string;
    activityType: 'text' | 'file';
    targetSections: string[];
    targetSectionLabel: string;
    attachments: AttachmentRecord[];
    submission: StudentSubmissionRecord | null;
    status: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    detail: string;
    dueDate: string;
    deadlineTime: string;
    assignmentType: 'text' | 'file';
    targetSections: string[];
    targetSectionLabel: string;
    attachments: AttachmentRecord[];
    submission: StudentSubmissionRecord | null;
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
    attempt: AssessmentAttemptSummary | null;
    canTake: boolean;
    availabilityLabel: string;
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

type SubmissionTargetKind = 'activity' | 'assignment';
type StudentSubmittableItem =
  | SubjectDetailsResponse['activities'][number]
  | SubjectDetailsResponse['assignments'][number];

const MAX_ATTACHMENT_BYTES = 2_000_000;
const MAX_TOTAL_ATTACHMENT_BYTES = 5_000_000;

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
    case 'Checked':
    case 'Available':
    case 'Live':
    case 'Ready':
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
    case 'Submitted':
    case 'Pending review':
    case 'Ended':
      return 'border-[#c8d9ec] bg-[#eef4fa] text-[#2f78bc]';
    case 'In progress':
    case 'Due soon':
    case 'Upcoming':
    case 'Processing':
      return 'border-[#f2d9bc] bg-[#fff5e8] text-[#b06b15]';
    case 'Closed':
    case 'Failed':
      return 'border-[#ecd0d0] bg-[#fff2f2] text-[#b35a5a]';
    default:
      return 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]';
  }
}

function EmptyTabState({ label }: { label: string }) {
  return (
    <div className="rounded-[0.224rem] border border-dashed border-[#d8e3ec] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fb_100%)] px-6 py-10 text-center">
      <p className="text-fluid-md font-semibold text-[#173b70]">No {label.toLowerCase()} yet</p>
      <p className="mt-2 text-fluid-sm text-[#7088a1]">
        This section will stay empty until records are added from the database.
      </p>
    </div>
  );
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

function isPastSubmissionDeadline(value: string, deadlineTime = '') {
  if (!value) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const [hours, minutes] = /^([01]\d|2[0-3]):([0-5]\d)$/.test(deadlineTime)
    ? deadlineTime.split(':').map(Number)
    : [23, 59];
  const deadline = new Date(year, month - 1, day, hours, minutes, 59, 999);

  return Date.now() > deadline.getTime();
}

function getSubmissionLockState(item: StudentSubmittableItem | null | undefined) {
  if (!item) {
    return {
      isLocked: false,
      actionLabel: '',
      message: '',
    };
  }

  if (item.submission?.reviewScore !== null && item.submission?.reviewScore !== undefined) {
    return {
      isLocked: true,
      actionLabel: 'Scored',
      message: 'This submission has already been scored and can no longer be changed.',
    };
  }

  if (isPastSubmissionDeadline(item.dueDate, item.deadlineTime)) {
    return {
      isLocked: true,
      actionLabel: 'Closed',
      message: 'The deadline has passed. Submissions are closed.',
    };
  }

  return {
    isLocked: false,
    actionLabel: '',
    message: '',
  };
}

function getSubmissionActionLabel(kind: SubmissionTargetKind, item: StudentSubmittableItem) {
  const lockState = getSubmissionLockState(item);

  if (lockState.isLocked) {
    return lockState.actionLabel;
  }

  if (item.submission) {
    return 'Update submission';
  }

  return kind === 'assignment' ? 'Submit assignment' : 'Submit activity';
}

function formatDateTime(value: string, fallback = 'Not submitted yet') {
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

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentSizeError(attachments: Array<Pick<AttachmentRecord, 'name' | 'size'>>) {
  const oversizedAttachment = attachments.find((attachment) => attachment.size > MAX_ATTACHMENT_BYTES);

  if (oversizedAttachment) {
    return `Attachment "${oversizedAttachment.name}" is too large. Keep each file under 2 MB.`;
  }

  const totalAttachmentBytes = attachments.reduce((sum, attachment) => sum + attachment.size, 0);

  if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return 'Attachments are too large. Keep the total under 5 MB.';
  }

  return null;
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string) {
  const responseText = await response.text();

  if (!responseText) {
    return {} as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    if (response.status === 413) {
      throw new Error('This submission is too large for the server to accept. Use smaller files and keep the total under 5 MB.');
    }

    throw new Error(
      response.ok
        ? 'The server returned a web page instead of an API response. Check that the backend is reachable from this device.'
        : fallbackMessage,
    );
  }
}

function formatAssessmentType(value: 'quiz' | 'quarter-exam') {
  return value === 'quarter-exam' ? 'Quarter exam' : 'Quiz';
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

function formatDeadlineLabel(date: string, time?: string) {
  const dateLabel = formatCalendarDate(date);

  if (!time) {
    return dateLabel;
  }

  return `${dateLabel} at ${formatTimeLabel(time)}`;
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

function getAssessmentAttemptScoreSummary(attempt: AssessmentAttemptSummary) {
  const autoCheckedTotal = Math.max(attempt.totalPoints - attempt.pendingManualPoints, 0);

  if (attempt.manualReviewPending) {
    return {
      label: autoCheckedTotal > 0 ? 'Auto-checked' : 'Submitted',
      value:
        autoCheckedTotal > 0
          ? `${attempt.score} / ${autoCheckedTotal}`
          : 'Essay review pending',
      helper:
        attempt.pendingManualPoints > 0
          ? `${attempt.pendingManualPoints} point${attempt.pendingManualPoints === 1 ? '' : 's'} still pending review`
          : 'Waiting for manual review',
    };
  }

  return {
    label: 'Final score',
    value: `${attempt.score} / ${attempt.totalPoints}`,
    helper: `${attempt.percentage.toFixed(1)}% checked`,
  };
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

function SubjectDetails() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const submissionAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<(typeof subjectTabs)[number]['id']>('lesson-progress');
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [selectedSubmissionTarget, setSelectedSubmissionTarget] = useState<{
    id: string;
    kind: SubmissionTargetKind;
  } | null>(null);
  const [submissionType, setSubmissionType] = useState<'text' | 'file'>('text');
  const [submissionText, setSubmissionText] = useState('');
  const [submissionAttachments, setSubmissionAttachments] = useState<AttachmentRecord[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<MeetingRecord | null>(null);
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
    queryKey: ['student-subject-detail', subjectId],
    queryFn: async () => {
      const response = await fetch(`/api/student/subjects/${subjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseApiResponse<{
        message?: string;
        data?: SubjectDetailsResponse;
      }>(response, 'Failed to load subject details');

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

  const subject = subjectQuery.data;
  const SubjectIcon = getSubjectIcon(subject?.iconKey ?? 'book');
  const selectedActivity =
    selectedSubmissionTarget?.kind === 'activity'
      ? subject?.activities.find((activity) => activity.id === selectedSubmissionTarget.id) ?? null
      : null;
  const selectedAssignment =
    selectedSubmissionTarget?.kind === 'assignment'
      ? subject?.assignments.find((assignment) => assignment.id === selectedSubmissionTarget.id) ?? null
      : null;
  const selectedSubmissionItem = selectedActivity ?? selectedAssignment;
  const selectedSubmissionLabel =
    selectedSubmissionTarget?.kind === 'assignment' ? 'assignment' : 'activity';
  const selectedSubmissionLock = getSubmissionLockState(selectedSubmissionItem);

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

  const submitActivityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmissionTarget) {
        throw new Error('Select an activity or assignment first');
      }

      const endpoint =
        selectedSubmissionTarget.kind === 'assignment'
          ? `/api/student/subjects/${subjectId}/assignments/${selectedSubmissionTarget.id}/submission`
          : `/api/student/subjects/${subjectId}/activities/${selectedSubmissionTarget.id}/submission`;
      const response = await fetch(
        endpoint,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            submissionType,
            textContent: submissionText,
            attachments: submissionAttachments,
          }),
        },
      );

      const data = await parseApiResponse<{
        message?: string;
        errors?: Record<string, string[]>;
      }>(response, 'Failed to submit activity');

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to submit activity',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      closeSubmissionModal(true);
      setPopupState({
        open: true,
        title: `${selectedSubmissionTarget?.kind === 'assignment' ? 'Assignment' : 'Activity'} submitted`,
        message: 'Your submission is now saved successfully.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['student-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setSubmissionError(
        error.errors?.submissionType?.[0]
          ?? error.errors?.textContent?.[0]
          ?? error.errors?.attachments?.[0]
          ?? error.message
          ?? 'Please review your submission and try again.',
      );
      setPopupState({
        open: true,
        title: `Unable to submit ${selectedSubmissionTarget?.kind === 'assignment' ? 'assignment' : 'activity'}`,
        message: error.message || 'Please review your submission and try again.',
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
    return <Navigate to="/student/dashboard" replace />;
  }

  function resetSubmissionForm() {
    setSubmissionType('text');
    setSubmissionText('');
    setSubmissionAttachments([]);
    setSubmissionError(null);
    if (submissionAttachmentInputRef.current) {
      submissionAttachmentInputRef.current.value = '';
    }
  }

  function closeSubmissionModal(force = false) {
    if (!force && submitActivityMutation.isPending) {
      return;
    }

    setIsSubmissionModalOpen(false);
    setSelectedSubmissionTarget(null);
    resetSubmissionForm();
  }

  function openSubmissionModal(kind: SubmissionTargetKind, itemId: string) {
    if (kind === 'assignment') {
      const assignment = subject?.assignments.find((entry) => entry.id === itemId);

      if (!assignment) {
        return;
      }

      const lockState = getSubmissionLockState(assignment);

      if (lockState.isLocked) {
        setPopupState({
          open: true,
          title: 'Submission locked',
          message: lockState.message,
          variant: 'error',
        });
        return;
      }

      setSelectedSubmissionTarget({ id: itemId, kind });
      setSubmissionType(assignment.submission?.submissionType ?? assignment.assignmentType);
      setSubmissionText(assignment.submission?.textContent ?? '');
      setSubmissionAttachments(assignment.submission?.attachments ?? []);
      setSubmissionError(null);
      setIsSubmissionModalOpen(true);
      return;
    }

    const activity = subject?.activities.find((entry) => entry.id === itemId);

    if (!activity) {
      return;
    }

    const lockState = getSubmissionLockState(activity);

    if (lockState.isLocked) {
      setPopupState({
        open: true,
        title: 'Submission locked',
        message: lockState.message,
        variant: 'error',
      });
      return;
    }

    setSelectedSubmissionTarget({ id: itemId, kind });
    setSubmissionType(activity.submission?.submissionType ?? activity.activityType);
    setSubmissionText(activity.submission?.textContent ?? '');
    setSubmissionAttachments(activity.submission?.attachments ?? []);
    setSubmissionError(null);
    setIsSubmissionModalOpen(true);
  }

  const handleSubmissionFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const sizeError = getAttachmentSizeError([
        ...submissionAttachments,
        ...Array.from(event.target.files ?? []),
      ]);

      if (sizeError) {
        setSubmissionError(sizeError);
        setPopupState({
          open: true,
          title: 'Unable to attach file',
          message: sizeError,
          variant: 'error',
        });
        return;
      }

      const files = await readFilesAsDataUrls(event.target.files);

      if (files.length === 0) {
        return;
      }

      setSubmissionAttachments((current) => [...current, ...files]);
      setSubmissionError(null);
    } catch (error) {
      setPopupState({
        open: true,
        title: 'Unable to attach file',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      if (submissionAttachmentInputRef.current) {
        submissionAttachmentInputRef.current.value = '';
      }
    }
  };

  const handleSubmitActivity = () => {
    if (!selectedSubmissionItem) {
      return;
    }

    const lockState = getSubmissionLockState(selectedSubmissionItem);

    if (lockState.isLocked) {
      setSubmissionError(lockState.message);
      return;
    }

    const trimmedText = submissionText.trim();

    if (submissionType === 'text' && !trimmedText) {
      setSubmissionError('Your response is required');
      return;
    }

    if (submissionType === 'file' && submissionAttachments.length === 0) {
      setSubmissionError('Upload at least one file before submitting');
      return;
    }

    const sizeError = getAttachmentSizeError(submissionAttachments);

    if (sizeError) {
      setSubmissionError(sizeError);
      return;
    }

    setSubmissionText(trimmedText);
    setSubmissionError(null);
    submitActivityMutation.mutate();
  };

  return (
    <StudentLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
    >
      <div className="mx-auto w-full max-w-[14.72rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[0.304rem] bg-[linear-gradient(180deg,#d9e4ee_0%,#ccd8e4_100%)] px-6 py-6 shadow-[0_0.152rem_0.352rem_rgba(40,68,99,0.12)] ring-[0.0016rem] ring-[#b8cad8]">
          {subjectQuery.isLoading ? (
            <p className="text-fluid-md text-[#6b8198]">Loading subject details...</p>
          ) : subject ? (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[0.208rem] bg-[linear-gradient(180deg,#dbe8f6_0%,#c8d9ec_100%)] text-[#255a91]">
                  <SubjectIcon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                    Subject workspace
                  </p>
                  <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.05em] text-[#173b70]">
                    {subject.title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-fluid-md leading-[1.7] text-[#6b8198]">
                    {subject.description}
                  </p>
                </div>
              </div>

              <div className="min-w-[2.4rem] rounded-[0.24rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-5 py-4 text-white shadow-[0_0.16rem_0.32rem_rgba(27,46,70,0.18)]">
                <p className="text-fluid-2xs uppercase tracking-[0.18em] text-[#d5e2ef]">
                  Course details
                </p>
                <p className="mt-3 text-fluid-xl font-semibold">{subject.code}</p>
                <p className="mt-2 text-fluid-sm text-[#d5e2ef]">{activeCount} items in this tab</p>
              </div>
            </div>
          ) : null}
        </section>

        {subject ? (
          <section className="mt-6 rounded-[0.288rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[0.216rem] shadow-[0_0.152rem_0.352rem_rgba(40,68,99,0.12)] ring-[0.0016rem] ring-[#b9ccda]">
            <div className="flex flex-wrap gap-3">
              {subjectTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-fluid-base font-semibold transition ${
                      isActive
                        ? 'border-[#6eaad9] bg-[linear-gradient(180deg,#edf6ff_0%,#e1effd_100%)] text-[#215f99] shadow-[0_10px_20px_rgba(43,121,186,0.12)]'
                        : 'border-[#d8e3ec] bg-white text-[#5d7690] hover:bg-[#f8fbfd]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              {activeTab === 'lesson-progress' ? (
                subject.lessonProgress.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.lessonProgress.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[0.208rem] border border-[#c2d2df] bg-[linear-gradient(180deg,#fefefe_0%,#f4f8fb_100%)] px-5 py-5 shadow-[0_0.12rem_0.288rem_rgba(40,68,99,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-fluid-lg font-semibold text-[#173b70]">{item.lesson}</h2>
                            <p className="mt-2 text-fluid-sm leading-[1.6] text-[#7088a1]">
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
                          <div className="h-[0.0672rem] rounded-full bg-[#dde8f1]">
                            <div
                              className="h-full rounded-full bg-[#3c7de0]"
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                        </div>
                        {item.subtopics.length > 0 ? (
                          <div className="mt-5 rounded-[0.176rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] p-4">
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Subtopics
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.subtopics.map((subtopic) => (
                                <div
                                  key={subtopic.id}
                                  className="flex items-center gap-3 rounded-[0.152rem] border border-[#c8d7e2] bg-[rgba(255,255,255,0.96)] px-3 py-3 text-fluid-sm text-[#37506c]"
                                >
                                  <span
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-fluid-2xs font-semibold ${
                                      subtopic.isCompleted
                                        ? 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]'
                                        : 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]'
                                    }`}
                                  >
                                    {subtopic.isCompleted ? 'âœ“' : ''}
                                  </span>
                                  <span className={subtopic.isCompleted ? 'text-[#56738f] line-through' : ''}>
                                    {subtopic.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Lesson Progress" />
                )
              ) : null}

              {activeTab === 'modules' ? (
                subject.modules.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {subject.modules.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[0.208rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_0.128rem_0.304rem_rgba(40,68,99,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <p className="mt-2 text-fluid-sm font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Topic
                            </p>
                            <p className="mt-1 text-fluid-sm text-[#45627f]">{item.topicTitle}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.progress)}`}>
                            {item.progress}
                          </span>
                        </div>
                        <p className="mt-3 text-fluid-sm leading-[1.65] text-[#7088a1]">
                          {item.summary}
                        </p>
                        {item.referenceLinks.length > 0 || item.attachments.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {item.referenceLinks.length > 0 ? (
                              <div className="rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                                <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  References
                                </p>
                                <div className="mt-3 space-y-2">
                                  {item.referenceLinks.map((link) => (
                                    <a
                                      key={link}
                                      href={link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between gap-3 rounded-[0.144rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-fluid-sm font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{link}</span>
                                      </span>
                                      <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                        Open link
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {item.attachments.length > 0 ? (
                              <div className="rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                                <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  Files
                                </p>
                                <div className="mt-3 space-y-2">
                                  {item.attachments.map((attachment) => (
                                    <a
                                      key={attachment.id}
                                      href={attachment.dataUrl}
                                      download={attachment.name}
                                      className="flex items-center justify-between gap-3 rounded-[0.144rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-fluid-sm font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{attachment.name}</span>
                                      </span>
                                      <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                        Download
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
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
                    {subject.activities.map((item) => {
                      const lockState = getSubmissionLockState(item);

                      return (
                      <article
                        key={item.id}
                        className="rounded-[0.208rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_0.128rem_0.304rem_rgba(40,68,99,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatDeadlineLabel(item.dueDate, item.deadlineTime)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                Text or file submission
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {item.targetSectionLabel}
                              </span>
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="scrollbar-super-thin mt-4 max-h-36 overflow-y-auto pr-1 sm:max-h-40 lg:max-h-none lg:overflow-visible lg:pr-0">
                          <p className="formatted-text text-fluid-xs leading-[1.6] text-[#7088a1] sm:text-fluid-sm sm:leading-[1.65]">
                            {item.detail}
                          </p>
                        </div>

                        <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Your submission
                              </p>
                              <p className="mt-2 text-fluid-sm text-[#45627f]">
                                {item.submission
                                  ? item.submission.isManualReview
                                    ? 'Scored manually by faculty.'
                                    : `Submitted ${formatDateTime(item.submission.submittedAt)}`
                                  : 'You have not submitted this activity yet.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openSubmissionModal('activity', item.id)}
                              disabled={lockState.isLocked}
                              title={lockState.message || undefined}
                              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-fluid-sm font-semibold transition ${
                                lockState.isLocked
                                  ? 'cursor-not-allowed border-[#cbd8e4] bg-[#e5edf4] text-[#6d86a0]'
                                  : 'border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] text-white hover:brightness-105'
                              }`}
                            >
                              <FiSend className="h-3.5 w-3.5" />
                              {getSubmissionActionLabel('activity', item)}
                            </button>
                          </div>
                          {lockState.isLocked ? (
                            <p className="mt-3 text-fluid-xs font-medium text-[#6d86a0]">
                              {lockState.message}
                            </p>
                          ) : null}
                        </div>

                        {item.submission && (item.submission.reviewScore !== null || item.submission.reviewComment) ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#bce8cf] bg-[#effbf4] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#12815a]">
                              Faculty review
                            </p>
                            {item.submission.reviewScore !== null ? (
                              <p className="mt-2 text-fluid-base font-semibold text-[#173b70]">
                                Score: {item.submission.reviewScore}
                              </p>
                            ) : null}
                            {item.submission.reviewComment ? (
                              <p className="formatted-text mt-2 text-fluid-sm leading-[1.65] text-[#45627f]">
                                {item.submission.reviewComment}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {item.submission?.textContent ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Submitted response
                            </p>
                            <div className="scrollbar-super-thin mt-3 max-h-32 overflow-y-auto pr-1 sm:max-h-40 lg:max-h-none lg:overflow-visible lg:pr-0">
                              <p className="formatted-text text-fluid-xs leading-[1.6] text-[#7088a1] sm:text-fluid-sm sm:leading-[1.65]">
                                {item.submission.textContent}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {item.attachments.length > 0 ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Files
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.dataUrl}
                                  download={attachment.name}
                                  className="flex items-center justify-between gap-3 rounded-[0.144rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-fluid-sm font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Download
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {item.submission?.attachments.length ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Submitted files
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.submission.attachments.map((attachment, index) => (
                                <div
                                  key={`${attachment.name}-${attachment.id ?? index}`}
                                  className="flex items-center justify-between gap-3 rounded-[0.144rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-fluid-sm text-[#2f78bc]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Submitted
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyTabState label="Activities" />
                )
              ) : null}

              {activeTab === 'assignments' ? (
                subject.assignments.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.assignments.map((item) => {
                      const lockState = getSubmissionLockState(item);

                      return (
                      <article
                        key={item.id}
                        className="rounded-[0.208rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_0.128rem_0.304rem_rgba(40,68,99,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatDeadlineLabel(item.dueDate, item.deadlineTime)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                Text or file submission
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {item.targetSectionLabel}
                              </span>
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="scrollbar-super-thin mt-4 max-h-36 overflow-y-auto pr-1 sm:max-h-40 lg:max-h-none lg:overflow-visible lg:pr-0">
                          <p className="formatted-text text-fluid-xs leading-[1.6] text-[#7088a1] sm:text-fluid-sm sm:leading-[1.65]">
                            {item.detail}
                          </p>
                        </div>

                        <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Your submission
                              </p>
                              <p className="mt-2 text-fluid-sm text-[#45627f]">
                                {item.submission
                                  ? item.submission.isManualReview
                                    ? 'Scored manually by faculty.'
                                    : `Submitted ${formatDateTime(item.submission.submittedAt)}`
                                  : 'You have not submitted this assignment yet.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openSubmissionModal('assignment', item.id)}
                              disabled={lockState.isLocked}
                              title={lockState.message || undefined}
                              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-fluid-sm font-semibold transition ${
                                lockState.isLocked
                                  ? 'cursor-not-allowed border-[#cbd8e4] bg-[#e5edf4] text-[#6d86a0]'
                                  : 'border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] text-white hover:brightness-105'
                              }`}
                            >
                              <FiSend className="h-3.5 w-3.5" />
                              {getSubmissionActionLabel('assignment', item)}
                            </button>
                          </div>
                          {lockState.isLocked ? (
                            <p className="mt-3 text-fluid-xs font-medium text-[#6d86a0]">
                              {lockState.message}
                            </p>
                          ) : null}
                        </div>

                        {item.submission && (item.submission.reviewScore !== null || item.submission.reviewComment) ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#bce8cf] bg-[#effbf4] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#12815a]">
                              Faculty review
                            </p>
                            {item.submission.reviewScore !== null ? (
                              <p className="mt-2 text-fluid-base font-semibold text-[#173b70]">
                                Score: {item.submission.reviewScore}
                              </p>
                            ) : null}
                            {item.submission.reviewComment ? (
                              <p className="formatted-text mt-2 text-fluid-sm leading-[1.65] text-[#45627f]">
                                {item.submission.reviewComment}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {item.submission?.textContent ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Submitted response
                            </p>
                            <div className="scrollbar-super-thin mt-3 max-h-32 overflow-y-auto pr-1 sm:max-h-40 lg:max-h-none lg:overflow-visible lg:pr-0">
                              <p className="formatted-text text-fluid-xs leading-[1.6] text-[#7088a1] sm:text-fluid-sm sm:leading-[1.65]">
                                {item.submission.textContent}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {item.attachments.length > 0 ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Files
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.attachments.map((attachment) => (
                                <a
                                  key={attachment.id ?? attachment.name}
                                  href={attachment.dataUrl}
                                  download={attachment.name}
                                  className="flex items-center justify-between gap-3 rounded-[0.144rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-fluid-sm font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Download
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {item.submission?.attachments.length ? (
                          <div className="mt-4 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Submitted files
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.submission.attachments.map((attachment, index) => (
                                <div
                                  key={`${attachment.name}-${attachment.id ?? index}`}
                                  className="flex items-center justify-between gap-3 rounded-[0.144rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-fluid-sm text-[#2f78bc]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Submitted
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyTabState label="Assignments" />
                )
              ) : null}

              {activeTab === 'assessments' ? (
                subject.assessments.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.assessments.map((item) => {
                      const attemptSummary = item.attempt
                        ? getAssessmentAttemptScoreSummary(item.attempt)
                        : null;

                      return (
                        <article
                          key={item.id}
                          className="rounded-[0.208rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_0.128rem_0.304rem_rgba(40,68,99,0.1)]"
                        >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatCalendarDate(item.schedule)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {formatAssessmentType(item.assessmentType)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {item.targetSectionLabel}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatAssessmentWindow(item.startTime, item.endTime)}
                              </span>
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="formatted-text mt-4 text-fluid-sm leading-[1.65] text-[#7088a1]">
                          {item.detail}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Question count
                            </p>
                            <p className="mt-3 text-fluid-lg font-semibold text-[#173b70]">
                              {item.questionCount} question{item.questionCount === 1 ? '' : 's'}
                            </p>
                          </div>

                          <div className="rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            {item.attempt ? (
                              <>
                                <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  {attemptSummary?.label}
                                </p>
                                <p className="mt-3 text-fluid-lg font-semibold text-[#173b70]">
                                  {attemptSummary?.value}
                                </p>
                                <p className="mt-2 text-fluid-sm text-[#7088a1]">
                                  {attemptSummary?.helper}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  Availability
                                </p>
                                <p className="mt-3 text-fluid-lg font-semibold text-[#173b70]">
                                  {item.availabilityLabel}
                                </p>
                                <p className="mt-2 text-fluid-sm text-[#7088a1]">
                                  {item.canTake
                                    ? 'You can answer this assessment now.'
                                    : 'Open the assessment page to review the schedule details.'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                          <div>
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Assessment action
                            </p>
                            <p className="mt-2 text-fluid-sm text-[#7088a1]">
                              {item.attempt
                                ? `Submitted ${formatDateTime(item.attempt.submittedAt)}`
                                : item.canTake
                                  ? 'Start your exam and submit once when finished.'
                                  : 'Wait for the scheduled exam window or question setup.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/student/subjects/${subjectId}/assessments/${item.id}`)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-fluid-sm font-semibold transition ${
                              item.attempt || item.canTake
                                ? 'border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] text-white hover:brightness-105'
                                : 'border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] text-[#2f78bc] hover:bg-white'
                            }`}
                          >
                            {item.attempt ? 'View result' : item.canTake ? 'Take assessment' : 'View schedule'}
                            <FiArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                        </article>
                      );
                    })}
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
                          className="rounded-[0.208rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_0.128rem_0.304rem_rgba(40,68,99,0.1)]"
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
                            <div className="rounded-[0.152rem] border border-[#c9d8e3] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-right">
                              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.12em] text-[#6d86a0]">
                                Room
                              </p>
                              <p className="mt-1 max-w-[1.92rem] break-all text-fluid-xs font-semibold text-[#173b70]">
                                {item.roomName}
                              </p>
                            </div>
                          </div>

                          <p className="formatted-text mt-4 text-fluid-sm leading-[1.65] text-[#7088a1]">
                            {item.agenda || 'No agenda published for this conference yet.'}
                          </p>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                              <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Session timing
                              </p>
                              <p className="mt-2 text-fluid-sm text-[#45627f]">
                                Created {formatDateTime(item.createdAt)}
                              </p>
                              <p className="mt-1 text-fluid-xs text-[#7088a1]">
                                Started {formatDateTime(item.startedAt, 'not yet')} and ended {formatDateTime(item.endedAt, 'not yet')}
                              </p>
                            </div>

                            <div className="rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                              <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Notes status
                              </p>
                              <p className="mt-2 text-fluid-sm font-semibold text-[#173b70]">
                                {item.aiStatusLabel}
                              </p>
                              <p className="mt-1 text-fluid-xs text-[#7088a1]">
                                {item.aiNotes
                                  ? 'Notes are ready to review.'
                                  : item.aiStatus === 'processing'
                                    ? 'The instructor recording is still being processed.'
                                    : 'Open the conference page for the latest room details.'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[0.16rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <div>
                              <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Conference action
                              </p>
                              <p className="mt-2 text-fluid-sm text-[#7088a1]">
                                {item.status === 'live'
                                  ? 'The conference is live. Open the room for the latest status and notes.'
                                  : item.status === 'ended'
                                    ? 'Review the conference summary and transcript.'
                                    : 'This conference has been scheduled but has not started yet.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/student/subjects/${subjectId}/meetings/${item.id}`)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-2 text-fluid-sm font-semibold text-white transition hover:brightness-105"
                            >
                              {item.status === 'ended' ? 'Review conference' : 'Open room'}
                              <FiArrowRight className="h-4 w-4" />
                            </button>
                            {item.recordingUrl ? (
                              <button
                                type="button"
                                onClick={() => setSelectedRecording(item)}
                                className="inline-flex items-center gap-2 rounded-full border border-[#d8e3ec] bg-white px-3.5 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f8fbfd]"
                              >
                                <FiEye className="h-4 w-4" />
                                Play recording
                              </button>
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
            <video src={selectedRecording.recordingUrl} controls className="max-h-[68vh] w-full rounded-[0.16rem] bg-black" />
          )
        ) : (
          <p className="text-fluid-sm text-[#607b95]">No recording has been saved yet.</p>
        )}
      </Modal>

      <Modal
        open={isSubmissionModalOpen && Boolean(selectedSubmissionItem)}
        title={
          selectedSubmissionLock.isLocked
            ? 'Submission locked'
            : selectedSubmissionItem?.submission
              ? 'Update submission'
              : `Submit ${selectedSubmissionLabel}`
        }
        description={
          selectedSubmissionLock.isLocked
            ? selectedSubmissionLock.message
            : selectedSubmissionItem
            ? `Choose whether to send text or files for ${selectedSubmissionItem.title}.`
            : undefined
        }
        onClose={() => closeSubmissionModal()}
        panelClassName="max-h-[calc(100dvh-0.12rem)] sm:max-h-[calc(100dvh-0.32rem)] flex flex-col"
        bodyClassName="scrollbar-super-thin min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
        actions={
          <>
            <button
              type="button"
              onClick={() => closeSubmissionModal()}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitActivity}
              disabled={submitActivityMutation.isPending || !selectedSubmissionItem || selectedSubmissionLock.isLocked}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitActivityMutation.isPending
                ? 'Saving...'
                : selectedSubmissionLock.isLocked
                  ? selectedSubmissionLock.actionLabel
                  : selectedSubmissionItem?.submission
                    ? 'Update submission'
                    : 'Submit now'}
            </button>
          </>
        }
      >
        {selectedSubmissionItem ? (
          <div className="space-y-4 sm:space-y-5">
            {selectedSubmissionLock.isLocked ? (
              <div className="rounded-[0.16rem] border border-[#ecd0d0] bg-[#fff2f2] px-4 py-3 text-fluid-sm font-medium text-[#9f4848]">
                {selectedSubmissionLock.message}
              </div>
            ) : null}

            <div className="rounded-[0.16rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-3.5 py-3 sm:px-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                  {formatDeadlineLabel(selectedSubmissionItem.dueDate, selectedSubmissionItem.deadlineTime)}
                </span>
                <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                  Text or file submission
                </span>
                <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                  {selectedSubmissionItem.targetSectionLabel}
                </span>
              </div>
              <div className="scrollbar-super-thin mt-3 max-h-44 overflow-y-auto pr-1 sm:max-h-52">
                <p className="formatted-text text-fluid-xs leading-[1.6] text-[#7088a1] sm:text-fluid-sm sm:leading-[1.65]">
                  {selectedSubmissionItem.detail}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 block text-fluid-base font-semibold text-[#173b70]">
                Submission format
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={selectedSubmissionLock.isLocked}
                  onClick={() => {
                    setSubmissionType('text');
                    setSubmissionError(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-fluid-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    submissionType === 'text'
                      ? 'border-[#6eaad9] bg-[linear-gradient(180deg,#edf6ff_0%,#e1effd_100%)] text-[#215f99] shadow-[0_10px_20px_rgba(43,121,186,0.12)]'
                      : 'border-[#d8e3ec] bg-white text-[#5d7690] hover:bg-[#f8fbfd]'
                  }`}
                >
                  Text response
                </button>
                <button
                  type="button"
                  disabled={selectedSubmissionLock.isLocked}
                  onClick={() => {
                    setSubmissionType('file');
                    setSubmissionError(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-fluid-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    submissionType === 'file'
                      ? 'border-[#6eaad9] bg-[linear-gradient(180deg,#edf6ff_0%,#e1effd_100%)] text-[#215f99] shadow-[0_10px_20px_rgba(43,121,186,0.12)]'
                      : 'border-[#d8e3ec] bg-white text-[#5d7690] hover:bg-[#f8fbfd]'
                  }`}
                >
                  File upload
                </button>
              </div>
            </div>

            {submissionType === 'text' ? (
              <div>
                <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="submission-text">
                  Your response
                </label>
                <textarea
                  id="submission-text"
                  value={submissionText}
                  disabled={selectedSubmissionLock.isLocked}
                  onChange={(event) => {
                    setSubmissionText(event.target.value);
                    setSubmissionError(null);
                  }}
                  rows={5}
                  placeholder="Write your response here."
                  className={`min-h-[1.36rem] w-full resize-none rounded-[0.16rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition sm:min-h-[1.6rem] ${
                    submissionError ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                  }`}
                />
              </div>
            ) : (
              <div className="rounded-[0.192rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-fluid-base font-semibold text-[#173b70]">Submission files</p>
                    <p className="mt-1 text-fluid-xs text-[#7088a1]">
                      Upload the files you want to send for this {selectedSubmissionLabel}.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={selectedSubmissionLock.isLocked}
                    onClick={() => submissionAttachmentInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiUploadCloud className="h-4 w-4" />
                    Upload files
                  </button>
                  <input
                    ref={submissionAttachmentInputRef}
                    type="file"
                    multiple
                    disabled={selectedSubmissionLock.isLocked}
                    className="hidden"
                    onChange={handleSubmissionFilesSelected}
                  />
                </div>

                {submissionAttachments.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {submissionAttachments.map((attachment, index) => (
                      <div
                        key={`${attachment.name}-${attachment.id ?? index}`}
                        className="flex items-center justify-between gap-3 rounded-[0.16rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-fluid-sm font-semibold text-[#173b70]">{attachment.name}</p>
                          <p className="mt-1 text-fluid-xs text-[#7088a1]">{formatBytes(attachment.size)}</p>
                        </div>
                        <button
                          type="button"
                          disabled={selectedSubmissionLock.isLocked}
                          onClick={() => {
                            setSubmissionAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
                          }}
                          className="rounded-full p-2 text-[#7f93a8] transition hover:bg-[#fff7f7] hover:text-[#b75353] disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[0.16rem] border border-dashed border-[#bfceda] bg-[linear-gradient(180deg,#f5f9fc_0%,#e8eff5_100%)] px-5 py-6 text-center">
                    <p className="text-fluid-base font-semibold text-[#173b70]">No files uploaded yet</p>
                    <p className="mt-2 text-fluid-sm text-[#7088a1]">
                      Add the file set you want to submit.
                    </p>
                  </div>
                )}
              </div>
            )}

            {submissionError ? (
              <p className="text-fluid-xs font-medium text-rose-500">{submissionError}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <NotificationPopup
        open={popupState.open}
        title={popupState.title}
        message={popupState.message}
        variant={popupState.variant}
        onClose={() => setPopupState((current) => ({ ...current, open: false }))}
      />
    </StudentLayout>
  );
}

export default SubjectDetails;
