import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FiArrowLeft,
  FiClock,
  FiEye,
  FiFileText,
  FiMic,
  FiVideo,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import MeetingRoomStage from '../../components/MeetingRoomStage';
import Modal from '../../components/Modal';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import StudentLayout from '../../layout/student/StudentLayout';
import { getStoredToken } from '../../lib/auth';

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

type StudentMeetingDetailsResponse = {
  subjectTitle: string;
  subjectCode: string;
  displayName: string;
  username: string;
  meeting: MeetingRecord;
};

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

function StudentMeetingDetails() {
  const { subjectId, meetingId } = useParams();
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);

  const meetingQuery = useQuery({
    queryKey: ['student-meeting-detail', subjectId, meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/student/subjects/${subjectId}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: StudentMeetingDetailsResponse;
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

  if (!activeUser || isError) {
    return null;
  }

  if (!meetingQuery.isLoading && meetingQuery.isError) {
    return <Navigate to={`/student/subjects/${subjectId}`} replace />;
  }

  const meetingDetails = meetingQuery.data;
  const meeting = meetingDetails?.meeting;
  const meetingStatusLabel = formatMeetingStatus(meeting?.status ?? 'scheduled');

  return (
    <StudentLayout
      firstName={activeUser.firstName}
      fullName={[activeUser.firstName, activeUser.middleName, activeUser.lastName].filter(Boolean).join(' ')}
      section={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
    >
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[1.9rem] bg-[linear-gradient(180deg,#d9e4ee_0%,#ccd8e4_100%)] px-6 py-6 shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b8cad8]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-[linear-gradient(180deg,#dbe8f6_0%,#c8d9ec_100%)] text-[#255a91]">
                <FiVideo className="h-7 w-7" />
              </div>
              <div>
                <p className="text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                  {meetingDetails?.subjectCode || activeUser.section}
                </p>
                <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.05em] text-[#173b70]">
                  {meeting?.title ?? 'Loading conference...'}
                </h1>
                <p className="mt-2 max-w-3xl text-fluid-md leading-[1.7] text-[#6b8198]">
                  {meeting?.agenda || 'Conference details, room status, and AI notes will appear here.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${meetingTone(meetingStatusLabel)}`}>
                {meetingStatusLabel}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/student/subjects/${subjectId}`)}
                className="inline-flex items-center gap-2 rounded-full border border-[#d8e3ec] bg-white px-4 py-2 text-fluid-base font-semibold text-[#5d7690] transition hover:bg-[#f8fbfd]"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to subject
              </button>
            </div>
          </div>
        </section>

        {meeting ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <section className="space-y-5">
              <MeetingRoomStage
                token={token}
                subjectId={subjectId ?? ''}
                meetingId={meeting.id}
                meetingStatus={meeting.status}
                role="student"
              />

              <article className="rounded-[1.8rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[1.35rem] shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b9ccda]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Room name
                    </p>
                    <p className="mt-3 break-all text-fluid-sm font-semibold text-[#173b70]">
                      {meeting.roomName}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Started
                    </p>
                    <p className="mt-3 text-fluid-sm text-[#45627f]">
                      {formatDateTime(meeting.startedAt, 'Not started yet')}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Ended
                    </p>
                    <p className="mt-3 text-fluid-sm text-[#45627f]">
                      {formatDateTime(meeting.endedAt, 'Still active')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1rem] border border-[#c9d8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e3ebf3_100%)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <FiClock className="h-5 w-5 text-[#2f78bc]" />
                    <div>
                      <p className="text-fluid-base font-semibold text-[#173b70]">Room guidance</p>
                      <p className="mt-1 text-fluid-sm text-[#7088a1]">
                        {meeting.status === 'live'
                          ? 'The conference is live right now. Stay with your instructor for any access instructions.'
                          : meeting.status === 'ended'
                            ? 'The conference has ended. You can still review the notes and transcript below.'
                            : 'This conference is scheduled but has not started yet.'}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-[1.8rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[1.35rem] shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b9ccda]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <FiFileText className="h-5 w-5 text-[#2f78bc]" />
                    <div>
                      <h2 className="text-fluid-lg font-semibold text-[#173b70]">AI meeting notes</h2>
                      <p className="mt-1 text-fluid-sm text-[#7088a1]">
                        Notes become available after your instructor ends the conference and uploads a recording.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotesModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8e3ec] bg-white px-4 py-2 text-fluid-base font-semibold text-[#2f78bc] transition hover:bg-[#f8fbfd]"
                  >
                    <FiEye className="h-4 w-4" />
                    View notes
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${meetingTone(meeting.aiStatusLabel)}`}>
                    {meeting.aiStatusLabel}
                  </span>
                </div>

                {meeting.aiNotes ? (
                  <div className="formatted-text mt-5 rounded-[1rem] border border-[#c9d8e3] bg-[rgba(255,255,255,0.92)] px-4 py-4 text-fluid-sm leading-[1.7] text-[#45627f]">
                    {meeting.aiNotes}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1rem] border border-dashed border-[#bfceda] bg-[linear-gradient(180deg,#f5f9fc_0%,#e8eff5_100%)] px-5 py-6 text-center">
                    <p className="text-fluid-base font-semibold text-[#173b70]">Notes are not available yet</p>
                    <p className="mt-2 text-fluid-sm text-[#7088a1]">
                      {meeting.aiStatus === 'processing'
                        ? 'The meeting recording is still being processed.'
                        : meeting.aiStatus === 'failed'
                          ? meeting.noteError || 'The uploaded recording could not be processed.'
                          : 'Check back after the instructor uploads the conference recording.'}
                    </p>
                  </div>
                )}

                {meeting.transcriptText ? (
                  <div className="mt-5 rounded-[1rem] border border-[#c9d8e3] bg-[rgba(255,255,255,0.92)] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <FiMic className="h-4 w-4 text-[#2f78bc]" />
                      <p className="text-fluid-sm font-semibold text-[#173b70]">Transcript</p>
                    </div>
                    <div className="formatted-text mt-3 max-h-80 overflow-y-auto pr-1 text-fluid-sm leading-[1.7] text-[#45627f]">
                      {meeting.transcriptText}
                    </div>
                  </div>
                ) : null}
              </article>
            </section>

            <section className="space-y-5">
              <article className="rounded-[1.8rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[1.35rem] shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b9ccda]">
                <div className="space-y-3">
                  <div className="rounded-[1rem] border border-[#c9d8e3] bg-[rgba(255,255,255,0.92)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Subject
                    </p>
                    <p className="mt-2 text-fluid-sm font-semibold text-[#173b70]">
                      {meetingDetails?.subjectTitle}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-[#c9d8e3] bg-[rgba(255,255,255,0.92)] px-4 py-3">
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Last updated
                    </p>
                    <p className="mt-2 text-fluid-sm text-[#45627f]">
                      {formatDateTime(meeting.updatedAt, 'Not available')}
                    </p>
                  </div>

                  {meeting.recordingName ? (
                    <div className="rounded-[1rem] border border-[#c9d8e3] bg-[rgba(255,255,255,0.92)] px-4 py-3">
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                        Recording
                      </p>
                      <p className="mt-2 text-fluid-sm font-semibold text-[#173b70]">
                        {meeting.recordingName}
                      </p>
                      <p className="mt-1 text-fluid-xs text-[#7088a1]">
                        {formatBytes(meeting.recordingSize)}
                      </p>
                      {meeting.recordingUrl ? (
                        <button
                          type="button"
                          onClick={() => setRecordingModalOpen(true)}
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d8e3ec] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f8fbfd]"
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
                  ? meeting.noteError || 'The uploaded recording could not be processed.'
                  : 'Check back after the instructor ends the conference with a recording.'}
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
    </StudentLayout>
  );
}

export default StudentMeetingDetails;
