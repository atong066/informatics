import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFileText,
  FiMic,
  FiPlay,
  FiRefreshCw,
  FiTrash2,
  FiUploadCloud,
  FiVideo,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import MeetingRoomStage from '../../components/MeetingRoomStage';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { getStoredToken } from '../../lib/auth';

type RecordingPayload = {
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

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

async function readRecordingFile(file: File) {
  return new Promise<RecordingPayload>((resolve, reject) => {
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
  });
}

function FacultyMeetingDetails() {
  const { subjectId, meetingId } = useParams();
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const recordingInputRef = useRef<HTMLInputElement>(null);
  const [selectedRecording, setSelectedRecording] = useState<RecordingPayload | null>(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);
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
        throw new Error(data.message || 'Failed to load conference');
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
        data?: unknown;
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
        message: 'Students can now join this live room.',
        variant: 'success',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['faculty-meeting-detail', subjectId, meetingId] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-classroom'] }),
      ]);
      navigate(`/faculty/subjects/${subjectId}/meetings/${meetingId}/classroom`);
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

  const endMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedRecording ? { recording: selectedRecording } : {}),
      });

      const data = (await response.json()) as {
        message?: string;
        data?: unknown;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to end conference');
      }

      return data;
    },
    onSuccess: async (data) => {
      cacheEndedMeeting(queryClient, subjectId, meetingId, data.data);
      setSelectedRecording(null);
      if (recordingInputRef.current) {
        recordingInputRef.current.value = '';
      }
      setPopupState({
        open: true,
        title: 'Conference updated',
        message:
          data.message
          || 'The conference state was updated successfully.',
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
        title: 'Unable to end conference',
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
  const isBusy = startMeetingMutation.isPending || endMeetingMutation.isPending;
  const meetingStatusLabel = formatMeetingStatus(meeting?.status ?? 'scheduled');

  const handleRecordingSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const nextRecording = await readRecordingFile(file);
      setSelectedRecording(nextRecording);
      setPopupState({
        open: true,
        title: 'Recording ready',
        message: 'This file will be sent when you end the conference.',
        variant: 'success',
      });
    } catch (error) {
      setPopupState({
        open: true,
        title: 'Unable to attach recording',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={[activeUser.firstName, activeUser.middleName, activeUser.lastName].filter(Boolean).join(' ')}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Faculty conference"
      pageTitle={meeting?.title ?? 'Conference room'}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[1.65rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(238,245,251,0.96)_100%)] px-5 py-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.05rem] bg-[linear-gradient(180deg,#eef6ff_0%,#e1edf8_100%)] text-[#2b6fb0] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <FiVideo className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-fluid-2xs font-semibold uppercase tracking-[0.26em] text-[#2d7dc3]">
                  {meetingDetails?.subjectCode || activeUser.section}
                </p>
                <h1 className="mt-1.5 text-fluid-2xl font-semibold tracking-[-0.04em] text-[#173b70] sm:text-fluid-3xl">
                  {meeting?.title ?? 'Loading conference...'}
                </h1>
                <p className="mt-1.5 max-w-3xl text-fluid-base leading-[1.6] text-[#607b95]">
                  {meeting?.agenda || 'Use this room to manage the live session, upload an optional recording, and review AI-generated notes.'}
                </p>
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
                onClick={() => meetingQuery.refetch()}
                disabled={meetingQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e0ea] bg-[rgba(255,255,255,0.9)] px-3.5 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => navigate(`/faculty/subjects/${subjectId}/meetings/${meetingId}/classroom`)}
                className="inline-flex items-center gap-2 rounded-full border border-[#d5e0ea] bg-[rgba(255,255,255,0.9)] px-3.5 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc]"
              >
                <FiVideo className="h-4 w-4" />
                Open classroom view
              </button>
            </div>
          </div>
        </section>

        {meeting ? (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
            <section className="space-y-5">
              <MeetingRoomStage
                token={token}
                subjectId={subjectId ?? ''}
                meetingId={meeting.id}
                meetingStatus={meeting.status}
                role="faculty"
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
                }}
              />

              <article className="rounded-[1.55rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(236,243,250,0.96)_100%)] p-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6d86a0]">
                      Meeting status
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${meetingTone(meetingStatusLabel)}`}>
                        {meetingStatusLabel}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${meetingTone(meeting.aiStatusLabel)}`}>
                        AI notes: {meeting.aiStatusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] px-4 py-3 text-right">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Room name
                    </p>
                    <p className="mt-2 break-all text-fluid-base font-semibold text-[#173b70]">{meeting.roomName}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.86)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Created
                    </p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">
                      {formatDateTime(meeting.createdAt, 'Not available')}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.86)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Started
                    </p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">
                      {formatDateTime(meeting.startedAt, 'Not started yet')}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.86)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Ended
                    </p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">
                      {formatDateTime(meeting.endedAt, 'Still live')}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-[1.55rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(236,243,250,0.96)_100%)] p-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <FiFileText className="h-5 w-5 text-[#2f78bc]" />
                    <div>
                      <h2 className="text-fluid-lg font-semibold text-[#173b70]">AI meeting notes</h2>
                      <p className="mt-1 text-fluid-sm text-[#607b95]">
                        Upload a recording before ending the conference if you want transcript-based notes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotesModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d5e0ea] bg-white px-3.5 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc]"
                  >
                    <FiEye className="h-4 w-4" />
                    View notes
                  </button>
                </div>

                {meeting.aiNotes ? (
                  <div className="mt-5 rounded-[1.2rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] px-4 py-4">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Notes
                    </p>
                    <div className="formatted-text mt-3 text-fluid-sm leading-[1.7] text-[#45627f]">
                      {meeting.aiNotes}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.2rem] border border-dashed border-[#cfdeea] bg-[linear-gradient(180deg,rgba(252,254,255,0.98)_0%,rgba(240,246,252,0.96)_100%)] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <p className="text-fluid-md font-semibold text-[#173b70]">Notes not ready yet</p>
                    <p className="mt-2 text-fluid-sm text-[#6a839d]">
                      {meeting.aiStatus === 'processing'
                        ? 'The uploaded recording is still being processed.'
                        : meeting.aiStatus === 'failed'
                          ? meeting.noteError || 'AI note generation failed for this recording.'
                          : 'End the conference and include a recording to generate notes automatically.'}
                    </p>
                  </div>
                )}

                {meeting.transcriptText ? (
                  <div className="mt-5 rounded-[1.2rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] px-4 py-4">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Transcript
                    </p>
                    <div className="formatted-text mt-3 max-h-72 overflow-y-auto pr-1 text-fluid-sm leading-[1.7] text-[#45627f]">
                      {meeting.transcriptText}
                    </div>
                  </div>
                ) : null}
              </article>
            </section>

            <section className="space-y-5">
              <article className="rounded-[1.55rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(236,243,250,0.96)_100%)] p-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
                <div className="flex items-center gap-3">
                  <FiClock className="h-5 w-5 text-[#2f78bc]" />
                  <div>
                    <h2 className="text-fluid-lg font-semibold text-[#173b70]">Conference controls</h2>
                    <p className="mt-1 text-fluid-sm text-[#607b95]">
                      Start the live room first, then optionally attach a recording when ending the session.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={() => startMeetingMutation.mutate()}
                    disabled={meeting.status !== 'scheduled' || isBusy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-3 text-fluid-sm font-semibold text-white shadow-[0_10px_18px_rgba(41,124,198,0.14)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiPlay className="h-4 w-4" />
                    {startMeetingMutation.isPending ? 'Starting conference...' : 'Start conference'}
                  </button>

                  <div className="rounded-[1.15rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-fluid-sm font-semibold text-[#173b70]">Optional recording</p>
                        <p className="mt-1 text-fluid-xs text-[#607b95]">
                          Accepted files can be audio or video, up to 100 MB.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => recordingInputRef.current?.click()}
                        disabled={meeting.status === 'ended' || isBusy}
                        className="inline-flex items-center gap-2 rounded-full border border-[#d5e0ea] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiUploadCloud className="h-4 w-4" />
                        Choose file
                      </button>
                    </div>

                    <input
                      ref={recordingInputRef}
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={handleRecordingSelected}
                    />

                    {selectedRecording ? (
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-[1rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fd_100%)] px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-fluid-sm font-semibold text-[#173b70]">{selectedRecording.name}</p>
                          <p className="mt-1 text-fluid-xs text-[#607b95]">{formatBytes(selectedRecording.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecording(null);
                            if (recordingInputRef.current) {
                              recordingInputRef.current.value = '';
                            }
                          }}
                          className="rounded-full p-2 text-[#7f93a8] transition hover:bg-[#fff7f7] hover:text-[#b75353]"
                          aria-label="Remove recording"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => endMeetingMutation.mutate()}
                    disabled={meeting.status === 'ended' || isBusy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[#d5e0ea] bg-[rgba(255,255,255,0.9)] px-4 py-3 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiCheckCircle className="h-4 w-4" />
                    {endMeetingMutation.isPending
                      ? 'Updating conference...'
                      : selectedRecording
                        ? 'End conference and generate notes'
                        : 'End conference'}
                  </button>
                </div>
              </article>

              <article className="rounded-[1.55rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(236,243,250,0.96)_100%)] p-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
                <div className="flex items-center gap-3">
                  <FiMic className="h-5 w-5 text-[#2f78bc]" />
                  <div>
                    <h2 className="text-fluid-lg font-semibold text-[#173b70]">Session checklist</h2>
                    <p className="mt-1 text-fluid-sm text-[#607b95]">
                      A quick overview of what this room is ready for.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Join path
                    </p>
                    <p className="mt-2 break-all text-fluid-sm text-[#45627f]">{meeting.joinUrl}</p>
                  </div>
                  <div className="rounded-[1rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                      Last update
                    </p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">
                      {formatDateTime(meeting.updatedAt, 'Not available')}
                    </p>
                  </div>
                  {meeting.recordingName ? (
                    <div className="rounded-[1rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.84)] px-4 py-3">
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                        Last recording
                      </p>
                      <p className="mt-2 text-fluid-sm font-semibold text-[#173b70]">{meeting.recordingName}</p>
                      <p className="mt-1 text-fluid-xs text-[#607b95]">{formatBytes(meeting.recordingSize)}</p>
                      {meeting.recordingUrl ? (
                        <button
                          type="button"
                          onClick={() => setRecordingModalOpen(true)}
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d5e0ea] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f2f7fc]"
                        >
                          <FiEye className="h-4 w-4" />
                          View recording
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            </section>
          </div>
        ) : null}
      </div>

      <Modal
        open={notesModalOpen}
        title="Meeting notes"
        description={meeting?.aiStatusLabel ? `AI status: ${meeting.aiStatusLabel}` : 'Meeting notes and transcript'}
        onClose={() => setNotesModalOpen(false)}
        panelClassName="max-w-4xl"
        bodyClassName="max-h-[72vh] overflow-y-auto px-5 py-5 sm:px-6"
      >
        {meeting?.aiNotes ? (
          <div className="formatted-text rounded-[1.15rem] border border-[#c7d6e3] bg-[rgba(255,255,255,0.88)] px-4 py-4 text-fluid-sm leading-[1.7] text-[#45627f]">
            {meeting.aiNotes}
          </div>
        ) : (
          <div className="rounded-[1.15rem] border border-dashed border-[#bfceda] bg-[rgba(255,255,255,0.66)] px-5 py-6 text-center">
            <p className="text-fluid-base font-semibold text-[#173b70]">Notes are not ready yet</p>
            <p className="mt-2 text-fluid-sm text-[#607b95]">
              {meeting?.aiStatus === 'processing'
                ? 'The recording is still being transcribed and summarized.'
                : meeting?.aiStatus === 'failed'
                  ? meeting.noteError || 'AI note generation failed for this recording.'
                  : 'End the conference with a recording to generate notes.'}
            </p>
          </div>
        )}

        {meeting?.transcriptText ? (
          <div className="mt-4 rounded-[1.15rem] border border-[#c7d6e3] bg-[rgba(255,255,255,0.88)] px-4 py-4">
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">Transcript</p>
            <div className="formatted-text mt-3 text-fluid-sm leading-[1.7] text-[#45627f]">
              {meeting.transcriptText}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={recordingModalOpen}
        title="Session recording"
        description={meeting?.recordingName || 'Saved class recording'}
        onClose={() => setRecordingModalOpen(false)}
        panelClassName="max-w-5xl"
      >
        {meeting?.recordingUrl ? (
          meeting.recordingMimeType.startsWith('audio/') ? (
            <audio src={meeting.recordingUrl} controls className="w-full" />
          ) : (
            <video src={meeting.recordingUrl} controls className="max-h-[68vh] w-full rounded-[1rem] bg-black" />
          )
        ) : (
          <p className="text-fluid-sm text-[#607b95]">No recording has been saved yet.</p>
        )}
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

export default FacultyMeetingDetails;
