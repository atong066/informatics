import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiDownload,
  FiEye,
  FiHelpCircle,
  FiPlus,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { getStoredToken } from '../../lib/auth';

GlobalWorkerOptions.workerSrc = pdfWorker;

type AssessmentDetailsResponse = {
  subject: {
    id: string;
    title: string;
    code: string;
  };
  assessment: {
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
    status: string;
  };
  questions: Array<{
    id: string;
    questionType:
      | 'multiple-choice'
      | 'true-false'
      | 'matching-type'
      | 'fill-in-the-blanks'
      | 'essay';
    prompt: string;
    options: string[];
    answerKey: string;
    matchingPairs: Array<{
      id: string;
      prompt: string;
      match: string;
    }>;
    fillAnswers: string[];
    rubricCriteria: Array<{
      id: string;
      criterion: string;
      description: string;
      points: number;
    }>;
  }>;
};

type AssessmentQuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'matching-type'
  | 'fill-in-the-blanks'
  | 'essay';

type MatchingPairDraft = {
  id: string;
  prompt: string;
  match: string;
};

type RubricCriterionDraft = {
  id: string;
  criterion: string;
  description: string;
  points: string;
};

type QuestionFieldErrors = {
  questionType?: string;
  prompt?: string;
  options?: string;
  answerKey?: string;
  matchingPairs?: string;
  fillAnswers?: string;
  rubricCriteria?: string;
};

const questionTypeOptions: Array<{
  label: string;
  value: AssessmentQuestionType;
}> = [
  { label: 'Multiple choice', value: 'multiple-choice' },
  { label: 'True or false', value: 'true-false' },
  { label: 'Matching type', value: 'matching-type' },
  { label: 'Fill in the blanks', value: 'fill-in-the-blanks' },
  { label: 'Essay', value: 'essay' },
];

const questionTypeMetadata: Record<
  AssessmentQuestionType,
  {
    title: string;
    helper: string;
    badge: string;
    savedLabel: string;
  }
> = {
  'multiple-choice': {
    title: 'Add a multiple-choice question',
    helper: 'Create four options and select the correct answer.',
    badge: '4 options',
    savedLabel: 'Multiple choice',
  },
  'true-false': {
    title: 'Add a true-or-false question',
    helper: 'Use a statement prompt and mark whether it is true or false.',
    badge: 'True / False',
    savedLabel: 'True or false',
  },
  'matching-type': {
    title: 'Add a matching-type question',
    helper: 'Add at least two prompt-and-match pairs for students to connect.',
    badge: '2+ pairs',
    savedLabel: 'Matching type',
  },
  'fill-in-the-blanks': {
    title: 'Add a fill-in-the-blanks question',
    helper: 'Write the sentence or statement and add the accepted answer for each blank.',
    badge: 'Blank answers',
    savedLabel: 'Fill in the blanks',
  },
  essay: {
    title: 'Add an essay question',
    helper: 'Write the essay prompt and add rubric criteria for checking.',
    badge: 'Rubrics',
    savedLabel: 'Essay',
  },
};

function createTempId() {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyMatchingPair(): MatchingPairDraft {
  return {
    id: createTempId(),
    prompt: '',
    match: '',
  };
}

function createEmptyRubricCriterion(): RubricCriterionDraft {
  return {
    id: createTempId(),
    criterion: '',
    description: '',
    points: '5',
  };
}

function formatQuestionType(value: AssessmentQuestionType) {
  return questionTypeMetadata[value].savedLabel;
}

function createEmptyMultipleChoiceOptions() {
  return ['', '', '', ''];
}

function questionTypeBadgeTone(questionType: AssessmentQuestionType) {
  switch (questionType) {
    case 'essay':
      return 'border-[#d6c7f1] bg-[#f4effd] text-[#6f4db8]';
    case 'matching-type':
      return 'border-[#c8d9ec] bg-[#eef4fa] text-[#2f78bc]';
    case 'fill-in-the-blanks':
      return 'border-[#cde4d2] bg-[#eef8f0] text-[#2c7a4b]';
    case 'true-false':
      return 'border-[#f0dcc2] bg-[#fff4e7] text-[#b06b15]';
    default:
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
  }
}

function formatCalendarDate(value: string) {
  if (!value) {
    return 'No schedule';
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

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function PdfPreviewContent({ data }: { data: Uint8Array | null }) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderPdfPreview() {
      if (!data) {
        setPageImages([]);
        setErrorMessage(null);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const pdfDocument = await getDocument({ data }).promise;
        const nextPageImages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
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
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to render the PDF preview.',
          );
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
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#eef3f8_0%,#dde6ef_100%)] px-6 text-center">
        <div>
          <p className="text-fluid-lg font-semibold text-[#173b70]">Preparing preview...</p>
          <p className="mt-2 text-fluid-sm text-[#617d98]">
            Rendering the assessment pages for a cleaner in-app preview.
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#eef3f8_0%,#dde6ef_100%)] px-6 text-center">
        <div>
          <p className="text-fluid-lg font-semibold text-[#173b70]">Preview unavailable</p>
          <p className="mt-2 text-fluid-sm text-[#617d98]">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,#dbe4ed_0%,#cfd9e3_100%)] px-6 py-6">
      <div className="mx-auto flex max-w-[8.64rem] flex-col gap-6">
        {pageImages.map((pageImage, index) => (
          <figure
            key={`pdf-page-${index + 1}`}
            className="overflow-hidden rounded-[0.192rem] border border-[#bccbd8] bg-white p-4 shadow-[0_16px_36px_rgba(27,46,70,0.14)]"
          >
            <img
              src={pageImage}
              alt={`Assessment PDF page ${index + 1}`}
              className="w-full rounded-[0.112rem] border border-[#e0e7ef] bg-white"
            />
            <figcaption className="mt-3 text-center text-fluid-xs font-semibold uppercase tracking-[0.12em] text-[#6b8198]">
              Page {index + 1}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function AssessmentBuilder() {
  const { subjectId, assessmentId } = useParams();
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const fullName = [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName]
    .filter(Boolean)
    .join(' ');
  const [questionType, setQuestionType] = useState<AssessmentQuestionType>('multiple-choice');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>(
    createEmptyMultipleChoiceOptions(),
  );
  const [answerKeyValue, setAnswerKeyValue] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<MatchingPairDraft[]>([
    createEmptyMatchingPair(),
    createEmptyMatchingPair(),
  ]);
  const [fillAnswers, setFillAnswers] = useState<string[]>(['']);
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterionDraft[]>([
    createEmptyRubricCriterion(),
  ]);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState<Uint8Array | null>(null);
  const [fieldErrors, setFieldErrors] = useState<QuestionFieldErrors>({});
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

  const assessmentQuery = useQuery({
    queryKey: ['faculty-assessment-builder', subjectId, assessmentId],
    queryFn: async () => {
      const response = await fetch(`/api/faculty/subjects/${subjectId}/assessments/${assessmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: AssessmentDetailsResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load assessment details');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId && assessmentId),
  });

  function resetQuestionForm() {
    setQuestionType('multiple-choice');
    setQuestionPrompt('');
    setMultipleChoiceOptions(createEmptyMultipleChoiceOptions());
    setAnswerKeyValue('');
    setMatchingPairs([createEmptyMatchingPair(), createEmptyMatchingPair()]);
    setFillAnswers(['']);
    setRubricCriteria([createEmptyRubricCriterion()]);
    setFieldErrors({});
  }

  const answerKeyOptions = useMemo(
    () => {
      if (questionType === 'multiple-choice') {
        return multipleChoiceOptions.map((option, index) => ({
          label: option.trim()
            ? `Option ${String.fromCharCode(65 + index)} - ${option.trim()}`
            : `Option ${String.fromCharCode(65 + index)}`,
          value: String.fromCharCode(65 + index),
        }));
      }

      if (questionType === 'true-false') {
        return [
          { label: 'True', value: 'True' },
          { label: 'False', value: 'False' },
        ];
      }

      return [];
    },
    [questionType, multipleChoiceOptions],
  );

  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      const trimmedMultipleChoiceOptions = multipleChoiceOptions.map((option) => option.trim());
      const optionIndexByLetter: Record<string, number> = {
        A: 0,
        B: 1,
        C: 2,
        D: 3,
      };
      const options =
        questionType === 'multiple-choice'
          ? trimmedMultipleChoiceOptions
          : questionType === 'true-false'
            ? ['True', 'False']
            : [];
      const answerKey =
        questionType === 'multiple-choice'
          ? trimmedMultipleChoiceOptions[optionIndexByLetter[answerKeyValue] ?? -1] ?? ''
          : questionType === 'true-false'
            ? answerKeyValue
            : '';
      const nextMatchingPairs = matchingPairs.map((pair) => ({
        prompt: pair.prompt.trim(),
        match: pair.match.trim(),
      }));
      const nextFillAnswers = fillAnswers.map((answer) => answer.trim());
      const nextRubricCriteria = rubricCriteria.map((criterion) => ({
        criterion: criterion.criterion.trim(),
        description: criterion.description.trim(),
        points: Number(criterion.points || 0),
      }));

      const response = await fetch(
        `/api/faculty/subjects/${subjectId}/assessments/${assessmentId}/questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionType,
            prompt: questionPrompt.trim(),
            options,
            answerKey,
            matchingPairs: questionType === 'matching-type' ? nextMatchingPairs : [],
            fillAnswers: questionType === 'fill-in-the-blanks' ? nextFillAnswers : [],
            rubricCriteria: questionType === 'essay' ? nextRubricCriteria : [],
          }),
        },
      );

      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        throw {
          message: data.message || 'Failed to add question',
          errors: data.errors,
        };
      }

      return data;
    },
    onSuccess: async () => {
      resetQuestionForm();
      setPopupState({
        open: true,
        title: 'Question added',
        message: 'The assessment now includes the new question.',
        variant: 'success',
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['faculty-assessment-builder', subjectId, assessmentId],
        }),
        queryClient.invalidateQueries({ queryKey: ['faculty-subject-detail', subjectId] }),
      ]);
    },
    onError: (error: { message?: string; errors?: Record<string, string[]> }) => {
      setFieldErrors({
        questionType: error.errors?.questionType?.[0],
        prompt: error.errors?.prompt?.[0],
        options: error.errors?.options?.[0],
        answerKey: error.errors?.answerKey?.[0],
        matchingPairs: error.errors?.matchingPairs?.[0],
        fillAnswers: error.errors?.fillAnswers?.[0],
        rubricCriteria: error.errors?.rubricCriteria?.[0],
      });
      setPopupState({
        open: true,
        title: 'Unable to add question',
        message: error.message || 'Please review the question details and try again.',
        variant: 'error',
      });
    },
  });

  function handleSubmitQuestion() {
    const trimmedPrompt = questionPrompt.trim();
    const trimmedOptions = multipleChoiceOptions.map((option) => option.trim());
    const normalizedMatchingPairs = matchingPairs.map((pair) => ({
      prompt: pair.prompt.trim(),
      match: pair.match.trim(),
    }));
    const normalizedFillAnswers = fillAnswers.map((answer) => answer.trim()).filter(Boolean);
    const normalizedRubrics = rubricCriteria.map((criterion) => ({
      criterion: criterion.criterion.trim(),
      description: criterion.description.trim(),
      points: Number(criterion.points || 0),
    }));
    const nextErrors: QuestionFieldErrors = {};

    if (!trimmedPrompt) {
      nextErrors.prompt = 'Question prompt is required';
    }

    if (questionType === 'multiple-choice') {
      if (trimmedOptions.some((option) => !option)) {
        nextErrors.options = 'Complete all four options before saving';
      }

      if (!answerKeyValue) {
        nextErrors.answerKey = 'Select the correct answer';
      }
    }

    if (questionType === 'true-false' && !answerKeyValue) {
      nextErrors.answerKey = 'Choose whether the statement is true or false';
    }

    if (
      questionType === 'matching-type' &&
      (normalizedMatchingPairs.length < 2 ||
        normalizedMatchingPairs.some((pair) => !pair.prompt || !pair.match))
    ) {
      nextErrors.matchingPairs = 'Add at least two complete matching pairs';
    }

    if (questionType === 'fill-in-the-blanks' && normalizedFillAnswers.length === 0) {
      nextErrors.fillAnswers = 'Add at least one accepted answer for the blank';
    }

    if (
      questionType === 'essay' &&
      (normalizedRubrics.length === 0 ||
        normalizedRubrics.some((criterion) => !criterion.criterion || criterion.points <= 0))
    ) {
      nextErrors.rubricCriteria = 'Add at least one rubric criterion with points';
    }

    setFieldErrors(nextErrors);

    if (
      nextErrors.prompt ||
      nextErrors.options ||
      nextErrors.answerKey ||
      nextErrors.matchingPairs ||
      nextErrors.fillAnswers ||
      nextErrors.rubricCriteria
    ) {
      return;
    }

    addQuestionMutation.mutate();
  }

  function createAssessmentPdfDocument() {
    if (!payload || payload.questions.length === 0) {
      return null;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 54;
    const topMargin = 56;
    const bottomMargin = 54;
    const contentWidth = pageWidth - (marginX * 2);
    const lineHeight = 18;
    const optionIndent = 18;
    const optionFontSize = 10.5;
    const optionColumnGap = 28;
    const optionColumnWidth = ((contentWidth - optionIndent) - optionColumnGap) / 2;
    let y = topMargin;

    const startNewPage = () => {
      doc.addPage();
      y = topMargin;
    };

    const ensureSpace = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - bottomMargin) {
        startNewPage();
      }
    };

    const writeWrappedText = (
      text: string,
      x: number,
      currentY: number,
      maxWidth: number,
      fontStyle: 'normal' | 'bold' = 'normal',
      fontSize = 11,
    ) => {
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth) as string[];
      doc.text(lines, x, currentY);
      return currentY + (lines.length * lineHeight);
    };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(55, 80, 108);
    doc.text('Name: ________________________________', marginX, y);
    doc.text('Section: __________________', marginX + 230, y);
    doc.text('Score: __________', marginX + 405, y);

    y += 28;

    const instructionText = [
      'Instructions:',
      'Read each question carefully and follow the required response format.',
      'Write clearly and answer every item in order.',
    ].join(' ');
    y = writeWrappedText(instructionText, marginX, y, contentWidth, 'normal', 10.5);
    y += 14;

    const canRenderTwoColumnOptions = (options: string[]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(optionFontSize);
      return options.every((option, optionIndex) => {
        const optionText = `${String.fromCharCode(65 + optionIndex)}. ${option}`;
        return doc.getTextWidth(optionText) <= optionColumnWidth;
      });
    };

    payload.questions.forEach((question, questionIndex) => {
      const questionText = `${questionIndex + 1}. ${question.prompt}`;
      const questionLines = doc.splitTextToSize(questionText, contentWidth) as string[];

      if (question.questionType === 'multiple-choice' || question.questionType === 'true-false') {
        const options =
          question.questionType === 'true-false' && question.options.length === 0
            ? ['True', 'False']
            : question.options;
        const renderTwoColumnOptions = canRenderTwoColumnOptions(options);
        const optionLineCount = renderTwoColumnOptions
          ? Math.ceil(options.length / 2)
          : options.reduce((count, option, optionIndex) => {
              const optionText = `${String.fromCharCode(65 + optionIndex)}. ${option}`;
              const lines = doc.splitTextToSize(optionText, contentWidth - optionIndent) as string[];
              return count + lines.length;
            }, 0);
        const estimatedHeight = (questionLines.length * lineHeight) + (optionLineCount * lineHeight) + 28;

        ensureSpace(estimatedHeight);

        y = writeWrappedText(questionText, marginX, y, contentWidth, 'bold', 11.5);
        y += 4;

        if (renderTwoColumnOptions) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(optionFontSize);
          doc.setTextColor(55, 80, 108);
          const leftColumnX = marginX + optionIndent;
          const rightColumnX = leftColumnX + optionColumnWidth + optionColumnGap;

          for (let optionIndex = 0; optionIndex < options.length; optionIndex += 2) {
            const leftLabel = String.fromCharCode(65 + optionIndex);
            doc.text(`${leftLabel}. ${options[optionIndex]}`, leftColumnX, y);

            if (optionIndex + 1 < options.length) {
              const rightLabel = String.fromCharCode(65 + optionIndex + 1);
              doc.text(`${rightLabel}. ${options[optionIndex + 1]}`, rightColumnX, y);
            }

            y += lineHeight;
          }
        } else {
          options.forEach((option, optionIndex) => {
            const optionLabel = String.fromCharCode(65 + optionIndex);
            y = writeWrappedText(
              `${optionLabel}. ${option}`,
              marginX + optionIndent,
              y,
              contentWidth - optionIndent,
              'normal',
              optionFontSize,
            );
          });
        }

        y += 10;
        return;
      }

      if (question.questionType === 'matching-type') {
        const estimatedPairHeight = question.matchingPairs.reduce((total, pair, pairIndex) => {
          const leftLines = doc.splitTextToSize(`${pairIndex + 1}. ${pair.prompt}`, optionColumnWidth) as string[];
          const rightLines = doc.splitTextToSize(
            `${String.fromCharCode(65 + pairIndex)}. ${pair.match}`,
            optionColumnWidth,
          ) as string[];
          return total + (Math.max(leftLines.length, rightLines.length) * lineHeight);
        }, 0);

        ensureSpace((questionLines.length * lineHeight) + estimatedPairHeight + (lineHeight * 2) + 24);

        y = writeWrappedText(questionText, marginX, y, contentWidth, 'bold', 11.5);
        y += 4;

        const leftColumnX = marginX + optionIndent;
        const rightColumnX = leftColumnX + optionColumnWidth + optionColumnGap;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(98, 121, 144);
        doc.text('Column A', leftColumnX, y);
        doc.text('Column B', rightColumnX, y);
        y += lineHeight;

        question.matchingPairs.forEach((pair, pairIndex) => {
          const leftLines = doc.splitTextToSize(`${pairIndex + 1}. ${pair.prompt}`, optionColumnWidth) as string[];
          const rightLines = doc.splitTextToSize(
            `${String.fromCharCode(65 + pairIndex)}. ${pair.match}`,
            optionColumnWidth,
          ) as string[];
          const rowHeight = Math.max(leftLines.length, rightLines.length) * lineHeight;

          ensureSpace(rowHeight + 4);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(optionFontSize);
          doc.setTextColor(55, 80, 108);
          doc.text(leftLines, leftColumnX, y);
          doc.text(rightLines, rightColumnX, y);
          y += rowHeight;
        });

        y += 10;
        return;
      }

      if (question.questionType === 'fill-in-the-blanks') {
        const blankCount = Math.max(question.fillAnswers.length, 1);
        ensureSpace((questionLines.length * lineHeight) + (blankCount * lineHeight) + 28);

        y = writeWrappedText(questionText, marginX, y, contentWidth, 'bold', 11.5);
        y += 8;

        for (let blankIndex = 0; blankIndex < blankCount; blankIndex += 1) {
          ensureSpace(lineHeight + 4);
          doc.setDrawColor(135, 156, 177);
          doc.line(marginX + optionIndent, y + 2, pageWidth - marginX, y + 2);
          y += lineHeight;
        }

        y += 10;
        return;
      }

      const responseLineCount = 6;
      ensureSpace((questionLines.length * lineHeight) + (responseLineCount * lineHeight) + 34);

      y = writeWrappedText(questionText, marginX, y, contentWidth, 'bold', 11.5);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(55, 80, 108);
      doc.text('Answer:', marginX + optionIndent, y);
      y += 10;

      for (let responseIndex = 0; responseIndex < responseLineCount; responseIndex += 1) {
        ensureSpace(lineHeight + 4);
        doc.setDrawColor(135, 156, 177);
        doc.line(marginX + optionIndent, y + 2, pageWidth - marginX, y + 2);
        y += lineHeight;
      }

      y += 12;
    });

    const totalPages = doc.getNumberOfPages();

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      doc.setPage(pageIndex);
      doc.setDrawColor(208, 219, 230);
      doc.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(98, 121, 144);
      doc.text(
        `${payload.assessment.title} | ${payload.subject.code}`,
        marginX,
        pageHeight - 20,
      );
      doc.text(
        `Page ${pageIndex} of ${totalPages}`,
        pageWidth - marginX,
        pageHeight - 20,
        { align: 'right' },
      );
    }

    const fileName = sanitizeFileName(
      `${payload.subject.code}-${payload.assessment.title}-assessment`,
    );
    
    return {
      doc,
      fileName: `${fileName || 'assessment'}.pdf`,
    };
  }

  function handleExportPdf() {
    const pdfDocument = createAssessmentPdfDocument();

    if (!pdfDocument) {
      return;
    }

    pdfDocument.doc.save(pdfDocument.fileName);
  }

  function closePdfPreviewModal() {
    setPdfPreviewData(null);
    setIsPdfPreviewOpen(false);
  }

  function handleViewPdf() {
    const pdfDocument = createAssessmentPdfDocument();

    if (!pdfDocument) {
      return;
    }

    try {
      const pdfArrayBuffer = pdfDocument.doc.output('arraybuffer');
      setPdfPreviewData(new Uint8Array(pdfArrayBuffer));
      setIsPdfPreviewOpen(true);
    } catch (error) {
      setPopupState({
        open: true,
        title: 'Unable to preview PDF',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  if (!activeUser || isError) {
    return null;
  }

  if (!assessmentQuery.isLoading && assessmentQuery.isError) {
    return <Navigate to={`/faculty/subjects/${subjectId}`} replace />;
  }

  const payload = assessmentQuery.data;

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Assessment builder"
      pageTitle={payload?.assessment.title ?? 'Assessment builder'}
    >
      <div className="mx-auto w-full max-w-[14.4rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[0.264rem] border border-[#b2c3d1] bg-[linear-gradient(180deg,rgba(212,222,233,0.97)_0%,rgba(201,212,225,0.95)_100%)] px-5 py-5 shadow-[0_10px_22px_rgba(27,46,70,0.08)]">
          {assessmentQuery.isLoading ? (
            <p className="text-fluid-md text-[#6b8198]">Loading assessment builder...</p>
          ) : payload ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/faculty/subjects/${subjectId}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                  >
                    <FiArrowLeft className="h-3.5 w-3.5" />
                    Back to assessments
                  </button>
                  <button
                    type="button"
                    onClick={handleViewPdf}
                    disabled={payload.questions.length === 0}
                    className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiEye className="h-3.5 w-3.5" />
                    View PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={payload.questions.length === 0}
                    className="inline-flex items-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-3 py-1.5 text-fluid-sm font-semibold text-white shadow-[0_8px_16px_rgba(41,124,198,0.14)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiDownload className="h-3.5 w-3.5" />
                    Export PDF
                  </button>
                </div>

                <p className="mt-4 text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                  {payload.subject.title} | {payload.subject.code}
                </p>
                <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.04em] text-[#173b70]">
                  {payload.assessment.title}
                </h1>
                <p className="formatted-text mt-2 max-w-3xl text-fluid-md leading-[1.65] text-[#5e7891]">
                  {payload.assessment.detail}
                </p>
              </div>

              <div className="grid min-w-[2.4rem] gap-3 rounded-[0.192rem] bg-[linear-gradient(180deg,#365678_0%,#2d4868_100%)] px-4 py-4 text-white shadow-[0_10px_20px_rgba(27,46,70,0.12)]">
                <div className="flex items-center gap-2 text-[#d5e2ef]">
                  <FiClipboard className="h-4 w-4" />
                  <p className="text-fluid-xs uppercase tracking-[0.16em]">Assessment summary</p>
                </div>
                <p className="text-fluid-lg font-semibold">
                  {formatAssessmentType(payload.assessment.assessmentType)}
                </p>
                <p className="text-fluid-sm text-[#d5e2ef]">
                  Scheduled: {formatCalendarDate(payload.assessment.schedule)}
                </p>
                <p className="text-fluid-sm text-[#d5e2ef]">
                  Section: {payload.assessment.targetSectionLabel}
                </p>
                <p className="text-fluid-sm text-[#d5e2ef]">
                  Time: {formatAssessmentWindow(payload.assessment.startTime, payload.assessment.endTime)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {payload ? (
          <section className="mt-5 rounded-[0.248rem] border border-[#b4c6d4] bg-[linear-gradient(180deg,rgba(209,220,231,0.95)_0%,rgba(198,210,223,0.93)_100%)] p-4 shadow-[0_10px_22px_rgba(27,46,70,0.08)]">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[0.192rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiCheckCircle className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                    Status
                  </p>
                </div>
                <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(payload.assessment.status)}`}>
                  {payload.assessment.status}
                </span>
              </div>

              <div className="rounded-[0.192rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiHelpCircle className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                    Questions
                  </p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                  {payload.assessment.questionCount}
                </p>
              </div>

              <div className="rounded-[0.192rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
                <div className="flex items-center gap-2 text-[#2f78bc]">
                  <FiClock className="h-4 w-4" />
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                    Schedule
                  </p>
                </div>
                <p className="mt-3 text-fluid-xl font-semibold text-[#173b70]">
                  {formatCalendarDate(payload.assessment.schedule)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div className="rounded-[0.208rem] border border-[#b3c4d2] bg-[linear-gradient(180deg,#d3dee8_0%,#c9d5e0_100%)] px-5 py-5 shadow-[0_8px_18px_rgba(27,46,70,0.07)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Question form
                    </p>
                    <h2 className="mt-2 text-fluid-xl font-semibold text-[#173b70]">
                      {questionTypeMetadata[questionType].title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-fluid-sm leading-[1.65] text-[#6b8198]">
                      {questionTypeMetadata[questionType].helper}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                    {questionTypeMetadata[questionType].badge}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="question-type">
                      Question type
                    </label>
                    <CustomSelect
                      id="question-type"
                      options={questionTypeOptions}
                      placeholder="Select the question type"
                      value={questionType}
                      onChange={(value) => {
                        setQuestionType(value as AssessmentQuestionType);
                        setAnswerKeyValue('');
                        setFieldErrors((current) => ({
                          ...current,
                          questionType: undefined,
                          options: undefined,
                          answerKey: undefined,
                          matchingPairs: undefined,
                          fillAnswers: undefined,
                          rubricCriteria: undefined,
                        }));
                      }}
                      error={fieldErrors.questionType}
                      tone="muted"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="question-prompt">
                      Question prompt
                    </label>
                    <textarea
                      id="question-prompt"
                      value={questionPrompt}
                      onChange={(event) => {
                        setQuestionPrompt(event.target.value);
                        setFieldErrors((current) => ({ ...current, prompt: undefined }));
                      }}
                      rows={4}
                      placeholder="What should students answer?"
                      className={`w-full resize-none rounded-[0.16rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition ${
                        fieldErrors.prompt ? 'border-rose-300' : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                      }`}
                    />
                    {fieldErrors.prompt ? (
                      <p className="mt-2 text-fluid-xs font-medium text-rose-500">{fieldErrors.prompt}</p>
                    ) : null}
                  </div>

                  {questionType === 'multiple-choice' ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {multipleChoiceOptions.map((option, index) => {
                          const label = `Option ${String.fromCharCode(65 + index)}`;

                          return (
                            <div key={label}>
                              <label
                                className="mb-2 block text-fluid-base font-semibold text-[#173b70]"
                                htmlFor={`option-${index}`}
                              >
                                {label}
                              </label>
                              <input
                                id={`option-${index}`}
                                type="text"
                                value={option}
                                onChange={(event) => {
                                  setMultipleChoiceOptions((current) =>
                                    current.map((entry, entryIndex) =>
                                      entryIndex === index ? event.target.value : entry,
                                    ),
                                  );
                                  setFieldErrors((current) => ({
                                    ...current,
                                    options: undefined,
                                    answerKey: undefined,
                                  }));
                                }}
                                placeholder={`Write ${label.toLowerCase()}`}
                                className={`w-full rounded-[0.16rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                                  fieldErrors.options
                                    ? 'border-rose-300'
                                    : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {fieldErrors.options ? (
                        <p className="text-fluid-xs font-medium text-rose-500">{fieldErrors.options}</p>
                      ) : null}

                      <div>
                        <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="question-answer-key">
                          Answer key
                        </label>
                        <CustomSelect
                          id="question-answer-key"
                          options={answerKeyOptions}
                          placeholder="Select the correct option"
                          value={answerKeyValue}
                          onChange={(value) => {
                            setAnswerKeyValue(value);
                            setFieldErrors((current) => ({ ...current, answerKey: undefined }));
                          }}
                          error={fieldErrors.answerKey}
                          tone="muted"
                        />
                      </div>
                    </>
                  ) : null}

                  {questionType === 'true-false' ? (
                    <>
                      <div className="rounded-[0.16rem] border border-[#b8c8d7] bg-[rgba(216,226,235,0.8)] px-4 py-4">
                        <p className="text-fluid-sm font-semibold uppercase tracking-[0.12em] text-[#6d86a0]">
                          Options
                        </p>
                        <p className="mt-2 text-fluid-base text-[#37506c]">
                          Students will answer using <span className="font-semibold text-[#173b70]">True</span> or{' '}
                          <span className="font-semibold text-[#173b70]">False</span>.
                        </p>
                      </div>

                      {fieldErrors.options ? (
                        <p className="text-fluid-xs font-medium text-rose-500">{fieldErrors.options}</p>
                      ) : null}

                      <div>
                        <label className="mb-2 block text-fluid-base font-semibold text-[#173b70]" htmlFor="question-answer-key">
                          Correct answer
                        </label>
                        <CustomSelect
                          id="question-answer-key"
                          options={answerKeyOptions}
                          placeholder="Choose the correct answer"
                          value={answerKeyValue}
                          onChange={(value) => {
                            setAnswerKeyValue(value);
                            setFieldErrors((current) => ({ ...current, answerKey: undefined }));
                          }}
                          error={fieldErrors.answerKey}
                          tone="muted"
                        />
                      </div>
                    </>
                  ) : null}

                  {questionType === 'matching-type' ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-fluid-base font-semibold text-[#173b70]">Matching pairs</p>
                          <p className="mt-1 text-fluid-sm text-[#6b8198]">
                            Add the left-side prompt and the correct item it should match with.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMatchingPairs((current) => [...current, createEmptyMatchingPair()]);
                            setFieldErrors((current) => ({ ...current, matchingPairs: undefined }));
                          }}
                          className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-fluid-xs font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                        >
                          Add pair
                        </button>
                      </div>

                      <div className="space-y-3">
                        {matchingPairs.map((pair, index) => (
                          <div
                            key={pair.id}
                            className="rounded-[0.16rem] border border-[#b8c8d7] bg-[rgba(214,224,234,0.76)] p-4"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-fluid-sm font-semibold uppercase tracking-[0.12em] text-[#6d86a0]">
                                Pair {index + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setMatchingPairs((current) =>
                                    current.length > 2
                                      ? current.filter((entry) => entry.id !== pair.id)
                                      : current,
                                  );
                                }}
                                disabled={matchingPairs.length <= 2}
                                className="text-fluid-xs font-semibold text-[#6b8198] transition hover:text-[#2f78bc] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-fluid-sm font-semibold text-[#173b70]">
                                  Prompt
                                </label>
                                <input
                                  type="text"
                                  value={pair.prompt}
                                  onChange={(event) => {
                                    setMatchingPairs((current) =>
                                      current.map((entry) =>
                                        entry.id === pair.id ? { ...entry, prompt: event.target.value } : entry,
                                      ),
                                    );
                                    setFieldErrors((current) => ({ ...current, matchingPairs: undefined }));
                                  }}
                                  placeholder="Example: CPU"
                                  className={`w-full rounded-[0.16rem] border bg-white/95 px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                                    fieldErrors.matchingPairs
                                      ? 'border-rose-300'
                                      : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-fluid-sm font-semibold text-[#173b70]">
                                  Match
                                </label>
                                <input
                                  type="text"
                                  value={pair.match}
                                  onChange={(event) => {
                                    setMatchingPairs((current) =>
                                      current.map((entry) =>
                                        entry.id === pair.id ? { ...entry, match: event.target.value } : entry,
                                      ),
                                    );
                                    setFieldErrors((current) => ({ ...current, matchingPairs: undefined }));
                                  }}
                                  placeholder="Example: Processes instructions"
                                  className={`w-full rounded-[0.16rem] border bg-white/95 px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                                    fieldErrors.matchingPairs
                                      ? 'border-rose-300'
                                      : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {fieldErrors.matchingPairs ? (
                        <p className="text-fluid-xs font-medium text-rose-500">{fieldErrors.matchingPairs}</p>
                      ) : null}
                    </>
                  ) : null}

                  {questionType === 'fill-in-the-blanks' ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-fluid-base font-semibold text-[#173b70]">Accepted answers</p>
                          <p className="mt-1 text-fluid-sm text-[#6b8198]">
                            Add the answer or answers you will accept for the blank.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFillAnswers((current) => [...current, '']);
                            setFieldErrors((current) => ({ ...current, fillAnswers: undefined }));
                          }}
                          className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-fluid-xs font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                        >
                          Add answer
                        </button>
                      </div>

                      <div className="space-y-3">
                        {fillAnswers.map((answer, index) => (
                          <div key={`fill-answer-${index}`} className="flex items-center gap-3">
                            <input
                              type="text"
                              value={answer}
                              onChange={(event) => {
                                setFillAnswers((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? event.target.value : entry,
                                  ),
                                );
                                setFieldErrors((current) => ({ ...current, fillAnswers: undefined }));
                              }}
                              placeholder={`Accepted answer ${index + 1}`}
                              className={`w-full rounded-[0.16rem] border bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                                fieldErrors.fillAnswers
                                  ? 'border-rose-300'
                                  : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFillAnswers((current) =>
                                  current.length > 1
                                    ? current.filter((_, entryIndex) => entryIndex !== index)
                                    : current,
                                );
                              }}
                              disabled={fillAnswers.length <= 1}
                              className="shrink-0 text-fluid-xs font-semibold text-[#6b8198] transition hover:text-[#2f78bc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {fieldErrors.fillAnswers ? (
                        <p className="text-fluid-xs font-medium text-rose-500">{fieldErrors.fillAnswers}</p>
                      ) : null}
                    </>
                  ) : null}

                  {questionType === 'essay' ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-fluid-base font-semibold text-[#173b70]">Rubric criteria</p>
                          <p className="mt-1 text-fluid-sm text-[#6b8198]">
                            Add the criteria you will use to check the essay and assign points.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRubricCriteria((current) => [...current, createEmptyRubricCriterion()]);
                            setFieldErrors((current) => ({ ...current, rubricCriteria: undefined }));
                          }}
                          className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-fluid-xs font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                        >
                          Add rubric
                        </button>
                      </div>

                      <div className="space-y-3">
                        {rubricCriteria.map((criterion, index) => (
                          <div
                            key={criterion.id}
                            className="rounded-[0.16rem] border border-[#b8c8d7] bg-[rgba(214,224,234,0.76)] p-4"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-fluid-sm font-semibold uppercase tracking-[0.12em] text-[#6d86a0]">
                                Criterion {index + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setRubricCriteria((current) =>
                                    current.length > 1
                                      ? current.filter((entry) => entry.id !== criterion.id)
                                      : current,
                                  );
                                }}
                                disabled={rubricCriteria.length <= 1}
                                className="text-fluid-xs font-semibold text-[#6b8198] transition hover:text-[#2f78bc] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_1.44rem]">
                              <div>
                                <label className="mb-2 block text-fluid-sm font-semibold text-[#173b70]">
                                  Criterion
                                </label>
                                <input
                                  type="text"
                                  value={criterion.criterion}
                                  onChange={(event) => {
                                    setRubricCriteria((current) =>
                                      current.map((entry) =>
                                        entry.id === criterion.id
                                          ? { ...entry, criterion: event.target.value }
                                          : entry,
                                      ),
                                    );
                                    setFieldErrors((current) => ({ ...current, rubricCriteria: undefined }));
                                  }}
                                  placeholder="Example: Clarity of explanation"
                                  className={`w-full rounded-[0.16rem] border bg-white/95 px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                                    fieldErrors.rubricCriteria
                                      ? 'border-rose-300'
                                      : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-fluid-sm font-semibold text-[#173b70]">
                                  Points
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={criterion.points}
                                  onChange={(event) => {
                                    setRubricCriteria((current) =>
                                      current.map((entry) =>
                                        entry.id === criterion.id
                                          ? { ...entry, points: event.target.value }
                                          : entry,
                                      ),
                                    );
                                    setFieldErrors((current) => ({ ...current, rubricCriteria: undefined }));
                                  }}
                                  className={`w-full rounded-[0.16rem] border bg-white/95 px-4 py-3 text-fluid-base text-[#25456d] outline-none transition ${
                                    fieldErrors.rubricCriteria
                                      ? 'border-rose-300'
                                      : 'border-[#b8c8d7] focus:border-[#6eaad9]'
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="mb-2 block text-fluid-sm font-semibold text-[#173b70]">
                                Description
                              </label>
                              <textarea
                                value={criterion.description}
                                onChange={(event) => {
                                  setRubricCriteria((current) =>
                                    current.map((entry) =>
                                      entry.id === criterion.id
                                        ? { ...entry, description: event.target.value }
                                        : entry,
                                    ),
                                  );
                                }}
                                rows={3}
                                placeholder="Optional notes on how this criterion should be checked"
                                className="w-full resize-none rounded-[0.16rem] border border-[#b8c8d7] bg-white/95 px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition focus:border-[#6eaad9]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {fieldErrors.rubricCriteria ? (
                        <p className="text-fluid-xs font-medium text-rose-500">{fieldErrors.rubricCriteria}</p>
                      ) : null}
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSubmitQuestion}
                    disabled={addQuestionMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2 text-fluid-sm font-semibold text-white shadow-[0_8px_16px_rgba(41,124,198,0.14)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiPlus className="h-4 w-4" />
                    {addQuestionMutation.isPending ? 'Saving question...' : 'Add question'}
                  </button>
                </div>
              </div>

              <div className="rounded-[0.208rem] border border-[#b3c4d2] bg-[linear-gradient(180deg,#d3dee8_0%,#c9d5e0_100%)] px-5 py-5 shadow-[0_8px_18px_rgba(27,46,70,0.07)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Saved questions
                    </p>
                    <h2 className="mt-2 text-fluid-xl font-semibold text-[#173b70]">Current question bank</h2>
                  </div>
                  <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                    {payload.questions.length} total
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {payload.questions.length > 0 ? (
                    payload.questions.map((question, index) => (
                      <article
                        key={question.id}
                        className="rounded-[0.16rem] border border-[#bccbd7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-fluid-md font-semibold text-[#173b70]">
                            {index + 1}. {question.prompt}
                          </p>
                          <span
                            className={`shrink-0 rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${questionTypeBadgeTone(question.questionType)}`}
                          >
                            {formatQuestionType(question.questionType)}
                          </span>
                        </div>

                        {question.questionType === 'multiple-choice' || question.questionType === 'true-false' ? (
                          <div className="mt-4 grid gap-2">
                            {question.options.map((option, optionIndex) => {
                              const optionLabel = String.fromCharCode(65 + optionIndex);
                              const isAnswer = option === question.answerKey;

                              return (
                                <div
                                  key={`${question.id}-${optionLabel}`}
                                  className={`flex items-center justify-between gap-3 rounded-[0.152rem] border px-3 py-3 text-fluid-sm ${
                                    isAnswer
                                      ? 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]'
                                      : 'border-[#c3d2de] bg-[rgba(214,224,234,0.94)] text-[#37506c]'
                                  }`}
                                >
                                  <span className="font-medium">
                                    {question.questionType === 'multiple-choice'
                                      ? `${optionLabel}. ${option}`
                                      : option}
                                  </span>
                                  {isAnswer ? (
                                    <span className="rounded-full border border-[#bce8cf] bg-white/70 px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em]">
                                      Answer key
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {question.questionType === 'matching-type' ? (
                          <div className="mt-4 space-y-2">
                            {question.matchingPairs.map((pair, pairIndex) => (
                              <div
                                key={pair.id}
                                className="grid gap-3 rounded-[0.152rem] border border-[#c3d2de] bg-[rgba(214,224,234,0.94)] px-3 py-3 text-fluid-sm text-[#37506c] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                              >
                                <div>
                                  <p className="text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#6d86a0]">
                                    Prompt {pairIndex + 1}
                                  </p>
                                  <p className="mt-1 font-medium">{pair.prompt}</p>
                                </div>
                                <div>
                                  <p className="text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#6d86a0]">
                                    Match {pairIndex + 1}
                                  </p>
                                  <p className="mt-1 font-medium">{pair.match}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {question.questionType === 'fill-in-the-blanks' ? (
                          <div className="mt-4 rounded-[0.152rem] border border-[#c3d2de] bg-[rgba(214,224,234,0.94)] px-3 py-3">
                            <p className="text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#6d86a0]">
                              Accepted answers
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {question.fillAnswers.map((answer, answerIndex) => (
                                <span
                                  key={`${question.id}-fill-answer-${answerIndex}`}
                                  className="rounded-full border border-[#cde4d2] bg-[#eef8f0] px-3 py-1 text-fluid-xs font-semibold text-[#2c7a4b]"
                                >
                                  {answer}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {question.questionType === 'essay' ? (
                          <div className="mt-4 rounded-[0.152rem] border border-[#c3d2de] bg-[rgba(214,224,234,0.94)] px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#6d86a0]">
                                Rubric criteria
                              </p>
                              <span className="rounded-full border border-[#d6c7f1] bg-[#f4effd] px-2.5 py-1 text-fluid-2xs font-semibold text-[#6f4db8]">
                                {question.rubricCriteria.reduce((total, criterion) => total + criterion.points, 0)} pts
                              </span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {question.rubricCriteria.map((criterion) => (
                                <div
                                  key={criterion.id}
                                  className="rounded-[0.144rem] border border-[#d5dfea] bg-white/55 px-3 py-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="font-medium text-[#173b70]">{criterion.criterion}</p>
                                    <span className="rounded-full border border-[#d6c7f1] bg-[#f4effd] px-2.5 py-1 text-fluid-2xs font-semibold text-[#6f4db8]">
                                      {criterion.points} pts
                                    </span>
                                  </div>
                                  {criterion.description ? (
                                    <p className="mt-2 text-fluid-sm leading-[1.6] text-[#5e7891]">
                                      {criterion.description}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[0.224rem] border border-dashed border-[#b2c2d0] bg-[linear-gradient(180deg,#d2dde8_0%,#c7d4e0_100%)] px-6 py-10 text-center">
                      <p className="text-fluid-md font-semibold text-[#173b70]">No questions yet</p>
                      <p className="mt-2 text-fluid-sm text-[#7088a1]">
                        Start with the form on the left to build the assessment question bank.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <Modal
        open={isPdfPreviewOpen && Boolean(pdfPreviewData)}
        title="PDF Preview"
        description="Preview the assessment paper before downloading it."
        onClose={closePdfPreviewModal}
        panelClassName="max-w-[min(96vw,12.16rem)]"
        bodyClassName="h-[78vh] overflow-hidden bg-white p-0"
        actions={
          <button
            type="button"
            onClick={closePdfPreviewModal}
            className="rounded-2xl border border-[#ccd9e5] bg-white px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-[#f8fbfd]"
          >
            Close
          </button>
        }
      >
        <PdfPreviewContent data={pdfPreviewData} />
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

export default AssessmentBuilder;

