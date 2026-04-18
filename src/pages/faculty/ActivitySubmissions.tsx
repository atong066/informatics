import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiEye,
  FiFileText,
  FiImage,
  FiMessageSquare,
  FiMove,
  FiPaperclip,
  FiPenTool,
  FiRotateCcw,
  FiSave,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { getStoredToken } from '../../lib/auth';

GlobalWorkerOptions.workerSrc = pdfWorker;

const SUBMISSIONS_PER_PAGE = 10;

type AttachmentRecord = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  size: number;
};

type TextHighlight = {
  id: string;
  text: string;
  color: string;
};

type ImageNote = {
  id: string;
  attachmentId: string;
  x: number;
  y: number;
  text: string;
  color: string;
};

type ImageDrawingPoint = {
  x: number;
  y: number;
};

type ImageDrawing = {
  id: string;
  attachmentId: string;
  points: ImageDrawingPoint[];
  color: string;
  width: number;
};

type ReviewRecord = {
  reviewScore: number | null;
  reviewComment: string;
  textHighlights: TextHighlight[];
  imageNotes: ImageNote[];
  imageDrawings: ImageDrawing[];
  reviewedAt: string;
};

type SubmittedStudent = ReviewRecord & {
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
};

type ActivitySubmissionsResponse = {
  itemKind?: 'activity' | 'assignment';
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
  item?: {
    id: string;
    title: string;
    detail: string;
    dueDate: string;
    submissionType: 'text' | 'file';
    status: string;
    submittedCount: number;
    totalStudents: number;
  };
  submittedStudents: SubmittedStudent[];
};

function createReviewId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function sanitizeScoreInput(value: string) {
  const cleanedValue = value.replace(/[^\d.]/g, '');
  const [wholePart, ...decimalParts] = cleanedValue.split('.');
  const normalizedWholePart = wholePart.slice(0, 4);

  if (decimalParts.length === 0) {
    return normalizedWholePart;
  }

  return `${normalizedWholePart}.${decimalParts.join('').slice(0, 2)}`;
}

function isImageAttachment(attachment: AttachmentRecord) {
  return attachment.mimeType.startsWith('image/');
}

function isPdfAttachment(attachment: AttachmentRecord) {
  return (
    attachment.mimeType === 'application/pdf'
    || attachment.name.toLowerCase().endsWith('.pdf')
    || attachment.dataUrl.startsWith('data:application/pdf')
  );
}

function isPreviewableAttachment(attachment: AttachmentRecord) {
  return isImageAttachment(attachment) || isPdfAttachment(attachment);
}

function dataUrlToUint8Array(dataUrl: string) {
  const base64Marker = ';base64,';
  const markerIndex = dataUrl.indexOf(base64Marker);

  if (!dataUrl.startsWith('data:') || markerIndex < 0) {
    throw new Error('PDF data is not available for preview.');
  }

  const binaryString = window.atob(dataUrl.slice(markerIndex + base64Marker.length));
  const data = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    data[index] = binaryString.charCodeAt(index);
  }

  return data;
}

function PdfPreviewContent({ attachment }: { attachment: AttachmentRecord }) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderPdfPreview() {
      setIsLoading(true);
      setErrorMessage(null);
      setPageImages([]);

      try {
        const pdfDocument = await getDocument({ data: dataUrlToUint8Array(attachment.dataUrl) }).promise;
        const nextPageImages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.45 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            throw new Error('Unable to initialize the PDF preview canvas.');
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;

          nextPageImages.push(canvas.toDataURL('image/png'));
        }

        if (!isCancelled) {
          setPageImages(nextPageImages);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to render the PDF preview.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    renderPdfPreview();

    return () => {
      isCancelled = true;
    };
  }, [attachment.dataUrl]);

  if (isLoading) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center rounded-[1rem] border border-[#c1d0dc] bg-[linear-gradient(180deg,#eef3f8_0%,#dde6ef_100%)] px-6 text-center">
        <div>
          <p className="text-fluid-lg font-semibold text-[#173b70]">Preparing PDF preview...</p>
          <p className="mt-2 text-fluid-sm text-[#607b95]">Rendering the submitted pages in the review modal.</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-[1rem] border border-[#ecd0d0] bg-[#fff2f2] px-5 py-5 text-fluid-sm text-[#944a4a]">
        <p className="font-semibold">PDF preview unavailable</p>
        <p className="mt-2">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="max-h-[62vh] overflow-y-auto rounded-[1rem] border border-[#c1d0dc] bg-[linear-gradient(180deg,#dbe4ed_0%,#cfd9e3_100%)] px-4 py-4">
      <div className="mx-auto flex max-w-[52rem] flex-col gap-4">
        {pageImages.map((pageImage, index) => (
          <figure
            key={`${attachment.id}-page-${index + 1}`}
            className="rounded-[1rem] border border-[#bccbd8] bg-white p-3 shadow-[0_12px_24px_rgba(27,46,70,0.12)]"
          >
            <img
              src={pageImage}
              alt={`${attachment.name} page ${index + 1}`}
              className="w-full rounded-[0.7rem] border border-[#e0e7ef] bg-white"
            />
            <figcaption className="mt-2 text-center text-fluid-xs font-semibold uppercase tracking-[0.12em] text-[#6b8198]">
              Page {index + 1}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function splitTextWithHighlights(text: string, highlights: TextHighlight[]) {
  const activeHighlights = highlights.filter((highlight) => highlight.text.trim());
  const lowerText = text.toLowerCase();

  if (!text || activeHighlights.length === 0) {
    return [{ text, highlight: null as TextHighlight | null }];
  }

  const pieces: Array<{ text: string; highlight: TextHighlight | null }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    let bestIndex = -1;
    let bestHighlight: TextHighlight | null = null;

    for (const highlight of activeHighlights) {
      const index = lowerText.indexOf(highlight.text.toLowerCase(), cursor);

      if (index >= 0 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
        bestHighlight = highlight;
      }
    }

    if (!bestHighlight || bestIndex === -1) {
      pieces.push({ text: text.slice(cursor), highlight: null });
      break;
    }

    if (bestIndex > cursor) {
      pieces.push({ text: text.slice(cursor, bestIndex), highlight: null });
    }

    pieces.push({
      text: text.slice(bestIndex, bestIndex + bestHighlight.text.length),
      highlight: bestHighlight,
    });
    cursor = bestIndex + bestHighlight.text.length;
  }

  return pieces;
}

function ActivitySubmissions() {
  const { subjectId, activityId, assignmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const itemKind: 'activity' | 'assignment' = assignmentId ? 'assignment' : 'activity';
  const trackingItemId = assignmentId ?? activityId;
  const [selectedStudent, setSelectedStudent] = useState<SubmittedStudent | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [reviewScore, setReviewScore] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [textHighlights, setTextHighlights] = useState<TextHighlight[]>([]);
  const [imageNotes, setImageNotes] = useState<ImageNote[]>([]);
  const [imageDrawings, setImageDrawings] = useState<ImageDrawing[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState('');
  const [activeImageTool, setActiveImageTool] = useState<'note' | 'draw'>('note');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [drawingWidth, setDrawingWidth] = useState(4);
  const [draftDrawingPoints, setDraftDrawingPoints] = useState<ImageDrawingPoint[]>([]);
  const [isDrawingImage, setIsDrawingImage] = useState(false);
  const [draggedImageNote, setDraggedImageNote] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [draftImageNote, setDraftImageNote] = useState<{ x: number; y: number } | null>(null);
  const [draftImageText, setDraftImageText] = useState('');
  const [submissionPage, setSubmissionPage] = useState(1);
  const imageStageRef = useRef<HTMLDivElement>(null);
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
  const submissionsQueryKey = [
    'faculty-tracking-submissions',
    subjectId,
    itemKind,
    trackingItemId,
  ] as const;

  const submissionsQuery = useQuery({
    queryKey: submissionsQueryKey,
    queryFn: async () => {
      const endpoint = itemKind === 'assignment'
        ? `/api/faculty/subjects/${subjectId}/assignments/${trackingItemId}/submissions`
        : `/api/faculty/subjects/${subjectId}/activities/${trackingItemId}/submissions`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: ActivitySubmissionsResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || `Failed to load ${itemKind} submissions`);
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId && trackingItemId),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) {
        throw new Error('Choose a submission first');
      }

      const parsedScore = reviewScore.trim() ? Number(reviewScore) : null;

      if (parsedScore !== null && (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 1000)) {
        throw new Error('Score must be a valid number from 0 to 1000');
      }

      const response = await fetch(`/api/faculty/subjects/${subjectId}/submissions/${selectedStudent.submissionId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewScore: parsedScore,
          reviewComment,
          textHighlights,
          imageNotes,
          imageDrawings,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: ReviewRecord;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to save review');
      }

      return data.data;
    },
    onSuccess: async (review) => {
      const reviewedSubmissionId = selectedSubmissionId || selectedStudent?.submissionId;
      setPopupState({
        open: true,
        title: 'Review saved',
        message: 'Score and notes were saved for this submission.',
        variant: 'success',
      });
      setSelectedStudent((current) => current ? { ...current, ...review } : current);
      queryClient.setQueryData<ActivitySubmissionsResponse>(submissionsQueryKey, (current) => {
        if (!current || !reviewedSubmissionId) {
          return current;
        }

        return {
          ...current,
          submittedStudents: current.submittedStudents.map((student) =>
            student.submissionId === reviewedSubmissionId
              ? {
                ...student,
                ...review,
              }
              : student),
        };
      });
      await queryClient.invalidateQueries({
        queryKey: submissionsQueryKey,
      });
    },
    onError: (error: Error) => {
      setPopupState({
        open: true,
        title: 'Unable to save review',
        message: error.message || 'Please try again.',
        variant: 'error',
      });
    },
  });

  const payload = submissionsQuery.data;
  const item = payload?.item ?? payload?.activity;
  const itemSubmissionType = payload?.item?.submissionType ?? payload?.activity.activityType ?? 'text';
  const previewableAttachments = useMemo(
    () => selectedStudent?.attachments.filter(isPreviewableAttachment) ?? [],
    [selectedStudent],
  );
  const activePreviewAttachment =
    previewableAttachments.find((attachment) => attachment.id === selectedAttachmentId)
    ?? previewableAttachments[0]
    ?? null;
  const activeImage =
    activePreviewAttachment && isImageAttachment(activePreviewAttachment)
      ? activePreviewAttachment
      : null;
  const activePdf =
    activePreviewAttachment && isPdfAttachment(activePreviewAttachment)
      ? activePreviewAttachment
      : null;
  const activeImageNotes = activeImage
    ? imageNotes.filter((note) => note.attachmentId === activeImage.id)
    : [];
  const activeImageDrawings = activeImage
    ? imageDrawings.filter((drawing) => drawing.attachmentId === activeImage.id)
    : [];
  const submittedStudents = payload?.submittedStudents ?? [];
  const totalSubmissionPages = Math.max(1, Math.ceil(submittedStudents.length / SUBMISSIONS_PER_PAGE));
  const activeSubmissionPage = Math.min(submissionPage, totalSubmissionPages);
  const firstSubmissionIndex = submittedStudents.length === 0
    ? 0
    : (activeSubmissionPage - 1) * SUBMISSIONS_PER_PAGE;
  const visibleSubmittedStudents = submittedStudents.slice(
    firstSubmissionIndex,
    firstSubmissionIndex + SUBMISSIONS_PER_PAGE,
  );
  const lastSubmissionIndex = Math.min(firstSubmissionIndex + visibleSubmittedStudents.length, submittedStudents.length);
  const activeSelectedSubmissionId = selectedSubmissionId || selectedStudent?.submissionId || '';
  const selectedStudentIndex = activeSelectedSubmissionId
    ? submittedStudents.findIndex((student) => student.submissionId === activeSelectedSubmissionId)
    : -1;
  const previousStudent = selectedStudentIndex > 0
    ? submittedStudents[selectedStudentIndex - 1]
    : null;
  const nextStudent = selectedStudentIndex >= 0 && selectedStudentIndex < submittedStudents.length - 1
    ? submittedStudents[selectedStudentIndex + 1]
    : null;
  const selectedStudentPosition = selectedStudentIndex >= 0 ? selectedStudentIndex + 1 : 0;

  function openReviewModal(student: SubmittedStudent) {
    setSelectedStudent(student);
    setSelectedSubmissionId(student.submissionId);
    setReviewScore(student.reviewScore === null ? '' : String(student.reviewScore));
    setReviewComment(student.reviewComment);
    setTextHighlights(student.textHighlights ?? []);
    setImageNotes(student.imageNotes ?? []);
    setImageDrawings(student.imageDrawings ?? []);
    setSelectedAttachmentId(student.attachments.find(isPreviewableAttachment)?.id ?? '');
    setActiveImageTool('note');
    setDraftImageNote(null);
    setDraftImageText('');
    setDraftDrawingPoints([]);
    setIsDrawingImage(false);
    setDraggedImageNote(null);
  }

  function showAdjacentSubmission(student: SubmittedStudent | null) {
    if (!student || reviewMutation.isPending) {
      return;
    }

    openReviewModal(student);
  }

  function goToSubmissionPage(nextPage: number) {
    setSubmissionPage(Math.max(1, Math.min(totalSubmissionPages, nextPage)));
  }

  function closeReviewModal() {
    if (reviewMutation.isPending) {
      return;
    }

    setSelectedStudent(null);
    setSelectedSubmissionId('');
    setDraftImageNote(null);
    setDraftImageText('');
    setDraftDrawingPoints([]);
    setIsDrawingImage(false);
    setDraggedImageNote(null);
  }

  function addSelectedTextHighlight() {
    const selectedText = window.getSelection()?.toString().trim() ?? '';

    if (!selectedText) {
      setPopupState({
        open: true,
        title: 'No text selected',
        message: 'Select words in the response first, then click highlight.',
        variant: 'error',
      });
      return;
    }

    setTextHighlights((current) => [
      ...current,
      {
        id: createReviewId(),
        text: selectedText,
        color: '#fde68a',
      },
    ]);
    window.getSelection()?.removeAllRanges();
  }

  function getImageStagePoint(event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) {
    const imageStage = imageStageRef.current;

    if (!imageStage) {
      return null;
    }

    const rect = imageStage.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function handleImageClick(event: MouseEvent<HTMLDivElement>) {
    if (activeImageTool !== 'note') {
      return;
    }

    const point = getImageStagePoint(event);

    if (!point) {
      return;
    }

    setDraftImageNote(point);
    setDraftImageText('');
  }

  function moveImageNote(
    noteId: string,
    event: PointerEvent<HTMLDivElement>,
    offset = { x: 0, y: 0 },
  ) {
    const point = getImageStagePoint(event);

    if (!point) {
      return;
    }

    setImageNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? {
            ...note,
            x: Math.max(0, Math.min(1, point.x + offset.x)),
            y: Math.max(0, Math.min(1, point.y + offset.y)),
          }
          : note,
      ),
    );
  }

  function beginImageNoteDrag(noteId: string, event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getImageStagePoint(event);
    const note = imageNotes.find((entry) => entry.id === noteId);
    const offset = point && note
      ? {
        x: note.x - point.x,
        y: note.y - point.y,
      }
      : {
        x: 0,
        y: 0,
      };

    setDraggedImageNote({ id: noteId, offsetX: offset.x, offsetY: offset.y });
    moveImageNote(noteId, event, offset);
  }

  function continueImageNoteDrag(noteId: string, event: PointerEvent<HTMLDivElement>) {
    if (draggedImageNote?.id !== noteId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    moveImageNote(noteId, event, {
      x: draggedImageNote.offsetX,
      y: draggedImageNote.offsetY,
    });
  }

  function endImageNoteDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDraggedImageNote(null);
  }

  function beginImageDrawing(event: PointerEvent<HTMLDivElement>) {
    if (activeImageTool !== 'draw' || !activeImage) {
      return;
    }

    const point = getImageStagePoint(event);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraftImageNote(null);
    setIsDrawingImage(true);
    setDraftDrawingPoints([point]);
  }

  function continueImageDrawing(event: PointerEvent<HTMLDivElement>) {
    if (!isDrawingImage || activeImageTool !== 'draw') {
      return;
    }

    const point = getImageStagePoint(event);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDraftDrawingPoints((current) => {
      const lastPoint = current[current.length - 1];

      if (
        lastPoint
        && Math.abs(lastPoint.x - point.x) < 0.0025
        && Math.abs(lastPoint.y - point.y) < 0.0025
      ) {
        return current;
      }

      return current.length >= 500 ? current : [...current, point];
    });
  }

  function finishImageDrawing(event: PointerEvent<HTMLDivElement>) {
    if (!isDrawingImage) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDrawingImage(false);

    if (!activeImage || draftDrawingPoints.length < 2) {
      setDraftDrawingPoints([]);
      return;
    }

    setImageDrawings((current) => [
      ...current,
      {
        id: createReviewId(),
        attachmentId: activeImage.id,
        points: draftDrawingPoints,
        color: drawingColor,
        width: drawingWidth,
      },
    ]);
    setDraftDrawingPoints([]);
  }

  function addImageNote() {
    if (!activeImage || !draftImageNote || !draftImageText.trim()) {
      return;
    }

    setImageNotes((current) => [
      ...current,
      {
        id: createReviewId(),
        attachmentId: activeImage.id,
        x: draftImageNote.x,
        y: draftImageNote.y,
        text: draftImageText.trim(),
        color: '#facc15',
      },
    ]);
    setDraftImageNote(null);
    setDraftImageText('');
  }

  function removeLastActiveImageDrawing() {
    if (!activeImage) {
      return;
    }

    setImageDrawings((current) => {
      let lastIndex = -1;

      for (let index = current.length - 1; index >= 0; index -= 1) {
        if (current[index].attachmentId === activeImage.id) {
          lastIndex = index;
          break;
        }
      }

      if (lastIndex < 0) {
        return current;
      }

      return current.filter((_, index) => index !== lastIndex);
    });
  }

  function clearActiveImageDrawings() {
    if (!activeImage) {
      return;
    }

    setImageDrawings((current) => current.filter((drawing) => drawing.attachmentId !== activeImage.id));
    setDraftDrawingPoints([]);
  }

  if (!activeUser || isError) {
    return null;
  }

  if (!submissionsQuery.isLoading && submissionsQuery.isError) {
    return <Navigate to={`/faculty/subjects/${subjectId}`} replace />;
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
      pageEyebrow={`${itemKind === 'assignment' ? 'Assignment' : 'Activity'} submissions`}
      pageTitle={item?.title ?? `${itemKind === 'assignment' ? 'Assignment' : 'Activity'} submissions`}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[1.65rem] border border-[#b2c3d1] bg-[linear-gradient(180deg,rgba(212,222,233,0.97)_0%,rgba(201,212,225,0.95)_100%)] px-5 py-5 shadow-[0_10px_22px_rgba(27,46,70,0.08)]">
          {submissionsQuery.isLoading ? (
            <p className="text-fluid-md text-[#6b8198]">Loading submissions...</p>
          ) : payload && item ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/faculty/subjects/${subjectId}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  Back to subject
                </button>

                <p className="mt-4 text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                  {payload.subject.title} - {payload.subject.code}
                </p>
                <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.04em] text-[#173b70]">
                  {item.title}
                </h1>
              </div>

              <div className="grid min-w-[15rem] gap-3 rounded-[1.2rem] bg-[linear-gradient(180deg,#365678_0%,#2d4868_100%)] px-4 py-4 text-white shadow-[0_10px_20px_rgba(27,46,70,0.12)]">
                <div className="flex items-center gap-2 text-[#d5e2ef]">
                  <FiCheckCircle className="h-4 w-4" />
                  <p className="text-fluid-xs uppercase tracking-[0.16em]">Submission summary</p>
                </div>
                <p className="text-fluid-lg font-semibold">
                  {item.submittedCount} of {item.totalStudents} students
                </p>
                <p className="text-fluid-sm text-[#d5e2ef]">
                  Deadline: {formatCalendarDate(item.dueDate)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {payload && item ? (
          <section className="mt-5 rounded-[1.55rem] border border-[#b4c6d4] bg-[linear-gradient(180deg,rgba(209,220,231,0.95)_0%,rgba(198,210,223,0.93)_100%)] p-4 shadow-[0_10px_22px_rgba(27,46,70,0.08)]">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiUsers className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Submitted</p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">{item.submittedCount}</p>
              </div>

              <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiClock className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Pending</p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                  {Math.max(item.totalStudents - item.submittedCount, 0)}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiFileText className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Output type</p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                  {itemSubmissionType === 'file' ? 'File upload' : 'Text only'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              {payload.submittedStudents.length > 0 ? (
                <div className="overflow-hidden rounded-[1.15rem] border border-[#b4c6d4] bg-[rgba(232,239,246,0.76)] shadow-[0_8px_18px_rgba(27,46,70,0.06)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-[68rem] w-full border-collapse text-left">
                      <thead className="bg-[linear-gradient(180deg,#dce7f0_0%,#d1dde8_100%)]">
                        <tr className="border-b border-[#b8c8d6] text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#607790]">
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Section</th>
                          <th className="px-4 py-3">Submitted</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Attachments</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c3d0dc]">
                        {visibleSubmittedStudents.map((student) => (
                          <tr
                            key={student.submissionId}
                            className="bg-[rgba(220,230,240,0.72)] transition hover:bg-[rgba(232,239,246,0.96)]"
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="min-w-0">
                                <p className="truncate text-fluid-sm font-semibold text-[#173b70]">{student.fullName}</p>
                                <p className="mt-1 max-w-[16rem] truncate text-fluid-xs text-[#607790]">@{student.username}</p>
                                <p className="mt-1 max-w-[18rem] truncate text-fluid-xs text-[#2f78bc]">{student.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-fluid-sm font-medium text-[#48617d]">
                              {student.section}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span className="whitespace-nowrap rounded-full border border-[#b7c8d6] bg-[rgba(241,246,250,0.88)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                                {formatDateTime(student.submittedAt)}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span className="whitespace-nowrap rounded-full border border-[#b7c8d6] bg-[rgba(241,246,250,0.88)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                                {student.submissionType === 'file' ? 'File upload' : 'Text only'}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top text-fluid-sm font-semibold text-[#173b70]">
                              {student.attachmentCount}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {student.reviewScore !== null ? (
                                <span className="whitespace-nowrap rounded-full border border-[#bce8cf] bg-[#effbf4] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#12815a]">
                                  {student.reviewScore}
                                </span>
                              ) : (
                                <span className="text-fluid-sm text-[#7088a1]">Not scored</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span className="whitespace-nowrap rounded-full border border-[#bce8cf] bg-[#effbf4] px-3 py-1 text-fluid-2xs font-semibold text-[#12815a]">
                                Submitted
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top text-right">
                              <button
                                type="button"
                                onClick={() => openReviewModal(student)}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3.5 py-2 text-fluid-sm font-semibold text-white transition hover:brightness-105"
                              >
                                <FiEye className="h-4 w-4" />
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[#b8c8d6] bg-[rgba(216,227,236,0.84)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-fluid-sm font-medium text-[#607790]">
                      Showing {firstSubmissionIndex + 1}-{lastSubmissionIndex} of {submittedStudents.length}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToSubmissionPage(activeSubmissionPage - 1)}
                        disabled={activeSubmissionPage === 1}
                        className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#48617d] transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiArrowLeft className="h-3.5 w-3.5" />
                        Previous
                      </button>
                      <span className="rounded-full border border-[#b7c8d6] bg-[rgba(241,246,250,0.9)] px-3 py-2 text-fluid-sm font-semibold text-[#173b70]">
                        Page {activeSubmissionPage} of {totalSubmissionPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToSubmissionPage(activeSubmissionPage + 1)}
                        disabled={activeSubmissionPage === totalSubmissionPages}
                        className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#48617d] transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <FiArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-[#b2c2d0] bg-[linear-gradient(180deg,#d2dde8_0%,#c7d4e0_100%)] px-6 py-10 text-center">
                  <p className="text-fluid-md font-semibold text-[#173b70]">No submissions yet</p>
                  <p className="mt-2 text-fluid-sm text-[#7088a1]">
                    This page will fill in once students start submitting this {itemKind}.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <Modal
        open={Boolean(selectedStudent)}
        title={selectedStudent ? `Review ${selectedStudent.fullName}` : 'Review submission'}
        description={
          selectedStudent && submittedStudents.length > 1
            ? `Submission ${selectedStudentPosition} of ${submittedStudents.length}. Preview the output, add comments or image notes, and save a score.`
            : 'Preview the submitted output, add comments or image notes, and save a score.'
        }
        onClose={closeReviewModal}
        panelClassName="max-w-[min(90vw,96rem)]"
        bodyClassName="max-h-[76vh] overflow-y-auto px-4 py-4 sm:px-6 lg:px-8"
        outsideControls={(
          <>
            <button
              type="button"
              onClick={() => showAdjacentSubmission(previousStudent)}
              disabled={!previousStudent || reviewMutation.isPending}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#b7c8d6] bg-[rgba(255,255,255,0.94)] text-[#2f78bc] shadow-[0_16px_34px_rgba(15,23,42,0.24)] transition hover:bg-white hover:text-[#1f5e96] disabled:cursor-not-allowed disabled:opacity-35 sm:h-12 sm:w-12"
              aria-label={previousStudent ? `Review previous submission from ${previousStudent.fullName}` : 'No previous submission'}
              title={previousStudent ? `Previous: ${previousStudent.fullName}` : 'No previous submission'}
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => showAdjacentSubmission(nextStudent)}
              disabled={!nextStudent || reviewMutation.isPending}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#b7c8d6] bg-[rgba(255,255,255,0.94)] text-[#2f78bc] shadow-[0_16px_34px_rgba(15,23,42,0.24)] transition hover:bg-white hover:text-[#1f5e96] disabled:cursor-not-allowed disabled:opacity-35 sm:h-12 sm:w-12"
              aria-label={nextStudent ? `Review next submission from ${nextStudent.fullName}` : 'No next submission'}
              title={nextStudent ? `Next: ${nextStudent.fullName}` : 'No next submission'}
            >
              <FiArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
        actions={(
          <>
            <button
              type="button"
              onClick={closeReviewModal}
              disabled={reviewMutation.isPending}
              className="inline-flex items-center justify-center rounded-full border border-[#b7c8d6] bg-white px-4 py-2 text-fluid-sm font-semibold text-[#48617d] transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending || !selectedStudent}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSave className="h-4 w-4" />
              {reviewMutation.isPending ? 'Saving...' : 'Save review'}
            </button>
          </>
        )}
      >
        {selectedStudent ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1.75fr)_20rem]">
            <div className="space-y-4">
              {selectedStudent.textContent ? (
                <div className="rounded-[1.15rem] border border-[#c1d0dc] bg-[rgba(255,255,255,0.78)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Text output</p>
                      <p className="mt-1 text-fluid-sm text-[#607b95]">Select words, then highlight them.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addSelectedTextHighlight}
                      className="inline-flex items-center gap-2 rounded-full border border-[#d5b957] bg-[#fff7c2] px-3 py-2 text-fluid-sm font-semibold text-[#816410] transition hover:bg-[#fff1a8]"
                    >
                      <FiEdit3 className="h-4 w-4" />
                      Highlight selected words
                    </button>
                  </div>
                  <p className="formatted-text mt-4 whitespace-pre-wrap rounded-[1rem] border border-[#d4e0ea] bg-white px-4 py-4 text-fluid-sm leading-[1.75] text-[#344d68]">
                    {splitTextWithHighlights(selectedStudent.textContent, textHighlights).map((piece, index) =>
                      piece.highlight ? (
                        <mark
                          key={`${piece.highlight.id}-${index}`}
                          className="rounded px-1"
                          style={{ backgroundColor: piece.highlight.color }}
                        >
                          {piece.text}
                        </mark>
                      ) : (
                        <span key={`plain-${index}`}>{piece.text}</span>
                      ))}
                  </p>

                  {textHighlights.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {textHighlights.map((highlight) => (
                        <button
                          key={highlight.id}
                          type="button"
                          onClick={() => setTextHighlights((current) =>
                            current.filter((entry) => entry.id !== highlight.id))}
                          className="inline-flex items-center gap-2 rounded-full border border-[#d5b957] bg-[#fff7c2] px-3 py-1.5 text-fluid-xs font-semibold text-[#816410]"
                        >
                          {highlight.text}
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedStudent.attachments.length > 0 ? (
                <div className="rounded-[1.15rem] border border-[#c1d0dc] bg-[rgba(255,255,255,0.78)] p-4">
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Submitted files</p>

                  {previewableAttachments.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {previewableAttachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => {
                              setSelectedAttachmentId(attachment.id);
                              setDraftImageNote(null);
                              setDraftDrawingPoints([]);
                              setIsDrawingImage(false);
                            }}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-fluid-sm font-semibold transition ${
                              activePreviewAttachment?.id === attachment.id
                                ? 'border-[#6eaad9] bg-[#eaf5ff] text-[#2f78bc]'
                                : 'border-[#d5e0ea] bg-white text-[#607b95] hover:bg-[#f4f8fb]'
                            }`}
                          >
                            {isPdfAttachment(attachment) ? (
                              <FiFileText className="h-4 w-4" />
                            ) : (
                              <FiImage className="h-4 w-4" />
                            )}
                            {attachment.name}
                          </button>
                        ))}
                      </div>

                      {activeImage ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-fluid-sm text-[#607b95]">
                              {activeImageTool === 'note'
                                ? 'Click the image to place a note. Drag saved notes to reposition them.'
                                : 'Draw directly on the image. Use undo or clear to revise your markings.'}
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                              <div className="inline-flex rounded-full border border-[#c1d0dc] bg-white p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveImageTool('note');
                                    setDraftDrawingPoints([]);
                                    setIsDrawingImage(false);
                                  }}
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-fluid-xs font-semibold transition ${
                                    activeImageTool === 'note'
                                      ? 'bg-[#eaf5ff] text-[#2f78bc]'
                                      : 'text-[#607b95] hover:bg-[#f4f8fb]'
                                  }`}
                                >
                                  <FiMove className="h-3.5 w-3.5" />
                                  Notes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveImageTool('draw');
                                    setDraftImageNote(null);
                                  }}
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-fluid-xs font-semibold transition ${
                                    activeImageTool === 'draw'
                                      ? 'bg-[#fee2e2] text-[#b42318]'
                                      : 'text-[#607b95] hover:bg-[#f4f8fb]'
                                  }`}
                                >
                                  <FiPenTool className="h-3.5 w-3.5" />
                                  Draw
                                </button>
                              </div>

                              {activeImageTool === 'draw' ? (
                                <>
                                  <div className="inline-flex items-center gap-1 rounded-full border border-[#c1d0dc] bg-white px-2 py-1">
                                    {['#ef4444', '#facc15', '#2563eb'].map((color) => (
                                      <button
                                        key={color}
                                        type="button"
                                        onClick={() => setDrawingColor(color)}
                                        className={`h-6 w-6 rounded-full border transition ${
                                          drawingColor === color ? 'border-[#173b70] ring-2 ring-[#6eaad9]' : 'border-white'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        aria-label={`Use ${color} drawing color`}
                                      />
                                    ))}
                                  </div>
                                  <label className="flex items-center gap-2 rounded-full border border-[#c1d0dc] bg-white px-3 py-1.5 text-fluid-xs font-semibold text-[#607b95]">
                                    Width
                                    <input
                                      type="range"
                                      min={2}
                                      max={10}
                                      value={drawingWidth}
                                      onChange={(event) => setDrawingWidth(Number(event.target.value))}
                                      className="w-20 accent-[#2f78bc]"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={removeLastActiveImageDrawing}
                                    disabled={activeImageDrawings.length === 0}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#c1d0dc] bg-white px-3 py-1.5 text-fluid-xs font-semibold text-[#607b95] transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-45"
                                  >
                                    <FiRotateCcw className="h-3.5 w-3.5" />
                                    Undo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={clearActiveImageDrawings}
                                    disabled={activeImageDrawings.length === 0}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#f0b8b8] bg-[#fff7f7] px-3 py-1.5 text-fluid-xs font-semibold text-[#b75353] transition hover:bg-[#fff0f0] disabled:cursor-not-allowed disabled:opacity-45"
                                  >
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                    Clear
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div
                            ref={imageStageRef}
                            role="button"
                            tabIndex={0}
                            onClick={handleImageClick}
                            onPointerDown={beginImageDrawing}
                            onPointerMove={continueImageDrawing}
                            onPointerUp={finishImageDrawing}
                            onPointerCancel={finishImageDrawing}
                            className={`relative mt-3 touch-none overflow-hidden rounded-[1rem] border border-[#c1d0dc] bg-black ${
                              activeImageTool === 'draw' ? 'cursor-crosshair' : 'cursor-copy'
                            }`}
                          >
                            <img
                              src={activeImage.dataUrl}
                              alt={activeImage.name}
                              className="max-h-[62vh] w-full select-none object-contain"
                              draggable={false}
                            />
                            <svg
                              className="pointer-events-none absolute inset-0 h-full w-full"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                            >
                              {activeImageDrawings.map((drawing) => (
                                <polyline
                                  key={drawing.id}
                                  points={drawing.points.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
                                  fill="none"
                                  stroke={drawing.color}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={drawing.width}
                                  vectorEffect="non-scaling-stroke"
                                />
                              ))}
                              {draftDrawingPoints.length > 1 ? (
                                <polyline
                                  points={draftDrawingPoints.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
                                  fill="none"
                                  stroke={drawingColor}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={drawingWidth}
                                  vectorEffect="non-scaling-stroke"
                                />
                              ) : null}
                            </svg>
                            {activeImageNotes.map((note) => (
                              <div
                                key={note.id}
                                onPointerDown={(event) => beginImageNoteDrag(note.id, event)}
                                onPointerMove={(event) => continueImageNoteDrag(note.id, event)}
                                onPointerUp={endImageNoteDrag}
                                onPointerCancel={endImageNoteDrag}
                                onClick={(event) => event.stopPropagation()}
                                className="absolute max-w-[14rem] -translate-x-1/2 -translate-y-full cursor-move touch-none rounded-[0.85rem] border border-[#b59b1d] bg-[#fff7c2] px-3 py-2 text-fluid-xs font-semibold text-[#6d5510] shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
                                style={{
                                  left: `${note.x * 100}%`,
                                  top: `${note.y * 100}%`,
                                }}
                              >
                                {note.text}
                              </div>
                            ))}
                            {draftImageNote ? (
                              <div
                                className="absolute w-[15rem] -translate-x-1/2 rounded-[0.85rem] border border-[#6eaad9] bg-white p-2 shadow-[0_12px_22px_rgba(0,0,0,0.18)]"
                                style={{
                                  left: `${draftImageNote.x * 100}%`,
                                  top: `${draftImageNote.y * 100}%`,
                                }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={draftImageText}
                                  onChange={(event) => setDraftImageText(event.target.value)}
                                  placeholder="Write note"
                                  className="w-full rounded-[0.65rem] border border-[#c1d0dc] px-3 py-2 text-fluid-sm font-semibold text-[#173b70] outline-none focus:border-[#6eaad9]"
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDraftImageNote(null);
                                      setDraftImageText('');
                                    }}
                                    className="rounded-full border border-[#c1d0dc] px-3 py-1 text-fluid-xs font-semibold text-[#607b95]"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={addImageNote}
                                    className="rounded-full border border-[#6eaad9] bg-[#2f78bc] px-3 py-1 text-fluid-xs font-semibold text-white"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {activePdf ? (
                        <div>
                          <p className="text-fluid-sm text-[#607b95]">PDF preview</p>
                          <div className="mt-3">
                            <PdfPreviewContent attachment={activePdf} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {selectedStudent.attachments.map((attachment) => (
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
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[1.15rem] border border-[#c1d0dc] bg-[rgba(255,255,255,0.78)] p-4">
                <label className="block text-fluid-sm font-semibold text-[#173b70]" htmlFor="review-score">
                  Score
                </label>
                <input
                  id="review-score"
                  type="text"
                  inputMode="decimal"
                  value={reviewScore}
                  onChange={(event) => setReviewScore(sanitizeScoreInput(event.target.value))}
                  placeholder="Add score"
                  className="mt-2 w-full rounded-[0.85rem] border border-[#b8c8d7] bg-white px-3 py-2 text-fluid-base font-semibold text-[#173b70] outline-none focus:border-[#6eaad9]"
                />
              </div>

              <div className="rounded-[1.15rem] border border-[#c1d0dc] bg-[rgba(255,255,255,0.78)] p-4">
                <label className="flex items-center gap-2 text-fluid-sm font-semibold text-[#173b70]" htmlFor="review-comment">
                  <FiMessageSquare className="h-4 w-4" />
                  Faculty comments
                </label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows={8}
                  placeholder="Write comments for this student..."
                  className="mt-2 w-full rounded-[0.85rem] border border-[#b8c8d7] bg-white px-3 py-2 text-fluid-sm leading-6 text-[#173b70] outline-none focus:border-[#6eaad9]"
                />
              </div>

              <div className="rounded-[1.15rem] border border-[#c1d0dc] bg-[rgba(255,255,255,0.78)] p-4">
                <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Saved image markup</p>
                {imageNotes.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {imageNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => setImageNotes((current) => current.filter((entry) => entry.id !== note.id))}
                        className="flex w-full items-center justify-between gap-3 rounded-[0.85rem] border border-[#d5b957] bg-[#fff7c2] px-3 py-2 text-left text-fluid-xs font-semibold text-[#816410]"
                      >
                        <span className="min-w-0 truncate">{note.text}</span>
                        <FiTrash2 className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-fluid-sm text-[#607b95]">No image notes yet.</p>
                )}

                <div className="mt-4 border-t border-[#c7d5df] pt-4">
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">Drawings</p>
                  {imageDrawings.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {imageDrawings.map((drawing, index) => (
                        <button
                          key={drawing.id}
                          type="button"
                          onClick={() => setImageDrawings((current) => current.filter((entry) => entry.id !== drawing.id))}
                          className="flex w-full items-center justify-between gap-3 rounded-[0.85rem] border border-[#f0b8b8] bg-[#fff7f7] px-3 py-2 text-left text-fluid-xs font-semibold text-[#9f3838]"
                        >
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: drawing.color }}
                            />
                            <span className="truncate">Drawing {index + 1}</span>
                          </span>
                          <FiTrash2 className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-fluid-sm text-[#607b95]">No drawings yet.</p>
                  )}
                </div>
              </div>
            </aside>
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
    </FacultyLayout>
  );
}

export default ActivitySubmissions;
