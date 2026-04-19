import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiCode,
  FiCpu,
  FiDatabase,
  FiEye,
  FiVideo,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { getStoredToken } from '../../lib/auth';

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

type ClassroomSubject = {
  id: string;
  title: string;
  code: string;
  slug: string;
  iconKey: string;
  description: string;
  assignedSections: string[];
  meetings: MeetingRecord[];
};

type ClassroomMeeting = MeetingRecord & {
  subjectId: string;
  subjectTitle: string;
  subjectCode: string;
};

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

function statusTone(status: string) {
  switch (status) {
    case 'Live':
    case 'Ready':
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
    case 'Scheduled':
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

function getMeetingPriority(meeting: MeetingRecord) {
  switch (meeting.status) {
    case 'live':
      return 0;
    case 'scheduled':
      return 1;
    default:
      return 2;
  }
}

function FacultyClassroom() {
  const navigate = useNavigate();
  const token = getStoredToken();
  const { activeUser, isError } = useCurrentStudent();
  const [selectedRecording, setSelectedRecording] = useState<ClassroomMeeting | null>(null);

  const classroomQuery = useQuery({
    queryKey: ['faculty-classroom'],
    queryFn: async () => {
      const response = await fetch('/api/faculty/classroom', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: ClassroomSubject[];
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load faculty classroom overview');
      }

      return data.data.map((subject) => ({
        ...subject,
        meetings: [...subject.meetings].sort((left, right) => {
          const priorityDifference = getMeetingPriority(left) - getMeetingPriority(right);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
          const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();

          return rightTime - leftTime;
        }),
      }));
    },
    enabled: Boolean(token && activeUser && !isError),
    refetchInterval: (query) =>
      query.state.data?.some((subject) =>
        subject.meetings.some((meeting) => meeting.aiStatus === 'processing'))
        ? 5000
        : false,
  });

  const classroomSubjects = classroomQuery.data ?? [];
  const allMeetings = useMemo(
    () =>
      classroomSubjects.flatMap<ClassroomMeeting>((subject) =>
        subject.meetings.map((meeting) => ({
          ...meeting,
          subjectId: subject.id,
          subjectTitle: subject.title,
          subjectCode: subject.code,
        })),
      ),
    [classroomSubjects],
  );
  const liveMeetingsCount = allMeetings.filter((meeting) => meeting.status === 'live').length;
  const scheduledMeetingsCount = allMeetings.filter((meeting) => meeting.status === 'scheduled').length;
  const readyNotesCount = allMeetings.filter((meeting) => meeting.aiStatus === 'ready').length;

  if (!activeUser || isError) {
    return null;
  }

  const fullName = [activeUser.firstName, activeUser.middleName, activeUser.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Faculty classroom"
      pageTitle="Classroom"
    >
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[#c9d5e0] bg-[linear-gradient(135deg,rgba(251,253,255,0.96)_0%,rgba(238,244,249,0.94)_100%)] px-6 py-6 shadow-[0_18px_34px_rgba(49,70,98,0.08)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6f89a4]">
                Video conference hub
              </p>
              <h1 className="mt-3 max-w-3xl text-fluid-3xl font-semibold tracking-[-0.05em] text-[#173b70]">
                The faculty video conference rooms are here.
              </h1>
              <p className="mt-3 max-w-3xl text-fluid-base leading-6 text-[#607b97]">
                Your section schedule creates the rooms automatically, while this page gives you one place
                to spot live rooms, scheduled sessions, and AI note status.
              </p>
            </div>

            <div className="min-w-[260px] rounded-[1.75rem] bg-[linear-gradient(180deg,#2d4c70_0%,#365a81_100%)] px-5 py-5 text-white shadow-[0_18px_30px_rgba(24,46,74,0.22)]">
              <p className="text-fluid-2xs uppercase tracking-[0.18em] text-[#bfd3e8]">Quick reminder</p>
              <p className="mt-3 text-fluid-xl font-semibold tracking-[-0.04em]">
                Sidebar {'>'} Classroom
              </p>
              <p className="mt-2 text-fluid-sm text-[#d4e2ef]">
                Open any room here, or jump back into a subject to review its class rooms.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<FiBookOpen className="h-5 w-5" />} value={String(classroomSubjects.length)} label="Subjects" />
          <MetricCard icon={<FiVideo className="h-5 w-5" />} value={String(allMeetings.length)} label="Conference rooms" />
          <MetricCard icon={<FiClock className="h-5 w-5" />} value={String(liveMeetingsCount + scheduledMeetingsCount)} label="Active or scheduled" />
          <MetricCard icon={<FiCheckCircle className="h-5 w-5" />} value={String(readyNotesCount)} label="AI notes ready" />
        </div>

        <section className="mt-6 rounded-[1.9rem] border border-[#c9d5e0] bg-[rgba(251,253,255,0.9)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.06)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-fluid-xl font-semibold text-[#123b74]">Classroom overview</p>
              <p className="mt-1 text-fluid-sm text-[#7088a1]">
                Each subject keeps its own room list. Use the room button to open the conference directly.
              </p>
            </div>
          </div>

          {classroomQuery.isLoading ? (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-[#cfdeea] bg-[linear-gradient(180deg,rgba(252,254,255,0.98)_0%,rgba(240,246,252,0.96)_100%)] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <p className="text-fluid-md font-semibold text-[#173b70]">Loading classroom rooms...</p>
              <p className="mt-2 text-fluid-sm text-[#6a839d]">
                Pulling your subject conferences and note status.
              </p>
            </div>
          ) : classroomQuery.isError ? (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-[#e4c2c2] bg-[linear-gradient(180deg,#fffafa_0%,#fff1f1_100%)] px-6 py-10 text-center">
              <p className="text-fluid-md font-semibold text-[#9c4a4a]">Unable to load classroom data</p>
              <p className="mt-2 text-fluid-sm text-[#a56262]">
                {classroomQuery.error instanceof Error
                  ? classroomQuery.error.message
                  : 'Please refresh the page and try again.'}
              </p>
            </div>
          ) : classroomSubjects.length === 0 ? (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-[#cfdeea] bg-[linear-gradient(180deg,rgba(252,254,255,0.98)_0%,rgba(240,246,252,0.96)_100%)] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <p className="text-fluid-md font-semibold text-[#173b70]">No classroom subjects yet</p>
              <p className="mt-2 text-fluid-sm text-[#6a839d]">
                Once subjects are assigned to this faculty account, their conference rooms will show up here.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {classroomSubjects.map((subject) => {
                const SubjectIcon = getSubjectIcon(subject.iconKey);

                return (
                  <article
                    key={subject.id}
                    className="rounded-[1.5rem] border border-[#dce5ed] bg-[#f8fbfd] px-5 py-5 shadow-[0_12px_24px_rgba(39,77,117,0.06)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[linear-gradient(180deg,#eef6ff_0%,#e1edf8_100%)] text-[#2b6fb0]">
                        <SubjectIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-fluid-lg font-semibold text-[#173b70]">{subject.title}</h2>
                          <span className="rounded-full border border-[#c9d8e6] bg-white px-2.5 py-1 text-fluid-3xs font-semibold uppercase tracking-[0.12em] text-[#2b79ba]">
                            {subject.code}
                          </span>
                        </div>
                        <p className="mt-2 text-fluid-sm leading-6 text-[#607b97]">{subject.description}</p>
                        <p className="mt-2 text-fluid-xs text-[#7088a1]">
                          {subject.meetings.length} room{subject.meetings.length === 1 ? '' : 's'} in this subject
                        </p>
                      </div>
                    </div>

                    {subject.meetings.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {subject.meetings.map((meeting) => {
                          const meetingStatusLabel = formatMeetingStatus(meeting.status);

                          return (
                            <div
                              key={meeting.id}
                              className="rounded-[1.15rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.88)] p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-fluid-base font-semibold text-[#173b70]">{meeting.title}</p>
                                  <p className="mt-1 break-all text-fluid-xs text-[#7088a1]">{meeting.roomName}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(meetingStatusLabel)}`}>
                                    {meetingStatusLabel}
                                  </span>
                                  <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(meeting.aiStatusLabel)}`}>
                                    {meeting.aiStatusLabel}
                                  </span>
                                  {meeting.sectionName ? (
                                    <span className="rounded-full border border-[#d6e2ec] bg-[#f4f8fb] px-3 py-1 text-fluid-2xs font-semibold text-[#607790]">
                                      {meeting.sectionName}
                                    </span>
                                  ) : null}
                                  {meeting.schedule ? (
                                    <span className="rounded-full border border-[#d6e2ec] bg-[#f4f8fb] px-3 py-1 text-fluid-2xs font-semibold text-[#607790]">
                                      {meeting.schedule}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <p className="mt-3 text-fluid-sm leading-6 text-[#607b97]">
                                {meeting.agenda || 'No agenda added yet.'}
                              </p>

                              <div className="mt-3 rounded-[1rem] border border-[#dce5ed] bg-[#f8fbfd] px-3.5 py-3">
                                <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-[#6f89a4]">
                                  Timeline
                                </p>
                                <p className="mt-2 text-fluid-sm text-[#607b97]">
                                  Created {formatDateTime(meeting.createdAt)}
                                </p>
                                <p className="mt-1 text-fluid-xs text-[#7088a1]">
                                  Started {formatDateTime(meeting.startedAt, 'not yet')} and ended {formatDateTime(meeting.endedAt, 'not yet')}
                                </p>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigate(
                                    meeting.status === 'ended'
                                      ? `/faculty/subjects/${subject.id}/meetings/${meeting.id}`
                                      : `/faculty/subjects/${subject.id}/meetings/${meeting.id}/classroom`,
                                  )}
                                  className="inline-flex items-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-2 text-fluid-sm font-semibold text-white transition hover:brightness-105"
                                >
                                  {meeting.status === 'ended' ? 'Review room' : 'Open classroom'}
                                  <FiArrowRight className="h-4 w-4" />
                                </button>
                                {meeting.recordingUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecording({
                                      ...meeting,
                                      subjectId: subject.id,
                                      subjectTitle: subject.title,
                                      subjectCode: subject.code,
                                    })}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#c9d8e6] bg-white px-3.5 py-2 text-fluid-sm font-semibold text-[#2b79ba] transition hover:bg-[#f4f8fb]"
                                  >
                                    <FiEye className="h-4 w-4" />
                                    Play recording
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => navigate(`/faculty/subjects/${subject.id}`)}
                                  className="inline-flex items-center gap-2 rounded-full border border-[#c9d8e6] bg-white px-3.5 py-2 text-fluid-sm font-semibold text-[#2b79ba] transition hover:bg-[#f4f8fb]"
                                >
                                  Open subject
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.2rem] border border-dashed border-[#cfdeea] bg-[linear-gradient(180deg,rgba(252,254,255,0.98)_0%,rgba(240,246,252,0.96)_100%)] px-5 py-6">
                        <p className="text-fluid-base font-semibold text-[#173b70]">No conference rooms yet</p>
                        <p className="mt-2 text-fluid-sm text-[#6a839d]">
                          Assign this subject to a section schedule in admin to create its room.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate(`/faculty/subjects/${subject.id}`)}
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-2 text-fluid-sm font-semibold text-white transition hover:brightness-105"
                        >
                          Open subject
                          <FiArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
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
    </FacultyLayout>
  );
}

function MetricCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[#c9d5e0] bg-[rgba(251,253,255,0.92)] p-5 shadow-[0_14px_28px_rgba(49,70,98,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-fluid-3xl font-semibold leading-none text-[#123b74]">{value}</p>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#dde9f6_0%,#cadcf0_100%)] text-[#2b79ba]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-fluid-sm text-[#7088a1]">{label}</p>
    </article>
  );
}

export default FacultyClassroom;
