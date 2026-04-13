import { useQuery } from '@tanstack/react-query';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMail,
  FiPaperclip,
  FiUsers,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { getStoredToken } from '../../lib/auth';

type AttachmentRecord = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  size: number;
};

type ActivitySubmissionsResponse = {
  subject: {
    id: string;
    title: string;
    code: string;
  };
  activity: {
    id: string;
    title: string;
    detail: string;
    dueDate: string;
    activityType: 'text' | 'file';
    status: string;
    submittedCount: number;
    totalStudents: number;
  };
  submittedStudents: Array<{
    id: string;
    submissionId: string;
    fullName: string;
    section: string;
    email: string;
    username: string;
    profileImage?: string | null;
    submissionType: 'text' | 'file';
    textContent: string;
    attachments: AttachmentRecord[];
    attachmentCount: number;
    submittedAt: string;
  }>;
};

function formatCalendarDate(value: string) {
  if (!value) {
    return 'No deadline';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Not available';
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

function ActivitySubmissions() {
  const { subjectId, activityId } = useParams();
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();

  const submissionsQuery = useQuery({
    queryKey: ['faculty-activity-submissions', subjectId, activityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/faculty/subjects/${subjectId}/activities/${activityId}/submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = (await response.json()) as {
        message?: string;
        data?: ActivitySubmissionsResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load activity submissions');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId && activityId),
  });

  if (!activeUser || isError) {
    return null;
  }

  if (!submissionsQuery.isLoading && submissionsQuery.isError) {
    return <Navigate to={`/faculty/subjects/${subjectId}`} replace />;
  }

  const fullName = [activeUser.firstName, activeUser.middleName, activeUser.lastName]
    .filter(Boolean)
    .join(' ');
  const payload = submissionsQuery.data;

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Activity submissions"
      pageTitle={payload?.activity.title ?? 'Activity submissions'}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[1.65rem] border border-[#b2c3d1] bg-[linear-gradient(180deg,rgba(212,222,233,0.97)_0%,rgba(201,212,225,0.95)_100%)] px-5 py-5 shadow-[0_10px_22px_rgba(27,46,70,0.08)]">
          {submissionsQuery.isLoading ? (
            <p className="text-fluid-md text-[#6b8198]">Loading activity submissions...</p>
          ) : payload ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/faculty/subjects/${subjectId}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  Back to activities
                </button>

                <p className="mt-4 text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                  {payload.subject.title} â€¢ {payload.subject.code}
                </p>
                <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.04em] text-[#173b70]">
                  {payload.activity.title}
                </h1>
                <p className="formatted-text mt-2 max-w-3xl text-fluid-md leading-[1.65] text-[#5e7891]">
                  {payload.activity.detail}
                </p>
              </div>

              <div className="grid min-w-[15rem] gap-3 rounded-[1.2rem] bg-[linear-gradient(180deg,#365678_0%,#2d4868_100%)] px-4 py-4 text-white shadow-[0_10px_20px_rgba(27,46,70,0.12)]">
                <div className="flex items-center gap-2 text-[#d5e2ef]">
                  <FiCheckCircle className="h-4 w-4" />
                  <p className="text-fluid-xs uppercase tracking-[0.16em]">Submission summary</p>
                </div>
                <p className="text-fluid-lg font-semibold">
                  {payload.activity.submittedCount} of {payload.activity.totalStudents} students
                </p>
                <p className="text-fluid-sm text-[#d5e2ef]">
                  Deadline: {formatCalendarDate(payload.activity.dueDate)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {payload ? (
          <section className="mt-5 rounded-[1.55rem] border border-[#b4c6d4] bg-[linear-gradient(180deg,rgba(209,220,231,0.95)_0%,rgba(198,210,223,0.93)_100%)] p-4 shadow-[0_10px_22px_rgba(27,46,70,0.08)]">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiUsers className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                    Submitted
                  </p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                  {payload.activity.submittedCount}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiClock className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                    Pending
                  </p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                  {Math.max(payload.activity.totalStudents - payload.activity.submittedCount, 0)}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiFileText className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                    Activity type
                  </p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                  {payload.activity.activityType === 'file' ? 'File upload' : 'Text only'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              {payload.submittedStudents.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {payload.submittedStudents.map((student) => (
                    <article
                      key={student.submissionId}
                      className="rounded-[1.3rem] border border-[#b3c4d2] bg-[linear-gradient(180deg,#d3dee8_0%,#c9d5e0_100%)] px-5 py-5 shadow-[0_8px_18px_rgba(27,46,70,0.07)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-fluid-lg font-semibold text-[#173b70]">
                            {student.fullName}
                          </h2>
                          <p className="mt-1 text-fluid-sm text-[#5e7891]">
                            @{student.username} â€¢ {student.section}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#bce8cf] bg-[#effbf4] px-3 py-1 text-fluid-2xs font-semibold text-[#12815a]">
                          Submitted
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                          {student.submissionType === 'file' ? 'File upload' : 'Text only'}
                        </span>
                        <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                          {formatDateTime(student.submittedAt)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                          <div className="flex items-center gap-2 text-[#2f78bc]">
                            <FiMail className="h-4 w-4" />
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Contact
                            </p>
                          </div>
                          <p className="mt-3 break-all text-fluid-sm text-[#173b70]">{student.email}</p>
                        </div>

                        <div className="rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                          <div className="flex items-center gap-2 text-[#2f78bc]">
                            <FiPaperclip className="h-4 w-4" />
                            <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                              Attachments
                            </p>
                          </div>
                          <p className="mt-3 text-fluid-lg font-semibold text-[#173b70]">
                            {student.attachmentCount}
                          </p>
                        </div>
                      </div>

                      {student.textContent ? (
                        <div className="mt-4 rounded-[1rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                          <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                            Response
                          </p>
                          <p className="formatted-text mt-3 text-fluid-sm leading-[1.65] text-[#617d98]">
                            {student.textContent}
                          </p>
                        </div>
                      ) : null}

                      {student.attachments.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {student.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.dataUrl}
                              download={attachment.name}
                              className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#c3d2de] bg-[rgba(214,224,234,0.94)] px-4 py-3 text-fluid-sm font-medium text-[#2f78bc] transition hover:bg-[rgba(221,230,238,0.98)] hover:text-[#215f99]"
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
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-[#b2c2d0] bg-[linear-gradient(180deg,#d2dde8_0%,#c7d4e0_100%)] px-6 py-10 text-center">
                  <p className="text-fluid-md font-semibold text-[#173b70]">No submissions yet</p>
                  <p className="mt-2 text-fluid-sm text-[#7088a1]">
                    This page will fill in once students start submitting this activity.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </FacultyLayout>
  );
}

export default ActivitySubmissions;

