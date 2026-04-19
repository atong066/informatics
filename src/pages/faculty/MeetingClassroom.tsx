import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  FiArrowLeft,
  FiClock,
  FiFileText,
  FiPlay,
  FiRefreshCw,
  FiVideo,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import MeetingRoomStage from '../../components/MeetingRoomStage';
import NotificationPopup from '../../components/NotificationPopup';
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

type FacultyMeetingDetailsResponse = {
  subjectTitle: string;
  subjectCode: string;
  displayName: string;
  username: string;
  meeting: MeetingRecord;
};

type MeetingCacheSubject = {
  id: string;
  meetings: MeetingRecord[];
};

function getEndedMeetingPatch(meetingId: string | undefined, payload: unknown) {
  if (!meetingId) {
    return null;
  }

  const payloadRecord = payload && typeof payload === 'object'
    ? payload as Partial<MeetingRecord>
    : {};

  return {
    ...payloadRecord,
    id: typeof payloadRecord.id === 'string' ? payloadRecord.id : meetingId,
    status: 'ended' as const,
    endedAt: typeof payloadRecord.endedAt === 'string' && payloadRecord.endedAt
      ? payloadRecord.endedAt
      : new Date().toISOString(),
  };
}

function cacheEndedMeeting(
  queryClient: QueryClient,
  subjectId: string | undefined,
  meetingId: string | undefined,
  payload: unknown,
) {
  const endedMeeting = getEndedMeetingPatch(meetingId, payload);

  if (!subjectId || !meetingId || !endedMeeting) {
    return;
  }

  queryClient.setQueryData<FacultyMeetingDetailsResponse>(
    ['faculty-meeting-detail', subjectId, meetingId],
    (current) => current
      ? {
        ...current,
        meeting: {
          ...current.meeting,
          ...endedMeeting,
        },
      }
      : current,
  );

  queryClient.setQueryData<MeetingCacheSubject>(
    ['faculty-subject-detail', subjectId],
    (current) => current && Array.isArray(current.meetings)
      ? {
        ...current,
        meetings: current.meetings.map((meeting) =>
          meeting.id === endedMeeting.id
            ? { ...meeting, ...endedMeeting }
            : meeting),
      }
      : current,
  );

  queryClient.setQueryData<MeetingCacheSubject[]>(
    ['faculty-classroom'],
    (current) => Array.isArray(current)
      ? current.map((subject) =>
        subject.id === subjectId
          ? {
            ...subject,
            meetings: subject.meetings.map((meeting) =>
              meeting.id === endedMeeting.id
                ? { ...meeting, ...endedMeeting }
                : meeting),
          }
          : subject)
      : current,
  );
}

function formatDateTime(value: string, fallback: string) {
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

function meetingTone(status: string) {
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

function FacultyMeetingClassroom() {
  const { subjectId, meetingId } = useParams();
  const navigate = useNavigate();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const { activeUser, isError } = useCurrentStudent();
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

  const meetingQuery = useQuery({
    queryKey: ['faculty-meeting-detail', subjectId, meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: FacultyMeetingDetailsResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load classroom');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId && meetingId),
    refetchInterval: (query) =>
      query.state.data?.meeting.aiStatus === 'processing' ? 5000 : false,
  });

  const startMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/meetings/${meetingId}/start`, {
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
    onSuccess: async () => {
      setPopupState({
        open: true,
        title: 'Conference started',
        message: 'The classroom is now live for students.',
        variant: 'success',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['faculty-meeting-detail', subjectId, meetingId] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-classroom'] }),
      ]);
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

  if (!meetingQuery.isLoading && meetingQuery.isError) {
    return <Navigate to={`/faculty/subjects/${subjectId}`} replace />;
  }

  const meetingDetails = meetingQuery.data;
  const meeting = meetingDetails?.meeting;
  const meetingStatusLabel = formatMeetingStatus(meeting?.status ?? 'scheduled');

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={[activeUser.firstName, activeUser.middleName, activeUser.lastName].filter(Boolean).join(' ')}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Faculty classroom"
      pageTitle={meeting?.title ?? 'Classroom stage'}
    >
      <div className="mx-auto w-full max-w-[100rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[1.8rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(235,243,250,0.96)_100%)] px-5 py-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.05rem] bg-[linear-gradient(180deg,#eef6ff_0%,#e1edf8_100%)] text-[#2b6fb0] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <FiVideo className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-fluid-2xs font-semibold uppercase tracking-[0.26em] text-[#2d7dc3]">
                  {meetingDetails?.subjectCode || activeUser.section}
                </p>
                <h1 className="mt-1.5 text-fluid-2xl font-semibold tracking-[-0.04em] text-[#173b70] sm:text-fluid-3xl">
                  {meeting?.title ?? 'Loading classroom...'}
                </h1>
                <p className="mt-1.5 max-w-4xl text-fluid-base leading-[1.6] text-[#607b95]">
                  {meeting?.agenda || 'This classroom view keeps the faculty stage large and moves participant feeds below for a clearer live session.'}
                </p>
                {meeting ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${meetingTone(meetingStatusLabel)}`}>
                      {meetingStatusLabel}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${meetingTone(meeting.aiStatusLabel)}`}>
                      AI notes: {meeting.aiStatusLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/faculty/subjects/${subjectId}`)}
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e0ea] bg-[rgba(255,255,255,0.9)] px-3.5 py-2 text-fluid-sm font-semibold text-[#5b738c] transition hover:bg-[#f2f7fc]"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to subject
              </button>
              <button
                type="button"
                onClick={() => navigate(`/faculty/subjects/${subjectId}/meetings/${meetingId}`)}
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e0ea] bg-[rgba(255,255,255,0.9)] px-3.5 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc]"
              >
                <FiFileText className="h-4 w-4" />
                Manage conference
              </button>
              <button
                type="button"
                onClick={() => meetingQuery.refetch()}
                disabled={meetingQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e0ea] bg-[rgba(255,255,255,0.9)] px-3.5 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {meeting && meeting.status !== 'live' ? (
                <button
                  type="button"
                  onClick={() => startMeetingMutation.mutate()}
                  disabled={startMeetingMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-2 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiPlay className="h-4 w-4" />
                  {startMeetingMutation.isPending ? 'Starting...' : 'Start conference'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {meeting ? (
          <>
            <div className="mt-5">
              <MeetingRoomStage
                token={token}
                subjectId={subjectId ?? ''}
                meetingId={meeting.id}
                meetingStatus={meeting.status}
                role="faculty"
                layout="faculty-focus"
                onMeetingEnded={async ({ message, data }) => {
                  cacheEndedMeeting(queryClient, subjectId, meetingId, data);
                  setPopupState({
                    open: true,
                    title: 'Conference ended',
                    message,
                    variant: 'success',
                  });
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['faculty-meeting-detail', subjectId, meetingId] }),
                    queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] }),
                    queryClient.invalidateQueries({ queryKey: ['faculty-classroom'] }),
                  ]);
                  navigate(`/faculty/subjects/${subjectId}`, { replace: true });
                }}
              />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
              <article className="rounded-[1.45rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] p-4 shadow-[0_12px_24px_rgba(39,77,117,0.06)]">
                <div className="flex items-center gap-3">
                  <FiClock className="h-5 w-5 text-[#2f78bc]" />
                  <div>
                    <h2 className="text-fluid-base font-semibold text-[#173b70]">Session timing</h2>
                    <p className="mt-1 text-fluid-xs text-[#607b95]">
                      Keep an eye on the live room status before switching back to management tools.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[#f8fbfd] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">Created</p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">{formatDateTime(meeting.createdAt, 'Not available')}</p>
                  </div>
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[#f8fbfd] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">Started</p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">{formatDateTime(meeting.startedAt, 'Not started yet')}</p>
                  </div>
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[#f8fbfd] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">Ended</p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">{formatDateTime(meeting.endedAt, 'Still live')}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[1.45rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] p-4 shadow-[0_12px_24px_rgba(39,77,117,0.06)]">
                <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">Room access</p>
                <p className="mt-3 text-fluid-xl font-semibold tracking-[-0.04em] text-[#173b70]">{meeting.roomName}</p>
                <p className="mt-2 break-all text-fluid-sm leading-6 text-[#607b95]">
                  Share this room only with the enrolled class. Students join from their subject meeting page.
                </p>
                <div className="mt-4 rounded-[1rem] border border-[#d6e2ec] bg-[#f8fbfd] px-4 py-3">
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Subject</p>
                  <p className="mt-2 text-fluid-sm font-semibold text-[#173b70]">
                    {meetingDetails?.subjectTitle ?? 'Subject'}
                  </p>
                </div>
              </article>

              <article className="rounded-[1.45rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] p-4 shadow-[0_12px_24px_rgba(39,77,117,0.06)]">
                <div className="flex items-center gap-3">
                  <FiFileText className="h-5 w-5 text-[#2f78bc]" />
                  <div>
                    <h2 className="text-fluid-base font-semibold text-[#173b70]">Recording and notes</h2>
                    <p className="mt-1 text-fluid-xs text-[#607b95]">
                      Use the management page when you want to upload a recording or review AI-generated notes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/faculty/subjects/${subjectId}/meetings/${meetingId}`)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[#d5e0ea] bg-white px-4 py-3 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc]"
                >
                  <FiFileText className="h-4 w-4" />
                  Open conference management
                </button>
              </article>
            </div>
          </>
        ) : null}
      </div>

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

export default FacultyMeetingClassroom;
