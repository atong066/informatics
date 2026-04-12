import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiArrowRight,
  FiPaperclip,
  FiExternalLink,
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiCode,
  FiCpu,
  FiDatabase,
  FiLayers,
  FiTrendingUp,
  FiPackage,
  FiSend,
  FiTrash2,
  FiUploadCloud,
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
    activityType: 'text' | 'file';
    attachments: AttachmentRecord[];
    submission: {
      id: string;
      submissionType: 'text' | 'file';
      textContent: string;
      attachments: AttachmentRecord[];
      submittedAt: string;
    } | null;
    status: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    detail: string;
    dueDate: string;
    assignmentType: 'text' | 'file';
    attachments: AttachmentRecord[];
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
};

const subjectTabs = [
  { id: 'lesson-progress', label: 'Lesson Progress', icon: FiTrendingUp },
  { id: 'modules', label: 'Modules', icon: FiPackage },
  { id: 'activities', label: 'Activities', icon: FiLayers },
  { id: 'assignments', label: 'Assignments', icon: FiClipboard },
  { id: 'assessments', label: 'Assessment', icon: FiCheckCircle },
] as const;

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
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
    case 'Submitted':
    case 'Pending review':
      return 'border-[#c8d9ec] bg-[#eef4fa] text-[#2f78bc]';
    case 'In progress':
    case 'Due soon':
    case 'Upcoming':
      return 'border-[#f2d9bc] bg-[#fff5e8] text-[#b06b15]';
    case 'Closed':
      return 'border-[#ecd0d0] bg-[#fff2f2] text-[#b35a5a]';
    default:
      return 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]';
  }
}

function EmptyTabState({ label }: { label: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#d8e3ec] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fb_100%)] px-6 py-10 text-center">
      <p className="text-[0.98rem] font-semibold text-[#173b70]">No {label.toLowerCase()} yet</p>
      <p className="mt-2 text-[0.84rem] text-[#7088a1]">
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

function formatDateTime(value: string) {
  if (!value) {
    return 'Not submitted yet';
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

function formatAssessmentWindow(startTime: string, endTime: string) {
  if (!startTime && !endTime) {
    return 'Time not set';
  }

  if (startTime && endTime) {
    return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
  }

  return formatTimeLabel(startTime || endTime);
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
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionAttachments, setSubmissionAttachments] = useState<AttachmentRecord[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
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

      const data = (await response.json()) as {
        message?: string;
        data?: SubjectDetailsResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load subject details');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId),
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

  const subject = subjectQuery.data;
  const SubjectIcon = getSubjectIcon(subject?.iconKey ?? 'book');
  const selectedActivity = subject?.activities.find((activity) => activity.id === selectedActivityId) ?? null;

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
      default:
        return 0;
    }
  }, [activeTab, subject]);

  const submitActivityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/student/subjects/${subjectId}/activities/${selectedActivityId}/submission`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            textContent: submissionText,
            attachments: submissionAttachments,
          }),
        },
      );

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

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
        title: 'Activity submitted',
        message: 'Your submission is now saved successfully.',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['student-subject-detail', subjectId] });
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setSubmissionError(
        error.errors?.textContent?.[0]
          ?? error.errors?.attachments?.[0]
          ?? error.message
          ?? 'Please review your submission and try again.',
      );
      setPopupState({
        open: true,
        title: 'Unable to submit activity',
        message: error.message || 'Please review your submission and try again.',
        variant: 'error',
      });
    },
  });

  function resetSubmissionForm() {
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
    setSelectedActivityId(null);
    resetSubmissionForm();
  }

  function openSubmissionModal(activityId: string) {
    const activity = subject?.activities.find((entry) => entry.id === activityId);

    if (!activity) {
      return;
    }

    setSelectedActivityId(activityId);
    setSubmissionText(activity.submission?.textContent ?? '');
    setSubmissionAttachments(activity.submission?.attachments ?? []);
    setSubmissionError(null);
    setIsSubmissionModalOpen(true);
  }

  const handleSubmissionFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
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
    if (!selectedActivity) {
      return;
    }

    const trimmedText = submissionText.trim();

    if (selectedActivity.activityType === 'text' && !trimmedText) {
      setSubmissionError('Your response is required');
      return;
    }

    if (selectedActivity.activityType === 'file' && submissionAttachments.length === 0) {
      setSubmissionError('Upload at least one file before submitting');
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
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[1.9rem] bg-[linear-gradient(180deg,#d9e4ee_0%,#ccd8e4_100%)] px-6 py-6 shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b8cad8]">
          {subjectQuery.isLoading ? (
            <p className="text-[0.95rem] text-[#6b8198]">Loading subject details...</p>
          ) : subject ? (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-[linear-gradient(180deg,#dbe8f6_0%,#c8d9ec_100%)] text-[#255a91]">
                  <SubjectIcon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                    Subject workspace
                  </p>
                  <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-[#173b70]">
                    {subject.title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-[0.95rem] leading-[1.7] text-[#6b8198]">
                    {subject.description}
                  </p>
                </div>
              </div>

              <div className="min-w-[15rem] rounded-[1.5rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-5 py-4 text-white shadow-[0_1rem_2rem_rgba(27,46,70,0.18)]">
                <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[#d5e2ef]">
                  Course details
                </p>
                <p className="mt-3 text-[1.15rem] font-semibold">{subject.code}</p>
                <p className="mt-2 text-[0.82rem] text-[#d5e2ef]">{activeCount} items in this tab</p>
              </div>
            </div>
          ) : null}
        </section>

        {subject ? (
          <section className="mt-6 rounded-[1.8rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[1.35rem] shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b9ccda]">
            <div className="flex flex-wrap gap-3">
              {subjectTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.88rem] font-semibold transition ${
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
                        className="rounded-[1.3rem] border border-[#c2d2df] bg-[linear-gradient(180deg,#fefefe_0%,#f4f8fb_100%)] px-5 py-5 shadow-[0_.75rem_1.8rem_rgba(40,68,99,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-[1rem] font-semibold text-[#173b70]">{item.lesson}</h2>
                            <p className="mt-2 text-[0.82rem] leading-[1.6] text-[#7088a1]">
                              {item.summary}
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.state)}`}>
                            {item.state}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[0.8rem] font-medium text-[#5f7892]">Completion</p>
                            <p className="text-[0.8rem] font-semibold text-[#173b70]">{item.completion}%</p>
                          </div>
                          <div className="h-[0.42rem] rounded-full bg-[#dde8f1]">
                            <div
                              className="h-full rounded-full bg-[#3c7de0]"
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                        </div>
                        {item.subtopics.length > 0 ? (
                          <div className="mt-5 rounded-[1.1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] p-4">
                            <p className="text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Subtopics
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.subtopics.map((subtopic) => (
                                <div
                                  key={subtopic.id}
                                  className="flex items-center gap-3 rounded-[0.95rem] border border-[#c8d7e2] bg-[rgba(255,255,255,0.96)] px-3 py-3 text-[0.84rem] text-[#37506c]"
                                >
                                  <span
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold ${
                                      subtopic.isCompleted
                                        ? 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]'
                                        : 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]'
                                    }`}
                                  >
                                    {subtopic.isCompleted ? '✓' : ''}
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
                        className="rounded-[1.3rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_.8rem_1.9rem_rgba(40,68,99,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                            <p className="mt-2 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Topic
                            </p>
                            <p className="mt-1 text-[0.84rem] text-[#45627f]">{item.topicTitle}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.progress)}`}>
                            {item.progress}
                          </span>
                        </div>
                        <p className="mt-3 text-[0.84rem] leading-[1.65] text-[#7088a1]">
                          {item.summary}
                        </p>
                        {item.referenceLinks.length > 0 || item.attachments.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {item.referenceLinks.length > 0 ? (
                              <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  References
                                </p>
                                <div className="mt-3 space-y-2">
                                  {item.referenceLinks.map((link) => (
                                    <a
                                      key={link}
                                      href={link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-[0.82rem] font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{link}</span>
                                      </span>
                                      <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                        Open link
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {item.attachments.length > 0 ? (
                              <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  Files
                                </p>
                                <div className="mt-3 space-y-2">
                                  {item.attachments.map((attachment) => (
                                    <a
                                      key={attachment.id}
                                      href={attachment.dataUrl}
                                      download={attachment.name}
                                      className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-[0.82rem] font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{attachment.name}</span>
                                      </span>
                                      <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
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
                    {subject.activities.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_.8rem_1.9rem_rgba(40,68,99,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatCalendarDate(item.dueDate)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {item.activityType === 'file' ? 'File upload' : 'Text only'}
                              </span>
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="mt-4 text-[0.84rem] leading-[1.65] text-[#7088a1]">
                          {item.detail}
                        </p>

                        <div className="mt-4 rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Your submission
                              </p>
                              <p className="mt-2 text-[0.84rem] text-[#45627f]">
                                {item.submission
                                  ? `Submitted ${formatDateTime(item.submission.submittedAt)}`
                                  : 'You have not submitted this activity yet.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openSubmissionModal(item.id)}
                              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-2 text-[0.78rem] font-semibold text-white transition hover:brightness-105"
                            >
                              <FiSend className="h-3.5 w-3.5" />
                              {item.submission ? 'Update submission' : 'Submit activity'}
                            </button>
                          </div>
                        </div>

                        {item.submission?.textContent ? (
                          <div className="mt-4 rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Submitted response
                            </p>
                            <p className="mt-3 text-[0.84rem] leading-[1.65] text-[#7088a1]">
                              {item.submission.textContent}
                            </p>
                          </div>
                        ) : null}

                        {item.attachments.length > 0 ? (
                          <div className="mt-4 rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Files
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.dataUrl}
                                  download={attachment.name}
                                  className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-[0.82rem] font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Download
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {item.submission?.attachments.length ? (
                          <div className="mt-4 rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Submitted files
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.submission.attachments.map((attachment, index) => (
                                <div
                                  key={`${attachment.name}-${attachment.id ?? index}`}
                                  className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-[0.82rem] text-[#2f78bc]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                    Submitted
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
                  <EmptyTabState label="Activities" />
                )
              ) : null}

              {activeTab === 'assignments' ? (
                subject.assignments.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.assignments.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_.8rem_1.9rem_rgba(40,68,99,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatCalendarDate(item.dueDate)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {item.assignmentType === 'file' ? 'File upload' : 'Text only'}
                              </span>
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="mt-4 text-[0.84rem] leading-[1.65] text-[#7088a1]">
                          {item.detail}
                        </p>

                        {item.attachments.length > 0 ? (
                          <div className="mt-4 rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Files
                            </p>
                            <div className="mt-3 space-y-2">
                              {item.attachments.map((attachment) => (
                                <a
                                  key={attachment.id ?? attachment.name}
                                  href={attachment.dataUrl}
                                  download={attachment.name}
                                  className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-[#bfd0dd] bg-[rgba(255,255,255,0.92)] px-3 py-3 text-[0.82rem] font-medium text-[#2f78bc] transition hover:border-[#a9c3d7] hover:bg-white hover:text-[#215f99]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FiPaperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#bed1df] bg-[#edf4fa] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
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
                    {subject.assessments.map((item) => {
                      const attemptSummary = item.attempt
                        ? getAssessmentAttemptScoreSummary(item.attempt)
                        : null;

                      return (
                        <article
                          key={item.id}
                          className="rounded-[1.3rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_.8rem_1.9rem_rgba(40,68,99,0.1)]"
                        >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatCalendarDate(item.schedule)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {formatAssessmentType(item.assessmentType)}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {item.targetSectionLabel}
                              </span>
                              <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatAssessmentWindow(item.startTime, item.endTime)}
                              </span>
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        <p className="mt-4 text-[0.84rem] leading-[1.65] text-[#7088a1]">
                          {item.detail}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Question count
                            </p>
                            <p className="mt-3 text-[1.05rem] font-semibold text-[#173b70]">
                              {item.questionCount} question{item.questionCount === 1 ? '' : 's'}
                            </p>
                          </div>

                          <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                            {item.attempt ? (
                              <>
                                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  {attemptSummary?.label}
                                </p>
                                <p className="mt-3 text-[1.05rem] font-semibold text-[#173b70]">
                                  {attemptSummary?.value}
                                </p>
                                <p className="mt-2 text-[0.8rem] text-[#7088a1]">
                                  {attemptSummary?.helper}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                  Availability
                                </p>
                                <p className="mt-3 text-[1.05rem] font-semibold text-[#173b70]">
                                  {item.availabilityLabel}
                                </p>
                                <p className="mt-2 text-[0.8rem] text-[#7088a1]">
                                  {item.canTake
                                    ? 'You can answer this assessment now.'
                                    : 'Open the assessment page to review the schedule details.'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                          <div>
                            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Assessment action
                            </p>
                            <p className="mt-2 text-[0.82rem] text-[#7088a1]">
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
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8rem] font-semibold transition ${
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
            </div>
          </section>
        ) : null}
      </div>

      <Modal
        open={isSubmissionModalOpen && Boolean(selectedActivity)}
        title={selectedActivity?.submission ? 'Update submission' : 'Submit activity'}
        description={
          selectedActivity
            ? `Send your ${selectedActivity.activityType === 'file' ? 'files' : 'response'} for ${selectedActivity.title}.`
            : undefined
        }
        onClose={() => closeSubmissionModal()}
        actions={
          <>
            <button
              type="button"
              onClick={() => closeSubmissionModal()}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitActivity}
              disabled={submitActivityMutation.isPending || !selectedActivity}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitActivityMutation.isPending ? 'Saving...' : selectedActivity?.submission ? 'Update submission' : 'Submit now'}
            </button>
          </>
        }
      >
        {selectedActivity ? (
          <div className="space-y-5">
            <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#607790]">
                  {formatCalendarDate(selectedActivity.dueDate)}
                </span>
                <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                  {selectedActivity.activityType === 'file' ? 'File upload' : 'Text only'}
                </span>
              </div>
              <p className="mt-3 text-[0.84rem] leading-[1.65] text-[#7088a1]">
                {selectedActivity.detail}
              </p>
            </div>

            {selectedActivity.activityType === 'text' ? (
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="submission-text">
                  Your response
                </label>
                <textarea
                  id="submission-text"
                  value={submissionText}
                  onChange={(event) => {
                    setSubmissionText(event.target.value);
                    setSubmissionError(null);
                  }}
                  rows={6}
                  placeholder="Write your response here."
                  className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] leading-6 text-[#25456d] outline-none transition ${
                    submissionError ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                  }`}
                />
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-[#173b70]">Submission files</p>
                    <p className="mt-1 text-[12px] text-[#7088a1]">
                      Upload the files required for this activity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => submissionAttachmentInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-[13px] font-semibold text-[#2f78bc] transition hover:bg-white"
                  >
                    <FiUploadCloud className="h-4 w-4" />
                    Upload files
                  </button>
                  <input
                    ref={submissionAttachmentInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleSubmissionFilesSelected}
                  />
                </div>

                {submissionAttachments.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {submissionAttachments.map((attachment, index) => (
                      <div
                        key={`${attachment.name}-${attachment.id ?? index}`}
                        className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#173b70]">{attachment.name}</p>
                          <p className="mt-1 text-[12px] text-[#7088a1]">{formatBytes(attachment.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
                    <p className="text-[0.9rem] font-semibold text-[#173b70]">No files uploaded yet</p>
                    <p className="mt-2 text-[0.82rem] text-[#7088a1]">
                      Add the file set your instructor asked for.
                    </p>
                  </div>
                )}
              </div>
            )}

            {submissionError ? (
              <p className="text-[12px] font-medium text-rose-500">{submissionError}</p>
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
