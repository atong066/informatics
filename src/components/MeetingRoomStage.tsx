import { useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  FiAlertCircle,
  FiCheck,
  FiDelete,
  FiEdit3,
  FiMaximize2,
  FiMic,
  FiMicOff,
  FiMinimize2,
  FiMonitor,
  FiRefreshCw,
  FiRotateCcw,
  FiStopCircle,
  FiType,
  FiUsers,
  FiVideo,
  FiVideoOff,
  FiX,
} from 'react-icons/fi';

type MeetingStatus = 'scheduled' | 'live' | 'ended';
type MeetingRoomLayout = 'balanced' | 'faculty-focus';

type MeetingParticipant = {
  socketId: string;
  userId: string;
  displayName: string;
  username: string;
  role: 'faculty' | 'student';
  isHost: boolean;
};

type RemoteParticipant = MeetingParticipant & {
  stream: MediaStream | null;
  screenStream: MediaStream | null;
};

type DrawingPermission = {
  mode: 'none' | 'everyone' | 'selected';
  allowedUserIds: string[];
};

type ScreenShareState = {
  active: boolean;
  participant: MeetingParticipant | null;
  streamId: string | null;
};

type DrawingTool = 'pen' | 'eraser' | 'text';

type DrawingPoint = {
  x: number;
  y: number;
};

type TextEditorState = DrawingPoint & {
  value: string;
  fontSize: number;
};

type DrawingItem =
  | {
    id: string;
    type: 'stroke';
    points: DrawingPoint[];
    color: string;
    width: number;
    tool: 'pen' | 'eraser';
  }
  | {
    id: string;
    type: 'text';
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
  };

type MeetingRoomState = {
  drawingPermission: DrawingPermission;
  screenShare: ScreenShareState;
};

type JoinMeetingResult =
  | {
    ok: true;
    self: MeetingParticipant;
    participants: MeetingParticipant[];
    roomState: MeetingRoomState;
  }
  | {
    ok: false;
    error: string;
  };

type SignalPayload = {
  fromSocketId: string;
  participant?: MeetingParticipant | null;
  data?: {
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit | null;
  };
};

type MeetingRoomStageProps = {
  token: string | null;
  subjectId: string;
  meetingId: string;
  meetingStatus: MeetingStatus;
  role: 'faculty' | 'student';
  layout?: MeetingRoomLayout;
  onMeetingEnded?: (payload: { message: string; data?: unknown }) => void;
};

type RecordingPayload = {
  name: string;
  dataUrl: string;
  mimeType: string;
  size: number;
};

const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    },
  ],
};

const defaultDrawingPermission: DrawingPermission = {
  mode: 'none',
  allowedUserIds: [],
};

const defaultDrawingColor = '#12815a';
const drawingColorOptions = [
  defaultDrawingColor,
  '#2563eb',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#111827',
];

const eraserStrokeWidth = 24;

function clampTextFontSize(value: number) {
  return Math.min(72, Math.max(14, value || 28));
}

function createDrawingId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSupportedRecordingMimeType(hasVideo: boolean) {
  const mimeTypes = hasVideo
    ? [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ]
    : [
      'audio/webm;codecs=opus',
      'audio/webm',
    ];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? '';
}

function getRecordingFileExtension(mimeType: string) {
  return mimeType.startsWith('audio/') ? 'webm' : 'webm';
}

type LocalMediaResult = {
  stream: MediaStream | null;
  notice: string | null;
};

function formatDrawingPermissionMessage(permission: DrawingPermission) {
  if (permission.mode === 'everyone') {
    return 'Students can draw on the shared screen.';
  }

  if (permission.mode === 'selected' && permission.allowedUserIds.length > 0) {
    return 'Selected students can draw on the shared screen.';
  }

  return 'Student drawing is disabled.';
}

function getMediaErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Unable to access camera and microphone';
}

function isDeviceUnavailableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return [
    'NotFoundError',
    'DevicesNotFoundError',
    'OverconstrainedError',
    'ConstraintNotSatisfiedError',
  ].includes(error.name)
    || /requested device not found|device not found|no .*device|not found/i.test(error.message);
}

async function requestLocalMedia(): Promise<LocalMediaResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      stream: null,
      notice: 'This browser cannot access camera and microphone devices. You can still join and share your screen.',
    };
  }

  let firstError: unknown = null;

  try {
    return {
      stream: await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      }),
      notice: null,
    };
  } catch (error) {
    firstError = error;
  }

  try {
    return {
      stream: await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      }),
      notice: 'Camera unavailable, so it was turned off. Microphone connected.',
    };
  } catch {
    // Keep trying so one missing device does not prevent joining with the other.
  }

  try {
    return {
      stream: await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      }),
      notice: 'Microphone unavailable, but camera is connected.',
    };
  } catch {
    const notice = isDeviceUnavailableError(firstError)
      ? 'No camera or microphone was found. Joined without local media; screen sharing is still available.'
      : `${getMediaErrorMessage(firstError)}. Joined without local media; screen sharing is still available.`;

    return {
      stream: null,
      notice,
    };
  }
}

function VideoTile({
  label,
  detail,
  stream,
  muted = false,
  tone = 'remote',
  variant = 'standard',
  badgeLabel,
  fit = 'cover',
  fullscreenActive = false,
  children,
}: {
  label: string;
  detail: string;
  stream: MediaStream | null;
  muted?: boolean;
  tone?: 'local' | 'remote';
  variant?: 'standard' | 'feature';
  badgeLabel?: string;
  fit?: 'cover' | 'contain';
  fullscreenActive?: boolean;
  children?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isFeature = variant === 'feature';

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.srcObject = stream ?? null;

    if (stream) {
      void video.play().catch(() => {
        // The browser can delay playback until metadata is ready; the element stays attached.
      });
    }
  }, [stream]);

  return (
    <div className={`overflow-hidden ${
      fullscreenActive
        ? 'flex h-screen w-screen flex-col bg-[#07111f]'
        : `border border-[#d6e2ec] bg-[linear-gradient(180deg,#ffffff_0%,#f4f9fd_100%)] ${
          isFeature
            ? 'rounded-[1.6rem] shadow-[0_22px_46px_rgba(39,77,117,0.12)]'
            : 'rounded-[1.25rem] shadow-[0_12px_24px_rgba(39,77,117,0.08)]'
        }`
    }`}>
      <div className={`relative bg-[radial-gradient(circle_at_top,rgba(73,127,184,0.18),transparent_55%),linear-gradient(180deg,#233a56_0%,#192d45_100%)] ${
        fullscreenActive
          ? 'min-h-0 flex-1'
          : isFeature
          ? 'aspect-[16/8.8] min-h-[20rem] md:min-h-[26rem] xl:min-h-[32rem]'
          : 'aspect-video'
      }`}>
        {badgeLabel ? (
          <span className="absolute left-4 top-4 z-10 rounded-full border border-white/18 bg-[rgba(15,27,43,0.45)] px-3 py-1 text-fluid-3xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
            {badgeLabel}
          </span>
        ) : null}
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={`h-full w-full pointer-events-none ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div>
              <div className={`mx-auto flex items-center justify-center rounded-full border text-white ${
                isFeature ? 'h-16 w-16' : 'h-14 w-14'
              } ${
                tone === 'local'
                  ? 'border-white/30 bg-white/10'
                  : 'border-white/20 bg-white/8'
              }`}>
                <FiVideo className={isFeature ? 'h-7 w-7' : 'h-6 w-6'} />
              </div>
              <p className={`mt-4 font-semibold text-white ${
                isFeature ? 'text-fluid-xl' : 'text-fluid-base'
              }`}>{label}</p>
              <p className={`mt-2 text-[#dbe7f2] ${
                isFeature ? 'text-fluid-sm' : 'text-fluid-xs'
              }`}>
                Waiting for a media stream.
              </p>
            </div>
          </div>
        )}
        {children ? (
          <div className="absolute inset-0">
            {children}
          </div>
        ) : null}
      </div>
      <div className={`${fullscreenActive ? 'hidden' : 'flex'} items-center justify-between gap-3 ${
        isFeature ? 'px-5 py-4' : 'px-4 py-3'
      }`}>
        <div className="min-w-0">
          <p className={`truncate font-semibold text-[#173b70] ${
            isFeature ? 'text-fluid-base' : 'text-fluid-sm'
          }`}>{label}</p>
          <p className={`truncate text-[#7088a1] ${
            isFeature ? 'text-fluid-sm' : 'text-fluid-xs'
          }`}>{detail}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-fluid-3xs font-semibold uppercase tracking-[0.12em] ${
          stream
            ? 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]'
            : 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]'
        }`}>
          {stream ? 'Live' : 'Waiting'}
        </span>
      </div>
    </div>
  );
}

function formatRoomState(status: MeetingStatus, role: 'faculty' | 'student') {
  if (status === 'ended') {
    return 'This session has ended. Refresh the page if a new conference starts.';
  }

  if (status === 'scheduled') {
    return role === 'faculty'
      ? 'Start the session first, then the camera preview and participant feeds will appear here.'
      : 'The instructor has not started this classroom session yet.';
  }

  return 'The live room is active. Browser camera and microphone permission may be required.';
}

function MeetingRoomStage({
  token,
  subjectId,
  meetingId,
  meetingStatus,
  role,
  layout = 'balanced',
  onMeetingEnded,
}: MeetingRoomStageProps) {
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteParticipantsRef = useRef<Map<string, MeetingParticipant>>(new Map());
  const pendingOfferParticipantsRef = useRef<Map<string, MeetingParticipant>>(new Map());
  const stageFullscreenRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingSourceRef = useRef<'local' | 'screen' | null>(null);
  const recordingMimeTypeRef = useRef('video/webm');
  const screenRecordingPromptedRef = useRef(false);
  const selfRef = useRef<MeetingParticipant | null>(null);
  const activeScreenShareRef = useRef<ScreenShareState>({
    active: false,
    participant: null,
    streamId: null,
  });
  const isJoiningRef = useRef(false);
  const isClosingRef = useRef(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [selfParticipant, setSelfParticipant] = useState<MeetingParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomMessage, setRoomMessage] = useState(formatRoomState(meetingStatus, role));
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isStageFullscreen, setIsStageFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [drawingColor, setDrawingColor] = useState(defaultDrawingColor);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('pen');
  const [textFontSize, setTextFontSize] = useState(28);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const [drawingPermission, setDrawingPermission] = useState<DrawingPermission>(defaultDrawingPermission);
  const [activeScreenShare, setActiveScreenShare] = useState<ScreenShareState>({
    active: false,
    participant: null,
    streamId: null,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [drawingRevision, setDrawingRevision] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textEditorInputRef = useRef<HTMLInputElement | null>(null);
  const drawContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingItemsRef = useRef<DrawingItem[]>([]);
  const currentStrokeRef = useRef<DrawingPoint[]>([]);
  const draggingTextIdRef = useRef<string | null>(null);
  const draggingTextOffsetRef = useRef<DrawingPoint>({ x: 0, y: 0 });
  const [canvasReady, setCanvasReady] = useState(false);

  const canJoinRoom = meetingStatus === 'live';
  const isFacultyFocusLayout = layout === 'faculty-focus' && role === 'faculty';
  const usesMainStageLayout = isFacultyFocusLayout || role === 'student';
  const activeRemoteScreenShareSocketId = activeScreenShare.active && activeScreenShare.participant?.socketId !== selfParticipant?.socketId
    ? activeScreenShare.participant?.socketId
    : null;
  const visibleRemoteParticipants = [...remoteParticipants]
    .filter((participant) => participant.socketId !== selfParticipant?.socketId)
    .filter((participant) => participant.socketId !== activeRemoteScreenShareSocketId)
    .filter((participant) =>
      !(isFacultyFocusLayout && selfParticipant && participant.userId === selfParticipant.userId))
    .sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'student' ? -1 : 1;
      }

      if (left.isHost !== right.isHost) {
        return left.isHost ? -1 : 1;
      }

      return left.displayName.localeCompare(right.displayName);
    });
  const participantCount = visibleRemoteParticipants.length + (localStream || canJoinRoom ? 1 : 0);
  const hasLocalAudio = Boolean(localStream?.getAudioTracks().length);
  const hasLocalVideo = Boolean(localStream?.getVideoTracks().length);
  const localPreviewStream = hasLocalVideo && isVideoEnabled ? localStream : null;
  const localTileLabel = isFacultyFocusLayout
    ? selfParticipant?.displayName || 'Faculty host'
    : 'You';
  const localIdentityDetail = `${role === 'faculty' ? 'Faculty' : 'Student'}${selfParticipant?.isHost ? ' host' : ''}`;
  const localTileDetail = !canJoinRoom
    ? 'Your preview appears once the room is live'
    : hasLocalVideo
      ? isVideoEnabled
        ? `${localIdentityDetail}${isFacultyFocusLayout ? ' view' : ' camera preview'}`
        : `${localIdentityDetail} camera hidden`
      : hasLocalAudio
        ? `${localIdentityDetail} microphone connected, camera off`
        : 'Joined without local camera or microphone';
  const remoteScreenShareEntry = activeRemoteScreenShareSocketId
    ? remoteParticipants.find((participant) => participant.socketId === activeRemoteScreenShareSocketId) ?? null
    : null;
  const remoteScreenShareParticipant = remoteScreenShareEntry ?? activeScreenShare.participant;
  const sharedScreenStream = screenStream ?? remoteScreenShareEntry?.screenStream ?? null;
  const hasSharedScreenStage = Boolean(screenStream || activeRemoteScreenShareSocketId);
  const mainStageLabel = hasSharedScreenStage ? 'Screen share' : localTileLabel;
  const mainStageStream = hasSharedScreenStage ? sharedScreenStream : localPreviewStream;
  const mainStageDetail = hasSharedScreenStage
    ? screenStream
      ? 'Your shared screen'
      : `${remoteScreenShareParticipant?.displayName ?? 'A participant'} is sharing their screen`
    : localTileDetail;
  const facultyMainStageDetail = hasSharedScreenStage
    ? mainStageDetail
    : localStream
      ? `You - ${localTileDetail}`
      : localTileDetail;
  const largeMainStageDetail = isFacultyFocusLayout ? facultyMainStageDetail : mainStageDetail;
  const largeStageBadge = hasSharedScreenStage
    ? 'Screen share'
    : isFacultyFocusLayout
      ? 'Faculty stage'
      : 'Classroom stage';
  const participantStripTitle = isFacultyFocusLayout
    ? 'Students and guests appear below the main stage.'
    : 'Classmates and instructors appear below the main stage.';
  const emptyParticipantTitle = isFacultyFocusLayout
    ? 'No students on camera yet'
    : 'No one else is on camera yet';
  const emptyParticipantDetail = isFacultyFocusLayout
    ? 'Student feeds will line up underneath the faculty stage as soon as they join the live room.'
    : 'Other participants will line up underneath the main stage as soon as they join the live room.';
  const remoteStudentParticipants = remoteParticipants
    .filter((participant) => participant.role === 'student')
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
  const selectedDrawerIds = new Set(drawingPermission.allowedUserIds);
  const drawingAllowed = Boolean(
    selfParticipant?.isHost
      || drawingPermission.mode === 'everyone'
      || (selfParticipant && drawingPermission.mode === 'selected' && selectedDrawerIds.has(selfParticipant.userId)),
  );
  const activeShareSocketId = activeScreenShare.participant?.socketId ?? null;
  const currentSocketId = selfParticipant?.socketId ?? null;
  const screenShareLockedByAnother = Boolean(
    activeScreenShare.active && activeShareSocketId && activeShareSocketId !== currentSocketId,
  );
  const screenShareButtonDisabled = !canJoinRoom || (!isScreenSharing && screenShareLockedByAnother);
  const screenShareButtonLabel = isScreenSharing
    ? 'Stop sharing'
    : screenShareLockedByAnother
      ? activeScreenShare.participant?.role === 'faculty'
        ? 'Faculty sharing'
        : 'Screen in use'
      : 'Share screen';
  const isPresetDrawingColor = drawingColorOptions.some(
    (color) => color.toLowerCase() === drawingColor.toLowerCase(),
  );
  const hasDrawingItems = drawingRevision >= 0 && drawingItemsRef.current.length > 0;
  const canEndSession = role === 'faculty' && Boolean(selfParticipant?.isHost) && canJoinRoom;

  function isScreenShareStream(participant: MeetingParticipant, stream: MediaStream | null) {
    const shareState = activeScreenShareRef.current;

    if (!stream || !shareState.active || shareState.participant?.socketId !== participant.socketId) {
      return false;
    }

    if (shareState.streamId && stream.id === shareState.streamId) {
      return true;
    }

    const hasVideo = stream.getVideoTracks().length > 0;
    const hasAudio = stream.getAudioTracks().length > 0;

    return hasVideo && !hasAudio;
  }

  function upsertRemoteParticipant(participant: MeetingParticipant, stream?: MediaStream | null) {
    remoteParticipantsRef.current.set(participant.socketId, participant);

    setRemoteParticipants((current) => {
      const existingParticipant = current.find((entry) => entry.socketId === participant.socketId);
      const isScreenStream = isScreenShareStream(participant, stream ?? null);

      if (existingParticipant) {
        return current.map((entry) =>
          entry.socketId === participant.socketId
            ? {
              ...entry,
              ...participant,
              stream: stream && !isScreenStream ? stream : entry.stream,
              screenStream: stream && isScreenStream ? stream : entry.screenStream,
            }
            : entry,
        );
      }

      return [
        ...current,
        {
          ...participant,
          stream: stream && !isScreenStream ? stream : null,
          screenStream: stream && isScreenStream ? stream : null,
        },
      ];
    });
  }

  function removeRemoteParticipant(socketId: string) {
    remoteParticipantsRef.current.delete(socketId);
    pendingOfferParticipantsRef.current.delete(socketId);
    setRemoteParticipants((current) =>
      current.filter((participant) => participant.socketId !== socketId));
  }

  function getRemoteOfferTargets() {
    const targets = new Map<string, MeetingParticipant>();

    remoteParticipants.forEach((participant) => {
      targets.set(participant.socketId, participant);
    });
    remoteParticipantsRef.current.forEach((participant) => {
      targets.set(participant.socketId, participant);
    });

    return [...targets.values()];
  }

  function applyScreenShareState(nextState: ScreenShareState) {
    activeScreenShareRef.current = nextState;
    setActiveScreenShare(nextState);

    if (!nextState.active) {
      setRemoteParticipants((current) =>
        current.map((participant) => ({
          ...participant,
          screenStream: null,
        })));
      return;
    }

    setRemoteParticipants((current) =>
      current.map((participant) => {
        if (participant.socketId !== nextState.participant?.socketId) {
          return participant;
        }

        const streamIsScreen = participant.stream
          && (
            nextState.streamId
              ? participant.stream.id === nextState.streamId
              : participant.stream.getVideoTracks().length > 0 && participant.stream.getAudioTracks().length === 0
          );

        return {
          ...participant,
          stream: streamIsScreen ? null : participant.stream,
          screenStream: streamIsScreen ? participant.stream : participant.screenStream,
        };
      }));
  }

  function closePeerConnections() {
    peersRef.current.forEach((connection) => {
      connection.ontrack = null;
      connection.onicecandidate = null;
      connection.onsignalingstatechange = null;
      connection.close();
    });
    peersRef.current.clear();
    remoteParticipantsRef.current.clear();
    pendingOfferParticipantsRef.current.clear();
  }

  function cleanupRoom(announceLeave: boolean) {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    if (announceLeave && socketRef.current?.connected) {
      socketRef.current.emit('meeting:leave');
    }

    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;

    closePeerConnections();

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordingSourceRef.current = null;
    recordingMimeTypeRef.current = 'video/webm';
    screenRecordingPromptedRef.current = false;
    selfRef.current = null;
    isJoiningRef.current = false;

    setLocalStream(null);
    setScreenStream(null);
    setSelfParticipant(null);
    setRemoteParticipants([]);
    setIsConnecting(false);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    setIsRecording(false);
    setIsEndingSession(false);
    setDrawingPermission(defaultDrawingPermission);
    applyScreenShareState({
      active: false,
      participant: null,
      streamId: null,
    });
    clearBoard(false);

    queueMicrotask(() => {
      isClosingRef.current = false;
    });
  }

  function handleTransientDisconnect() {
    closePeerConnections();
    setRemoteParticipants([]);
    setIsConnecting(true);
    setRoomError('The live meeting connection was interrupted. Reconnecting automatically...');
    setRoomMessage(screenStreamRef.current
      ? 'Keeping your screen share active while the room reconnects.'
      : 'Reconnecting to the live room...');

    if (!screenStreamRef.current) {
      applyScreenShareState({
        active: false,
        participant: null,
        streamId: null,
      });
    }
  }

  function getSocket() {
    return socketRef.current;
  }

  function getPeerConnection(targetSocketId: string) {
    return peersRef.current.get(targetSocketId) ?? null;
  }

  function ensureReceiveTransceivers(peerConnection: RTCPeerConnection) {
    const transceivers = peerConnection.getTransceivers();
    const audioTransceiverCount = transceivers.filter((transceiver) =>
      transceiver.sender.track?.kind === 'audio' || transceiver.receiver.track.kind === 'audio').length;
    const videoTransceiverCount = transceivers.filter((transceiver) =>
      transceiver.sender.track?.kind === 'video' || transceiver.receiver.track.kind === 'video').length;

    if (audioTransceiverCount === 0) {
      peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    }

    for (let count = videoTransceiverCount; count < 2; count += 1) {
      peerConnection.addTransceiver('video', { direction: 'recvonly' });
    }
  }

  function createPeerConnection(targetParticipant: MeetingParticipant) {
    const existingConnection = getPeerConnection(targetParticipant.socketId);

    if (existingConnection) {
      return existingConnection;
    }

    const peerConnection = new RTCPeerConnection(rtcConfiguration);

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current as MediaStream);
    });

    screenStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, screenStreamRef.current as MediaStream);
    });

    ensureReceiveTransceivers(peerConnection);

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      getSocket()?.emit('meeting:signal', {
        targetSocketId: targetParticipant.socketId,
        data: {
          candidate: event.candidate.toJSON(),
        },
      });
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const stream = remoteStream ?? new MediaStream([event.track]);

      if (stream) {
        upsertRemoteParticipant(targetParticipant, stream);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed') {
        peerConnection.close();
        peersRef.current.delete(targetParticipant.socketId);
      }
    };

    peerConnection.onsignalingstatechange = () => {
      if (peerConnection.signalingState !== 'stable') {
        return;
      }

      const pendingParticipant = pendingOfferParticipantsRef.current.get(targetParticipant.socketId);

      if (!pendingParticipant) {
        return;
      }

      pendingOfferParticipantsRef.current.delete(targetParticipant.socketId);
      void createOffer(pendingParticipant);
    };

    peersRef.current.set(targetParticipant.socketId, peerConnection);
    upsertRemoteParticipant(targetParticipant);

    return peerConnection;
  }

  async function createOffer(targetParticipant: MeetingParticipant) {
    const peerConnection = createPeerConnection(targetParticipant);

    if (peerConnection.signalingState !== 'stable') {
      pendingOfferParticipantsRef.current.set(targetParticipant.socketId, targetParticipant);
      return;
    }

    pendingOfferParticipantsRef.current.delete(targetParticipant.socketId);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    getSocket()?.emit('meeting:signal', {
      targetSocketId: targetParticipant.socketId,
      data: {
        description: {
          type: offer.type,
          sdp: offer.sdp,
        },
      },
    });
  }

  function redrawCanvas() {
    const canvas = drawCanvasRef.current;
    const ctx = drawContextRef.current;

    if (!canvas || !ctx) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawingItemsRef.current.forEach((item) => {
      if (item.type === 'text') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = item.color;
        ctx.font = `600 ${item.fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(item.text, item.x * rect.width, item.y * rect.height);
        return;
      }

      if (item.points.length < 2) {
        return;
      }

      ctx.globalCompositeOperation = item.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = item.tool === 'eraser' ? 'rgba(0,0,0,1)' : item.color;
      ctx.lineWidth = item.width;
      ctx.beginPath();
      ctx.moveTo(item.points[0].x * rect.width, item.points[0].y * rect.height);

      for (let index = 1; index < item.points.length; index += 1) {
        ctx.lineTo(item.points[index].x * rect.width, item.points[index].y * rect.height);
      }

      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';
  }

  function resizeCanvas() {
    const canvas = drawCanvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawContextRef.current = ctx;
    redrawCanvas();
    setCanvasReady(true);
  }

  function setDrawingItems(nextItems: DrawingItem[]) {
    drawingItemsRef.current = nextItems;
    setDrawingRevision((current) => current + 1);
    redrawCanvas();
  }

  function addDrawingItem(item: DrawingItem, emit = true) {
    if (item.type === 'stroke' && item.points.length < 2) {
      return;
    }

    setDrawingItems([...drawingItemsRef.current, item]);

    if (!emit) {
      return;
    }

    getSocket()?.emit('meeting:drawing-item', item);
  }

  function updateDrawingItem(item: DrawingItem, emit = true) {
    setDrawingItems(drawingItemsRef.current.map((entry) =>
      entry.id === item.id ? item : entry));

    if (emit) {
      getSocket()?.emit('meeting:drawing-update', item);
    }
  }

  function undoDrawing(emit = true) {
    if (drawingItemsRef.current.length === 0) {
      return;
    }

    setDrawingItems(drawingItemsRef.current.slice(0, -1));

    if (emit) {
      getSocket()?.emit('meeting:drawing-undo');
    }
  }

  function clearBoard(announce = true) {
    setTextEditor(null);
    setDrawingItems([]);

    if (announce) {
      getSocket()?.emit('meeting:drawing-clear');
    }
  }

  function getCanvasPoint(event: PointerEvent | TouchEvent) {
    const canvas = drawCanvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    let clientX: number | null = null;
    let clientY: number | null = null;

    if ('touches' in event) {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) {
        return null;
      }
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return clientX !== null && clientY !== null
      ? {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      }
      : null;
  }

  function getCanvasPixelPoint(point: { x: number; y: number }) {
    const canvas = drawCanvasRef.current;

    if (!canvas) {
      return point;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: point.x * rect.width,
      y: point.y * rect.height,
    };
  }

  function getTextHit(point: DrawingPoint) {
    const canvas = drawCanvasRef.current;
    const ctx = drawContextRef.current;

    if (!canvas || !ctx) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    for (let index = drawingItemsRef.current.length - 1; index >= 0; index -= 1) {
      const item = drawingItemsRef.current[index];

      if (item.type !== 'text') {
        continue;
      }

      ctx.font = `600 ${item.fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      const itemX = item.x * rect.width;
      const itemY = item.y * rect.height;
      const width = ctx.measureText(item.text).width;
      const height = item.fontSize * 1.3;
      const pointX = point.x * rect.width;
      const pointY = point.y * rect.height;

      if (pointX >= itemX && pointX <= itemX + width && pointY >= itemY && pointY <= itemY + height) {
        return item;
      }
    }

    return null;
  }

  function openTextEditor(point: DrawingPoint) {
    setTextEditor({
      x: point.x,
      y: point.y,
      value: '',
      fontSize: textFontSize,
    });
  }

  function updateTextEditor(nextEditorState: Partial<TextEditorState>) {
    setTextEditor((current) =>
      current
        ? {
          ...current,
          ...nextEditorState,
        }
        : current);
  }

  function closeTextEditor() {
    setTextEditor(null);
  }

  function commitTextEditor() {
    if (!textEditor) {
      return false;
    }

    const nextText = textEditor.value.trim();
    setTextEditor(null);
    setTextFontSize(textEditor.fontSize);

    if (!nextText) {
      return false;
    }

    addDrawingItem({
      id: createDrawingId(),
      type: 'text',
      x: textEditor.x,
      y: textEditor.y,
      text: nextText,
      color: drawingColor,
      fontSize: textEditor.fontSize,
    });

    return true;
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingAllowed) {
      return;
    }

    const point = getCanvasPoint(event.nativeEvent);

    if (!point) {
      return;
    }

    if (drawingTool === 'text') {
      const textHit = getTextHit(point);

      if (textEditor) {
        commitTextEditor();
      }

      if (textHit) {
        draggingTextIdRef.current = textHit.id;
        draggingTextOffsetRef.current = {
          x: point.x - textHit.x,
          y: point.y - textHit.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDraggingText(true);
        return;
      }

      openTextEditor(point);
      return;
    }

    currentStrokeRef.current = [point];
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingAllowed) {
      return;
    }

    const point = getCanvasPoint(event.nativeEvent);

    if (!point) {
      return;
    }

    if (isDraggingText && draggingTextIdRef.current) {
      const textItem = drawingItemsRef.current.find((item) =>
        item.type === 'text' && item.id === draggingTextIdRef.current);

      if (textItem?.type === 'text') {
        const offset = draggingTextOffsetRef.current;
        updateDrawingItem({
          ...textItem,
          x: Math.max(0, Math.min(1, point.x - offset.x)),
          y: Math.max(0, Math.min(1, point.y - offset.y)),
        }, false);
      }
      return;
    }

    if (!isDrawing) {
      return;
    }

    const ctx = drawContextRef.current;
    const currentStroke = currentStrokeRef.current;

    if (!canvasReady || !ctx || currentStroke.length === 0) {
      return;
    }

    currentStroke.push(point);
    const previousPoint = getCanvasPixelPoint(currentStroke[currentStroke.length - 2]);
    const nextPoint = getCanvasPixelPoint(point);

    ctx.globalCompositeOperation = drawingTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = drawingTool === 'eraser' ? 'rgba(0,0,0,1)' : drawingColor;
    ctx.lineWidth = drawingTool === 'eraser' ? eraserStrokeWidth : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.lineTo(nextPoint.x, nextPoint.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function handleCanvasPointerUp() {
    if (!drawingAllowed) {
      return;
    }

    if (isDraggingText && draggingTextIdRef.current) {
      const textItem = drawingItemsRef.current.find((item) =>
        item.type === 'text' && item.id === draggingTextIdRef.current);

      if (textItem) {
        getSocket()?.emit('meeting:drawing-update', textItem);
      }

      draggingTextIdRef.current = null;
      draggingTextOffsetRef.current = { x: 0, y: 0 };
      setIsDraggingText(false);
      return;
    }

    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);

    if (currentStrokeRef.current.length > 1) {
      addDrawingItem({
        id: createDrawingId(),
        type: 'stroke',
        points: currentStrokeRef.current,
        color: drawingColor,
        width: drawingTool === 'eraser' ? eraserStrokeWidth : 3,
        tool: drawingTool === 'eraser' ? 'eraser' : 'pen',
      });
    }

    currentStrokeRef.current = [];
  }

  function handleRemoteDrawingItem(payload: DrawingItem) {
    addDrawingItem(payload, false);
  }

  function handleRemoteDrawingUpdate(payload: DrawingItem) {
    updateDrawingItem(payload, false);
  }

  function updateDrawingPermission(nextPermission: DrawingPermission) {
    setDrawingPermission(nextPermission);
    setRoomMessage(formatDrawingPermissionMessage(nextPermission));
    getSocket()?.emit('meeting:drawing-permission', nextPermission);
  }

  function handleDrawingModeChange(nextMode: DrawingPermission['mode']) {
    updateDrawingPermission({
      mode: nextMode,
      allowedUserIds: nextMode === 'selected' ? drawingPermission.allowedUserIds : [],
    });
  }

  function toggleSelectedDrawer(userId: string) {
    const nextAllowedUserIds = selectedDrawerIds.has(userId)
      ? drawingPermission.allowedUserIds.filter((allowedUserId) => allowedUserId !== userId)
      : [...drawingPermission.allowedUserIds, userId];

    updateDrawingPermission({
      mode: 'selected',
      allowedUserIds: nextAllowedUserIds,
    });
  }

  function addScreenTrackToPeer(peerConnection: RTCPeerConnection, track: MediaStreamTrack) {
    const hasScreenTrack = peerConnection.getSenders().some(
      (sender) => sender.track === track,
    );

    if (!hasScreenTrack) {
      peerConnection.addTrack(track, screenStreamRef.current as MediaStream);
    }
  }

  function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Unable to read recording data.'));
      };
      reader.onerror = () => {
        reject(new Error('Unable to read recording data.'));
      };
      reader.readAsDataURL(blob);
    });
  }

  function startSessionRecording(
    sourceStream: MediaStream | null,
    sourceKind: 'local' | 'screen' = 'local',
    options: { silent?: boolean } = {},
  ) {
    if (role !== 'faculty' || !selfRef.current?.isHost || mediaRecorderRef.current) {
      return false;
    }

    if (!('MediaRecorder' in window)) {
      setRoomError('Recording is not supported by this browser.');
      return false;
    }

    const videoTracks = sourceStream?.getVideoTracks().filter((track) => track.readyState === 'live') ?? [];
    const sourceAudioTracks = sourceStream?.getAudioTracks().filter((track) => track.readyState === 'live') ?? [];
    const localAudioTracks = sourceKind === 'screen'
      ? localStreamRef.current?.getAudioTracks().filter((track) => track.readyState === 'live') ?? []
      : [];
    const audioTracksById = new Map<string, MediaStreamTrack>();
    const candidateAudioTracks = sourceKind === 'screen'
      ? [...sourceAudioTracks, ...localAudioTracks]
      : sourceAudioTracks;

    candidateAudioTracks.forEach((track) => {
      audioTracksById.set(track.id, track);
    });

    const audioTracks = Array.from(audioTracksById.values());
    const tracks = [...videoTracks, ...audioTracks];
    const hasVideo = videoTracks.length > 0;

    if (sourceKind === 'screen' && !hasVideo) {
      setRoomError('Recording did not start because no faculty screen video is available.');
      return false;
    }

    if (tracks.length === 0) {
      setRoomError('Recording did not start because no microphone, camera, or screen stream is available.');
      return false;
    }

    try {
      const mimeType = getSupportedRecordingMimeType(hasVideo);
      const recordingStream = new MediaStream(tracks);
      const recorderOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        ...(hasVideo ? { videoBitsPerSecond: 900000 } : {}),
        ...(audioTracks.length > 0 ? { audioBitsPerSecond: 64000 } : {}),
      };
      const recorder = new MediaRecorder(recordingStream, {
        ...recorderOptions,
      });

      recordingChunksRef.current = [];
      recordingSourceRef.current = sourceKind;
      recordingMimeTypeRef.current = recorder.mimeType || mimeType || (hasVideo ? 'video/webm' : 'audio/webm');
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current = [...recordingChunksRef.current, event.data];
        }
      };
      recorder.onstop = () => {
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }
        recordingSourceRef.current = null;
        setIsRecording(false);
      };
      recorder.onerror = () => {
        setRoomError('Meeting recording stopped unexpectedly.');
      };
      recorder.start(2000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      if (!options.silent) {
        setRoomMessage(
          sourceKind === 'screen'
            ? 'Faculty screen recording started.'
            : 'Meeting recording started.',
        );
      }
      return true;
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Unable to start session recording.');
      recordingSourceRef.current = null;
      recordingMimeTypeRef.current = 'video/webm';
      return false;
    }
  }

  function stopSessionRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return Promise.resolve();
    }

    if (recorder.state === 'inactive') {
      mediaRecorderRef.current = null;
      recordingSourceRef.current = null;
      setIsRecording(false);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const handleStop = () => {
        recorder.removeEventListener('stop', handleStop);
        mediaRecorderRef.current = null;
        recordingSourceRef.current = null;
        setIsRecording(false);
        resolve();
      };

      recorder.addEventListener('stop', handleStop);
      recorder.stop();
    });
  }

  async function buildRecordingPayload() {
    await stopSessionRecording();

    if (recordingChunksRef.current.length === 0) {
      return null;
    }

    const mimeType = recordingChunksRef.current[0]?.type || recordingMimeTypeRef.current || 'video/webm';
    const recordingBlob = new Blob(recordingChunksRef.current, { type: mimeType });
    const dataUrl = await blobToDataUrl(recordingBlob);
    const extension = getRecordingFileExtension(mimeType);

    return {
      name: `${meetingId}-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`,
      dataUrl,
      mimeType,
      size: recordingBlob.size,
    } satisfies RecordingPayload;
  }

  async function startScreenShare() {
    const activeShare = activeScreenShareRef.current;
    const activeSharerSocketId = activeShare.participant?.socketId;
    const localSocketId = selfRef.current?.socketId ?? selfParticipant?.socketId;

    if (activeShare.active && activeSharerSocketId && activeSharerSocketId !== localSocketId) {
      setRoomError(`${activeShare.participant?.displayName ?? 'Another participant'} is already sharing their screen.`);
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setRoomError('Screen sharing is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);
      startSessionRecording(stream, 'screen');
      applyScreenShareState({
        active: true,
        participant: selfRef.current ?? selfParticipant,
        streamId: stream.id,
      });
      setRoomMessage('You are sharing and recording your faculty screen.');
      getSocket()?.emit('meeting:screen-share-status', { active: true, streamId: stream.id });

      const screenTrack = stream.getVideoTracks()[0];

      if (screenTrack) {
        screenTrack.onended = () => {
          void stopScreenShare();
        };
      }

      peersRef.current.forEach((peerConnection) => {
        if (screenTrack) {
          addScreenTrackToPeer(peerConnection, screenTrack);
        }
      });

      for (const participant of getRemoteOfferTargets()) {
        await createOffer(participant);
      }

    } catch (error) {
      setRoomError(
        error instanceof Error
          ? error.message
          : 'Unable to start screen sharing.',
      );
    }
  }

  async function stopScreenShare({
    announce = true,
    updateShareState = true,
    message = 'Screen sharing stopped.',
  }: {
    announce?: boolean;
    updateShareState?: boolean;
    message?: string | null;
  } = {}) {
    const stream = screenStreamRef.current;

    if (!stream) {
      return;
    }

    if (recordingSourceRef.current === 'screen') {
      await stopSessionRecording();
    }

    const screenTracks = new Set(stream.getTracks());

    stream.getTracks().forEach((track) => track.stop());

    peersRef.current.forEach((peerConnection) => {
      peerConnection.getSenders().forEach((sender) => {
        if (sender.track && screenTracks.has(sender.track)) {
          peerConnection.removeTrack(sender);
        }
      });
    });

    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);

    if (updateShareState) {
      applyScreenShareState({
        active: false,
        participant: null,
        streamId: null,
      });
    }

    if (message) {
      setRoomMessage(message);
    }

    if (announce) {
      getSocket()?.emit('meeting:screen-share-status', { active: false });
    }

    for (const participant of getRemoteOfferTargets()) {
      await createOffer(participant);
    }
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    await startScreenShare();
  }

  async function handleIncomingSignal(payload: SignalPayload) {
    if (!payload.data) {
      return;
    }

    const participant = payload.participant ?? remoteParticipants.find(
      (entry) => entry.socketId === payload.fromSocketId,
    );

    if (!participant) {
      return;
    }

    const peerConnection = createPeerConnection(participant);

    if (payload.data.description) {
      await peerConnection.setRemoteDescription(payload.data.description);

      if (payload.data.description.type === 'offer') {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        getSocket()?.emit('meeting:signal', {
          targetSocketId: payload.fromSocketId,
          data: {
            description: {
              type: answer.type,
              sdp: answer.sdp,
            },
          },
        });
      }
    }

    if (payload.data.candidate) {
      try {
        await peerConnection.addIceCandidate(payload.data.candidate);
      } catch (error) {
        console.error('Failed to add ICE candidate', error);
      }
    }
  }

  function emitJoinMeeting(socket: Socket) {
    return new Promise<JoinMeetingResult>((resolve) => {
      socket.emit(
        'meeting:join',
        {
          subjectId,
          meetingId,
        },
        (response: JoinMeetingResult) => {
          resolve(response);
        },
      );
    });
  }

  async function applyJoinResult(
    socket: Socket,
    result: JoinMeetingResult,
    mediaNotice: string | null,
    stream: MediaStream | null,
    reconnected = false,
  ) {
    if (!result.ok) {
      throw new Error(result.error);
    }

    const activeLocalScreenStream = screenStreamRef.current;
    const roomShareParticipantUserId = result.roomState.screenShare.participant?.userId;
    const roomShareBelongsToAnotherUser = Boolean(
      result.roomState.screenShare.active
        && roomShareParticipantUserId
        && roomShareParticipantUserId !== result.self.userId,
    );

    selfRef.current = result.self;
    setSelfParticipant(result.self);
    setDrawingPermission(result.roomState.drawingPermission);

    if (activeLocalScreenStream && roomShareBelongsToAnotherUser) {
      await stopScreenShare({
        announce: false,
        updateShareState: false,
        message: null,
      });
    }

    if (activeLocalScreenStream && !roomShareBelongsToAnotherUser) {
      const resumedShareState = {
        active: true,
        participant: result.self,
        streamId: activeLocalScreenStream.id,
      };

      setIsScreenSharing(true);
      applyScreenShareState(resumedShareState);
      socket.emit('meeting:screen-share-status', {
        active: true,
        streamId: activeLocalScreenStream.id,
      });
    } else {
      applyScreenShareState(result.roomState.screenShare);
    }

    result.participants.forEach((participant) => {
      remoteParticipantsRef.current.set(participant.socketId, participant);
    });
    setRemoteParticipants((current) => {
      const currentBySocketId = new Map(current.map((participant) => [participant.socketId, participant]));

      return result.participants.map((participant) => {
        const existingParticipant = currentBySocketId.get(participant.socketId);

        return {
          ...participant,
          stream: existingParticipant?.stream ?? null,
          screenStream: existingParticipant?.screenStream ?? null,
        };
      });
    });

    const hasVideo = Boolean(stream?.getVideoTracks().length);
    const hasAudio = Boolean(stream?.getAudioTracks().length);
    setRoomError(null);
    const roomStatusMessage = activeLocalScreenStream && !roomShareBelongsToAnotherUser
      ? 'Screen sharing resumed.'
      : reconnected
        ? 'Reconnected to the live room.'
        : mediaNotice
          ?? (hasVideo
            ? 'Camera live. Other participants will appear here when they join.'
            : hasAudio
              ? 'Microphone connected. Camera is off; other participants will appear here when they join.'
              : 'Connected without local media. Other participants will appear here when they join.');
    const isFacultyHost = role === 'faculty' && result.self.isHost;
    const screenRecordingStarted = isFacultyHost
      && activeLocalScreenStream
      && !roomShareBelongsToAnotherUser
      ? startSessionRecording(activeLocalScreenStream, 'screen', { silent: true })
      : false;
    const shouldPromptForFacultyScreen = isFacultyHost
      && !reconnected
      && !activeLocalScreenStream
      && !result.roomState.screenShare.active
      && !screenRecordingPromptedRef.current;

    if (shouldPromptForFacultyScreen) {
      screenRecordingPromptedRef.current = true;
      setRoomMessage(`${roomStatusMessage} Use Share screen only when you want to record the whole session.`);
      return;
    }

    setRoomMessage(screenRecordingStarted
      ? `${roomStatusMessage} Faculty screen recording started.`
      : roomStatusMessage);
  }

  async function rejoinMeetingRoom(socket: Socket) {
    if (!canJoinRoom || isJoiningRef.current || socketRef.current !== socket || isClosingRef.current) {
      return;
    }

    isJoiningRef.current = true;
    setIsConnecting(true);
    setRoomError(null);
    setRoomMessage(screenStreamRef.current
      ? 'Restoring your screen share...'
      : 'Restoring the live room...');

    try {
      const result = await emitJoinMeeting(socket);
      await applyJoinResult(socket, result, null, localStreamRef.current, true);
    } catch (error) {
      setRoomError(
        error instanceof Error
          ? error.message
          : 'Unable to restore the live meeting room.',
      );
      setRoomMessage('Reconnect failed.');
    } finally {
      isJoiningRef.current = false;
      setIsConnecting(false);
    }
  }

  async function joinMeetingRoom() {
    if (!token || !canJoinRoom || isJoiningRef.current || socketRef.current) {
      return;
    }

    isJoiningRef.current = true;
    setIsConnecting(true);
    setRoomError(null);
    setRoomMessage('Connecting to the live room...');

    const mediaResult = await requestLocalMedia();
    const stream = mediaResult.stream;

    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsAudioEnabled(Boolean(stream?.getAudioTracks().some((track) => track.enabled)));
    setIsVideoEnabled(Boolean(stream?.getVideoTracks().some((track) => track.enabled)));

    const socket = io({
      path: '/socket.io',
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('meeting:user-joined', (participant: MeetingParticipant) => {
      upsertRemoteParticipant(participant);
      void createOffer(participant);
    });

    socket.on('meeting:user-left', (payload: { socketId: string }) => {
      const peerConnection = getPeerConnection(payload.socketId);

      peerConnection?.close();
      peersRef.current.delete(payload.socketId);
      removeRemoteParticipant(payload.socketId);
    });

    socket.on('meeting:signal', (payload: SignalPayload) => {
      void handleIncomingSignal(payload);
    });

    socket.on('meeting:drawing-permission', (payload: DrawingPermission) => {
      setDrawingPermission(payload);
      setRoomMessage(formatDrawingPermissionMessage(payload));
    });

    socket.on('meeting:drawing-item', handleRemoteDrawingItem);
    socket.on('meeting:drawing-stroke', (payload: DrawingItem) => {
      handleRemoteDrawingItem({
        ...payload,
        id: payload.id ?? createDrawingId(),
        type: 'stroke',
        tool: payload.type === 'stroke' ? payload.tool : 'pen',
      } as DrawingItem);
    });
    socket.on('meeting:drawing-update', handleRemoteDrawingUpdate);
    socket.on('meeting:drawing-undo', () => {
      undoDrawing(false);
    });
    socket.on('meeting:drawing-clear', () => {
      clearBoard(false);
    });

    socket.on('meeting:screen-share-status', (payload: ScreenShareState) => {
      if (payload.active && payload.participant?.socketId !== selfRef.current?.socketId && screenStreamRef.current) {
        void stopScreenShare({
          announce: false,
          updateShareState: false,
          message: null,
        });
      }

      applyScreenShareState(payload);

      if (!payload.active) {
        clearBoard(false);
      }

      setRoomMessage(payload.active
        ? `${payload.participant?.displayName ?? 'A participant'} is sharing their screen.`
        : 'Screen sharing has stopped.');
    });

    socket.on('disconnect', () => {
      if (isClosingRef.current) {
        return;
      }

      handleTransientDisconnect();
    });

    socket.on('connect', () => {
      if (!selfRef.current || isClosingRef.current) {
        return;
      }

      void rejoinMeetingRoom(socket);
    });

    try {
      const result = await new Promise<JoinMeetingResult>((resolve, reject) => {
        socket.once('connect_error', reject);

        if (socket.connected) {
          void emitJoinMeeting(socket).then(resolve);
          return;
        }

        socket.once('connect', () => {
          void emitJoinMeeting(socket).then(resolve);
        });
      });

      await applyJoinResult(socket, result, mediaResult.notice, stream);
    } catch (error) {
      cleanupRoom(false);
      setRoomError(
        error instanceof Error
          ? error.message
          : 'Unable to connect to the live meeting room.',
      );
      setRoomMessage('Connection failed.');
    } finally {
      isJoiningRef.current = false;
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    if (!canJoinRoom) {
      cleanupRoom(false);
      setRoomError(null);
      setRoomMessage(formatRoomState(meetingStatus, role));
      return;
    }

    void joinMeetingRoom();

    return () => {
      cleanupRoom(true);
    };
  }, [canJoinRoom, meetingId, meetingStatus, role, subjectId, token]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    setFullscreenSupported(Boolean(document.fullscreenEnabled));

    const handleFullscreenChange = () => {
      setIsStageFullscreen(document.fullscreenElement === stageFullscreenRef.current);
      window.requestAnimationFrame(resizeCanvas);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    resizeCanvas();
  }, [mainStageStream, hasSharedScreenStage]);

  useEffect(() => {
    if (!textEditor) {
      return;
    }

    window.requestAnimationFrame(() => {
      textEditorInputRef.current?.focus();
    });
  }, [textEditor?.x, textEditor?.y]);

  useEffect(() => {
    if (drawingTool !== 'text' || !hasSharedScreenStage || !drawingAllowed) {
      setTextEditor(null);
    }
  }, [drawingAllowed, drawingTool, hasSharedScreenStage]);

  function toggleAudio() {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];

    if (audioTracks.length === 0) {
      setIsAudioEnabled(false);
      return;
    }

    const nextAudioEnabled = !isAudioEnabled;

    audioTracks.forEach((track) => {
      track.enabled = nextAudioEnabled;
    });
    setIsAudioEnabled(nextAudioEnabled);
  }

  function toggleVideo() {
    const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];

    if (videoTracks.length === 0) {
      setIsVideoEnabled(false);
      return;
    }

    const nextVideoEnabled = !isVideoEnabled;

    videoTracks.forEach((track) => {
      track.enabled = nextVideoEnabled;
    });
    setIsVideoEnabled(nextVideoEnabled);
  }

  function retryConnection() {
    cleanupRoom(true);
    setRoomError(null);
    setRoomMessage('Retrying meeting connection...');
    void joinMeetingRoom();
  }

  async function toggleStageFullscreen() {
    const stage = stageFullscreenRef.current;

    if (!stage || !document.fullscreenEnabled) {
      setRoomError('Fullscreen is not supported by this browser.');
      return;
    }

    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      await stage.requestFullscreen();
      setRoomError(null);
    } catch {
      setRoomError('Unable to switch fullscreen mode.');
    }
  }

  async function endSession() {
    if (!token || !canEndSession || isEndingSession) {
      return;
    }

    if (!mediaRecorderRef.current && recordingChunksRef.current.length === 0) {
      setRoomError('Share the faculty screen first so the whole-session video can be recorded and saved.');
      setRoomMessage('Session is still live.');
      return;
    }

    setIsEndingSession(true);
    setRoomError(null);
    setRoomMessage(
      recordingChunksRef.current.length > 0 || mediaRecorderRef.current
        ? 'Saving faculty screen recording and ending the session...'
        : 'Ending the session...',
    );

    try {
      const recording = await buildRecordingPayload();

      const response = await fetch(`/api/faculty/subjects/${subjectId}/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(recording ? { recording } : {}),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: unknown;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Unable to end the session.');
      }

      if (screenStreamRef.current) {
        await stopScreenShare({
          message: null,
        });
      }

      cleanupRoom(true);
      setRoomError(null);
      setRoomMessage(data.message || 'Session ended. Recording was saved for later viewing.');
      onMeetingEnded?.({
        message: data.message || 'Session ended. Recording was saved for later viewing.',
        data: data.data,
      });
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Unable to end the session.');
      setRoomMessage('Session is still live.');
    } finally {
      setIsEndingSession(false);
    }
  }

  const controlButtonClass = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3.5 py-2 text-fluid-sm font-semibold text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-45';
  const meetingControls = (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#111827]/94 px-3 py-3 shadow-[0_-14px_28px_rgba(15,23,42,0.32)] backdrop-blur-xl">
      <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleAudio}
          disabled={!hasLocalAudio}
          className={controlButtonClass}
        >
          {isAudioEnabled ? <FiMic className="h-4 w-4" /> : <FiMicOff className="h-4 w-4" />}
          {hasLocalAudio ? (isAudioEnabled ? 'Mute mic' : 'Unmute mic') : 'No mic'}
        </button>

        <button
          type="button"
          onClick={toggleVideo}
          disabled={!hasLocalVideo}
          className={controlButtonClass}
        >
          {isVideoEnabled ? <FiVideo className="h-4 w-4" /> : <FiVideoOff className="h-4 w-4" />}
          {hasLocalVideo ? (isVideoEnabled ? 'Hide camera' : 'Show camera') : 'Camera off'}
        </button>

        <button
          type="button"
          onClick={toggleScreenShare}
          disabled={screenShareButtonDisabled}
          className={`${controlButtonClass} ${isScreenSharing ? 'border-[#f9a8a8]/45 bg-[#ef4444]/90 hover:bg-[#dc2626]' : 'border-[#7dd3fc]/35 bg-[#0ea5e9]/90 hover:bg-[#0284c7]'}`}
        >
          <FiMonitor className="h-4 w-4" />
          {screenShareButtonLabel}
        </button>

        <button
          type="button"
          onClick={toggleStageFullscreen}
          disabled={!fullscreenSupported}
          className={controlButtonClass}
        >
          {isStageFullscreen ? <FiMinimize2 className="h-4 w-4" /> : <FiMaximize2 className="h-4 w-4" />}
          {isStageFullscreen ? 'Exit full screen' : 'Full screen'}
        </button>

        {hasSharedScreenStage && drawingAllowed ? (
          <>
            <div className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-white/12 bg-white/10 px-2 py-2">
              {(['pen', 'eraser', 'text'] as DrawingTool[]).map((tool) => {
                const isSelected = drawingTool === tool;

                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setDrawingTool(tool)}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-fluid-xs font-semibold transition ${
                      isSelected ? 'bg-white text-[#111827]' : 'text-white/78 hover:bg-white/14'
                    }`}
                    title={tool === 'pen' ? 'Draw' : tool === 'eraser' ? 'Erase' : 'Type text'}
                  >
                    {tool === 'pen' ? <FiEdit3 className="h-4 w-4" /> : tool === 'eraser' ? <FiDelete className="h-4 w-4" /> : <FiType className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => undoDrawing()}
              disabled={!hasDrawingItems}
              className={controlButtonClass}
            >
              <FiRotateCcw className="h-4 w-4" />
              Undo
            </button>

            <div
              aria-label="Drawing color"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-2.5 py-2"
            >
              {drawingColorOptions.map((color) => {
                const isSelected = drawingColor.toLowerCase() === color.toLowerCase();

                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use ${color} drawing color`}
                    title={`Draw ${color}`}
                    onClick={() => setDrawingColor(color)}
                    className={`h-7 w-7 rounded-full border border-white/30 transition ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111827]'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
              <label
                className={`relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-white/30 transition ${
                  isPresetDrawingColor
                    ? 'hover:scale-105'
                    : 'ring-2 ring-white ring-offset-2 ring-offset-[#111827]'
                }`}
                title="Custom drawing color"
              >
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(event) => setDrawingColor(event.target.value)}
                  aria-label="Custom drawing color"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="block h-full w-full" style={{ backgroundColor: drawingColor }} />
              </label>
            </div>
          </>
        ) : null}

        {selfParticipant?.isHost ? (
          <>
            <div className="inline-flex min-h-11 flex-wrap items-center justify-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-fluid-sm font-semibold text-white">
              <FiEdit3 className="h-4 w-4" />
              <select
                aria-label="Choose who can draw"
                value={drawingPermission.mode}
                onChange={(event) => handleDrawingModeChange(event.target.value as DrawingPermission['mode'])}
                className="max-w-[10rem] bg-transparent text-white outline-none"
              >
                <option className="text-slate-900" value="none">No students</option>
                <option className="text-slate-900" value="everyone">All students</option>
                <option className="text-slate-900" value="selected">Selected</option>
              </select>
            </div>
            {drawingPermission.mode === 'selected' ? (
              <div className="inline-flex min-h-11 max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-2 py-1">
                {remoteStudentParticipants.length > 0 ? remoteStudentParticipants.map((participant) => {
                  const isSelected = selectedDrawerIds.has(participant.userId);

                  return (
                    <button
                      key={participant.userId}
                      type="button"
                      onClick={() => toggleSelectedDrawer(participant.userId)}
                      className={`rounded-full border px-2.5 py-1 text-fluid-2xs font-semibold transition ${
                        isSelected
                          ? 'border-[#7dd3fc]/50 bg-[#0ea5e9]/90 text-white'
                          : 'border-white/12 bg-white/10 text-white/72 hover:bg-white/16'
                      }`}
                    >
                      {participant.displayName}
                    </button>
                  );
                }) : (
                  <span className="px-2 text-fluid-2xs font-semibold text-white/60">No students</span>
                )}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => clearBoard()}
              disabled={!drawingAllowed}
              className={controlButtonClass}
            >
              Clear drawings
            </button>
          </>
        ) : null}

        {canEndSession ? (
          <button
            type="button"
            onClick={endSession}
            disabled={isEndingSession}
            className={`${controlButtonClass} border-[#fecaca]/50 bg-[#dc2626]/90 hover:bg-[#b91c1c]`}
          >
            <FiStopCircle className="h-4 w-4" />
            {isEndingSession ? 'Saving...' : 'End session'}
          </button>
        ) : null}

        <button
          type="button"
          onClick={retryConnection}
          disabled={isConnecting || !canJoinRoom}
          className={controlButtonClass}
        >
          <FiRefreshCw className="h-4 w-4" />
          {isConnecting ? 'Connecting...' : 'Reconnect'}
        </button>
      </div>
    </div>
  );

  const textEditorOverlay = hasSharedScreenStage && drawingAllowed && drawingTool === 'text' && textEditor ? (
    <div
      className="pointer-events-auto absolute z-30 rounded-[1rem] border border-white/20 bg-[#111827]/92 p-2 shadow-[0_18px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl"
      style={{
        left: `clamp(0.75rem, ${textEditor.x * 100}%, calc(100% - 19rem))`,
        top: `clamp(0.75rem, ${textEditor.y * 100}%, calc(100% - 14rem))`,
        width: 'min(18rem, calc(100% - 1.5rem))',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <input
        ref={textEditorInputRef}
        type="text"
        value={textEditor.value}
        onChange={(event) => updateTextEditor({ value: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitTextEditor();
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            closeTextEditor();
          }
        }}
        placeholder="Text"
        className="w-full rounded-[0.75rem] border border-white/12 bg-white px-3 py-2 font-semibold leading-tight text-[#111827] outline-none placeholder:text-[#64748b]"
        style={{
          color: drawingColor,
          fontSize: `${textEditor.fontSize}px`,
        }}
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-2.5 text-fluid-xs font-semibold text-white/86">
          <FiType className="h-3.5 w-3.5" />
          <input
            type="number"
            min={14}
            max={72}
            value={textEditor.fontSize}
            onChange={(event) =>
              updateTextEditor({ fontSize: clampTextFontSize(Number(event.target.value)) })}
            aria-label="Text font size"
            className="h-7 w-12 rounded-full border border-white/12 bg-white px-1 text-center text-fluid-xs font-semibold text-[#111827] outline-none"
          />
        </label>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={commitTextEditor}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#86efac]/30 bg-[#16a34a]/90 text-white transition hover:bg-[#15803d]"
            aria-label="Place text"
            title="Place text"
          >
            <FiCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={closeTextEditor}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white/82 transition hover:bg-white/16"
            aria-label="Cancel text"
            title="Cancel text"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <article className="rounded-[1.55rem] border border-[#d6e2ec] bg-[linear-gradient(180deg,rgba(250,253,255,0.98)_0%,rgba(236,243,250,0.96)_100%)] p-5 shadow-[0_18px_36px_rgba(39,77,117,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6d86a0]">
            Live video room
          </p>
          <h2 className="mt-2 text-fluid-lg font-semibold text-[#173b70]">
            {isFacultyFocusLayout ? 'Faculty classroom stage' : 'Classroom feed'}
          </h2>
          <p className="mt-1 text-fluid-sm text-[#607b95]">{roomMessage}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${
            canJoinRoom
              ? 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]'
              : 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]'
          }`}>
            {canJoinRoom ? 'Room live' : meetingStatus === 'ended' ? 'Room closed' : 'Waiting'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e2ec] bg-white px-3 py-1 text-fluid-2xs font-semibold text-[#607790]">
            <FiUsers className="h-3.5 w-3.5" />
            {participantCount} participant
            {participantCount === 1 ? '' : 's'}
          </span>
          {role === 'faculty' && selfParticipant?.isHost ? (
            <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${
              isRecording
                ? 'border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]'
                : 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]'
            }`}>
              {isRecording ? 'Recording' : 'Not recording'}
            </span>
          ) : null}
        </div>
      </div>

      {roomError ? (
        <div className="mt-4 flex items-start gap-3 rounded-[1rem] border border-[#ecd0d0] bg-[#fff2f2] px-4 py-3 text-[#9f4a4a]">
          <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-fluid-sm leading-6">{roomError}</p>
        </div>
      ) : null}

      {usesMainStageLayout ? (
        <div className="mt-5 space-y-5">
          <div ref={stageFullscreenRef} className={isStageFullscreen ? 'h-screen w-screen bg-[#07111f]' : undefined}>
            <VideoTile
              label={mainStageLabel}
              detail={largeMainStageDetail}
              stream={mainStageStream}
              muted
              tone="local"
              variant="feature"
              badgeLabel={largeStageBadge}
              fit={hasSharedScreenStage ? 'contain' : 'cover'}
              fullscreenActive={isStageFullscreen}
            >
              {hasSharedScreenStage ? (
                <canvas
                  ref={drawCanvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerLeave={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  className={`absolute inset-0 h-full w-full ${isStageFullscreen ? '' : 'rounded-[1.6rem]'} bg-transparent ${
                    drawingAllowed
                      ? `pointer-events-auto ${drawingTool === 'text' ? 'cursor-text' : drawingTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`
                      : 'pointer-events-none'
                  }`}
                />
              ) : null}
              {textEditorOverlay}
              {meetingControls}
            </VideoTile>
          </div>

          <div className="rounded-[1.35rem] border border-[#d6e2ec] bg-[rgba(255,255,255,0.72)] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-fluid-2xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                  Participant strip
                </p>
                <h3 className="mt-1 text-fluid-base font-semibold text-[#173b70]">
                  {participantStripTitle}
                </h3>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e2ec] bg-white px-3 py-1 text-fluid-2xs font-semibold text-[#607790]">
                <FiUsers className="h-3.5 w-3.5" />
                {visibleRemoteParticipants.length} remote
              </span>
            </div>

            {visibleRemoteParticipants.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {visibleRemoteParticipants.map((participant) => (
                  <VideoTile
                    key={participant.socketId}
                    label={participant.displayName}
                    detail={`${participant.role === 'faculty' ? 'Faculty' : 'Student'}${participant.isHost ? ' host' : ''}`}
                    stream={participant.stream}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-center rounded-[1.25rem] border border-dashed border-[#cfdeea] bg-[linear-gradient(180deg,rgba(252,254,255,0.98)_0%,rgba(240,246,252,0.96)_100%)] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <div>
                  <p className="text-fluid-md font-semibold text-[#173b70]">{emptyParticipantTitle}</p>
                  <p className="mt-2 text-fluid-sm text-[#6a839d]">
                    {emptyParticipantDetail}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            <div ref={stageFullscreenRef} className={isStageFullscreen ? 'h-screen w-screen bg-[#07111f]' : undefined}>
              <VideoTile
                label={mainStageLabel}
                detail={mainStageDetail}
                stream={mainStageStream}
                muted
                tone="local"
                fit={hasSharedScreenStage ? 'contain' : 'cover'}
                fullscreenActive={isStageFullscreen}
              >
                {hasSharedScreenStage ? (
                  <canvas
                    ref={drawCanvasRef}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerLeave={handleCanvasPointerUp}
                    onPointerCancel={handleCanvasPointerUp}
                    className={`absolute inset-0 h-full w-full ${isStageFullscreen ? '' : 'rounded-[1.25rem]'} bg-transparent ${
                      drawingAllowed
                        ? `pointer-events-auto ${drawingTool === 'text' ? 'cursor-text' : drawingTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`
                        : 'pointer-events-none'
                  }`}
                />
              ) : null}
                {textEditorOverlay}
                {meetingControls}
              </VideoTile>
            </div>
          </div>

          {visibleRemoteParticipants.length > 0 ? (
            <div className="grid gap-4">
              {visibleRemoteParticipants.map((participant) => (
                <VideoTile
                  key={participant.socketId}
                  label={participant.displayName}
                  detail={`${participant.role === 'faculty' ? 'Faculty' : 'Student'}${participant.isHost ? ' host' : ''}`}
                  stream={participant.stream}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-[1.25rem] border border-dashed border-[#cfdeea] bg-[linear-gradient(180deg,rgba(252,254,255,0.98)_0%,rgba(240,246,252,0.96)_100%)] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <div>
                <p className="text-fluid-md font-semibold text-[#173b70]">No one else is on camera yet</p>
                <p className="mt-2 text-fluid-sm text-[#6a839d]">
                  Other participants will appear here as soon as they join the live room.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </article>
  );
}

export default MeetingRoomStage;
