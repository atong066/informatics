import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiCode,
  FiCpu,
  FiDatabase,
  FiEdit2,
  FiExternalLink,
  FiLayers,
  FiLink2,
  FiList,
  FiPackage,
  FiPaperclip,
  FiPlus,
  FiTrash2,
  FiTrendingUp,
  FiUploadCloud,
} from 'react-icons/fi';
import { Navigate, useParams } from 'react-router-dom';
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

type FacultySubjectDetailsResponse = {
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
    attachments: AttachmentRecord[];
    progress: string;
    completion?: number;
  }>;
  activities: Array<{
    id: string;
    title: string;
    detail: string;
    status: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: string;
  }>;
  assessments: Array<{
    id: string;
    title: string;
    schedule: string;
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
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
    case 'In progress':
    case 'Due soon':
    case 'Upcoming':
      return 'border-[#f2d9bc] bg-[#fff5e8] text-[#b06b15]';
    default:
      return 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]';
  }
}

function EmptyTabState({ label }: { label: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#c6d5e1] bg-[linear-gradient(180deg,#edf3f8_0%,#e3ebf2_100%)] px-6 py-10 text-center">
      <p className="text-[0.98rem] font-semibold text-[#173b70]">No {label.toLowerCase()} yet</p>
      <p className="mt-2 text-[0.84rem] text-[#7088a1]">
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
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SubjectTabId>('lesson-progress');
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [isSubtopicModalOpen, setIsSubtopicModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [subtopicTitle, setSubtopicTitle] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleSummary, setModuleSummary] = useState('');
  const [moduleLessonId, setModuleLessonId] = useState('');
  const [moduleLinkInput, setModuleLinkInput] = useState('');
  const [moduleReferenceLinks, setModuleReferenceLinks] = useState<string[]>([]);
  const [moduleAttachments, setModuleAttachments] = useState<AttachmentRecord[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    lessonTitle?: string;
    lessonSummary?: string;
    subtopicTitle?: string;
    moduleTitle?: string;
    moduleSummary?: string;
    moduleLessonId?: string;
    moduleLinkInput?: string;
    moduleAttachments?: string;
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
      closeModuleModal();
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
      closeModuleModal();
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
      default:
        return 0;
    }
  }, [activeTab, subject]);

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

  function closeModuleModal() {
    if (createModuleMutation.isPending || updateModuleMutation.isPending) {
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

  const handleDeleteModule = (moduleId: string) => {
    if (!window.confirm('Delete this module? This action cannot be undone.')) {
      return;
    }

    deleteModuleMutation.mutate(moduleId);
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
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[1.9rem] bg-[linear-gradient(180deg,#dce6ef_0%,#ced9e5_100%)] px-6 py-6 shadow-[0_1rem_2.2rem_rgba(27,46,70,0.16)] ring-[0.01rem] ring-[#b8cad8]">
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
                    Faculty subject view
                  </p>
                  <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-[#173b70]">
                    {subject.title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-[0.95rem] leading-[1.7] text-[#5e7891]">
                    {subject.description}
                  </p>
                </div>
              </div>

              <div className="min-w-[15rem] rounded-[1.5rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-5 py-4 text-white shadow-[0_1rem_2rem_rgba(27,46,70,0.18)]">
                <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[#d5e2ef]">
                  Subject details
                </p>
                <p className="mt-3 text-[1.15rem] font-semibold">{subject.code}</p>
                <p className="mt-2 text-[0.82rem] text-[#d5e2ef]">{activeCount} items in this tab</p>
              </div>
            </div>
          ) : null}
        </section>

        {subject ? (
          <section className="mt-6 rounded-[1.8rem] bg-[linear-gradient(180deg,#eff4f9_0%,#e2eaf2_100%)] p-[1.35rem] shadow-[0_1rem_2.2rem_rgba(27,46,70,0.14)] ring-[0.01rem] ring-[#c5d4df]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

              {activeTab === 'lesson-progress' ? (
                <button
                  type="button"
                  onClick={openAddLessonModal}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2 text-[0.88rem] font-semibold text-white shadow-[0_14px_28px_rgba(41,124,198,0.22)] transition hover:brightness-105"
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
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2 text-[0.88rem] font-semibold text-white shadow-[0_14px_28px_rgba(41,124,198,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <FiPlus className="h-4 w-4" />
                  Add module
                </button>
              ) : null}
            </div>

            <div className="mt-6">
              {activeTab === 'lesson-progress' ? (
                subject.lessonProgress.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {subject.lessonProgress.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#c4d2df] bg-[linear-gradient(180deg,#e9f0f6_0%,#dce5ee_100%)] px-5 py-5 shadow-[0_0.9rem_2rem_rgba(27,46,70,0.12)]"
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
                          <div className="h-[0.42rem] rounded-full bg-[#d5e1ea]">
                            <div
                              className="h-full rounded-full bg-[#3c7de0]"
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 rounded-[1.1rem] border border-[#d0dbe6] bg-[linear-gradient(180deg,#f0f5f9_0%,#e4ecf3_100%)] p-4">
                          <div>
                            <p className="text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Subtopics
                            </p>
                            <p className="mt-2 text-[0.88rem] font-semibold text-[#37506c]">
                              {item.subtopics.length} subtopic{item.subtopics.length === 1 ? '' : 's'} added
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openSubtopicModal(item.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#cfdbe6] bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-[#2f78bc] transition hover:bg-[#f6fbff]"
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
                        className="rounded-[1.3rem] border border-[#c6d4df] bg-[linear-gradient(180deg,#e9f0f6_0%,#dde6ee_100%)] px-5 py-5 shadow-[0_0.9rem_2rem_rgba(27,46,70,0.12)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                            <p className="mt-2 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Topic
                            </p>
                            <p className="mt-1 text-[0.86rem] text-[#43617d]">{item.topicTitle}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.progress)}`}>
                            {item.progress}
                          </span>
                        </div>

                        <p className="mt-4 text-[0.84rem] leading-[1.65] text-[#617d98]">{item.summary}</p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1rem] border border-[#d1dce6] bg-[linear-gradient(180deg,#f1f6fa_0%,#e7eef5_100%)] p-4">
                            <div className="flex items-center gap-2 text-[#2f78bc]">
                              <FiLink2 className="h-4 w-4" />
                              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Reference links
                              </p>
                            </div>
                            <p className="mt-3 text-[1.1rem] font-semibold text-[#173b70]">
                              {item.referenceLinks.length}
                            </p>
                          </div>

                          <div className="rounded-[1rem] border border-[#d1dce6] bg-[linear-gradient(180deg,#f1f6fa_0%,#e7eef5_100%)] p-4">
                            <div className="flex items-center gap-2 text-[#2f78bc]">
                              <FiPaperclip className="h-4 w-4" />
                              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                                Attachments
                              </p>
                            </div>
                            <p className="mt-3 text-[1.1rem] font-semibold text-[#173b70]">
                              {item.attachments.length}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModuleModal(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#cfdbe6] bg-white px-3 py-2 text-[0.8rem] font-semibold text-[#2f78bc] transition hover:bg-[#f6fbff]"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                            Edit module
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModule(item.id)}
                            disabled={deleteModuleMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-[#f0c7c7] bg-white px-3 py-2 text-[0.8rem] font-semibold text-[#b75353] transition hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-60"
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

              {activeTab === 'activities' ? <EmptyTabState label="Activities" /> : null}
              {activeTab === 'assignments' ? <EmptyTabState label="Assignments" /> : null}
              {activeTab === 'assessments' ? <EmptyTabState label="Assessment" /> : null}
            </div>
          </section>
        ) : null}
      </div>

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
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
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
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addLessonMutation.isPending ? 'Saving...' : 'Save lesson'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="lesson-title">
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
              className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] text-[#25456d] outline-none transition ${
                fieldErrors.lessonTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
              placeholder="Introduction and orientation"
            />
            {fieldErrors.lessonTitle ? (
              <p className="mt-2 text-[12px] font-medium text-rose-500">{fieldErrors.lessonTitle}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="lesson-summary">
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
              className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] leading-6 text-[#25456d] outline-none transition ${
                fieldErrors.lessonSummary ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
              placeholder="Outline the lesson focus, expectations, and what students should learn."
            />
            {fieldErrors.lessonSummary ? (
              <p className="mt-2 text-[12px] font-medium text-rose-500">{fieldErrors.lessonSummary}</p>
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
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Close
            </button>
            {activeLesson ? (
              <button
                type="button"
                onClick={() => handleAddSubtopic(activeLesson.id)}
                disabled={addSubtopicMutation.isPending}
                className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
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
              <p className="text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                Progress summary
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[0.92rem] font-semibold text-[#173b70]">
                  {activeLesson.subtopics.length} subtopic{activeLesson.subtopics.length === 1 ? '' : 's'}
                </p>
                <p className="text-[0.86rem] font-semibold text-[#2f78bc]">
                  {activeLesson.completion}% complete
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="subtopic-title">
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
                className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] text-[#25456d] outline-none transition ${
                  fieldErrors.subtopicTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                }`}
              />
              {fieldErrors.subtopicTitle ? (
                <p className="mt-2 text-[12px] font-medium text-rose-500">{fieldErrors.subtopicTitle}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              {activeLesson.subtopics.length > 0 ? (
                activeLesson.subtopics.map((subtopic) => (
                  <label
                    key={subtopic.id}
                    className="flex items-center gap-3 rounded-[1rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3 text-[0.9rem] text-[#37506c]"
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
                  <p className="text-[0.9rem] font-semibold text-[#173b70]">No subtopics yet</p>
                  <p className="mt-2 text-[0.82rem] text-[#7088a1]">
                    Add your first subtopic here to start building lesson progress.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
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
              onClick={closeModuleModal}
              className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitModule}
              disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
              className="rounded-2xl border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
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
              <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="module-title">
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
                className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] text-[#25456d] outline-none transition ${
                  fieldErrors.moduleTitle ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                }`}
              />
              {fieldErrors.moduleTitle ? (
                <p className="mt-2 text-[12px] font-medium text-rose-500">{fieldErrors.moduleTitle}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="module-topic">
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
            <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="module-summary">
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
              className={`w-full resize-none rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] leading-6 text-[#25456d] outline-none transition ${
                fieldErrors.moduleSummary ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
              }`}
            />
            {fieldErrors.moduleSummary ? (
              <p className="mt-2 text-[12px] font-medium text-rose-500">{fieldErrors.moduleSummary}</p>
            ) : null}
          </div>

          <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#edf4f9_0%,#e0e9f1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-[14px] font-semibold text-[#173b70]" htmlFor="module-link-input">
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
                  className={`w-full rounded-[1rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] text-[#25456d] outline-none transition ${
                    fieldErrors.moduleLinkInput ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleAddReferenceLink}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-[13px] font-semibold text-[#2f78bc] transition hover:bg-white"
              >
                <FiLink2 className="h-4 w-4" />
                Add link
              </button>
            </div>

            {fieldErrors.moduleLinkInput ? (
              <p className="mt-2 text-[12px] font-medium text-rose-500">{fieldErrors.moduleLinkInput}</p>
            ) : null}

            {moduleReferenceLinks.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {moduleReferenceLinks.map((link) => (
                  <div
                    key={link}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#bcccd9] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-[12px] text-[#37506c]"
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
                <p className="text-[14px] font-semibold text-[#173b70]">Attachments</p>
                <p className="mt-1 text-[12px] text-[#7088a1]">
                  Upload module files for students. Keep each file under 2 MB.
                </p>
              </div>
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b8c9d8] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-[13px] font-semibold text-[#2f78bc] transition hover:bg-white"
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
              <p className="mt-2 text-[12px] font-medium text-rose-500">{fieldErrors.moduleAttachments}</p>
            ) : null}

            {moduleAttachments.length > 0 ? (
              <div className="mt-4 space-y-2">
                {moduleAttachments.map((attachment, index) => (
                  <div
                    key={`${attachment.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#c7d5e0] bg-[rgba(255,255,255,0.94)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#173b70]">{attachment.name}</p>
                      <p className="mt-1 text-[12px] text-[#7088a1]">{formatBytes(attachment.size)}</p>
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
                <p className="text-[0.9rem] font-semibold text-[#173b70]">No files uploaded yet</p>
                <p className="mt-2 text-[0.82rem] text-[#7088a1]">
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
