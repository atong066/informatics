import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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
} from 'react-icons/fi';
import { Navigate, useParams } from 'react-router-dom';
import { getStoredToken } from '../../lib/auth';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import StudentLayout from '../../layout/student/StudentLayout';

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
    <div className="rounded-[1.4rem] border border-dashed border-[#d8e3ec] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fb_100%)] px-6 py-10 text-center">
      <p className="text-[0.98rem] font-semibold text-[#173b70]">No {label.toLowerCase()} yet</p>
      <p className="mt-2 text-[0.84rem] text-[#7088a1]">
        This section will stay empty until records are added from the database.
      </p>
    </div>
  );
}

function SubjectDetails() {
  const { subjectId } = useParams();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const [activeTab, setActiveTab] = useState<(typeof subjectTabs)[number]['id']>('lesson-progress');

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
                  <div className="grid gap-4 lg:grid-cols-3">
                    {subject.activities.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#dde7ef] bg-white px-5 py-5 shadow-[0_.45rem_1.4rem_rgba(40,68,99,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-3 text-[0.84rem] leading-[1.65] text-[#7088a1]">
                          {item.detail}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Activities" />
                )
              ) : null}

              {activeTab === 'assignments' ? (
                subject.assignments.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {subject.assignments.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#dde7ef] bg-white px-5 py-5 shadow-[0_.45rem_1.4rem_rgba(40,68,99,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-3 text-[0.82rem] text-[#7088a1]">Due: {item.dueDate}</p>
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
                      <article
                        key={item.id}
                        className="rounded-[1.3rem] border border-[#dde7ef] bg-white px-5 py-5 shadow-[0_.45rem_1.4rem_rgba(40,68,99,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-[1rem] font-semibold text-[#173b70]">{item.title}</h2>
                          <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-3 text-[0.82rem] text-[#7088a1]">{item.schedule}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTabState label="Assessment" />
                )
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </StudentLayout>
  );
}

export default SubjectDetails;
