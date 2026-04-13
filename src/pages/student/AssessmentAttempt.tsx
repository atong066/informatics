import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiArrowLeft,
  FiClock,
  FiSend,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import CustomSelect from '../../components/CustomSelect';
import NotificationPopup from '../../components/NotificationPopup';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import StudentLayout from '../../layout/student/StudentLayout';
import { getStoredToken } from '../../lib/auth';

type AssessmentQuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'matching-type'
  | 'fill-in-the-blanks'
  | 'essay';

type AttemptResponse = {
  questionId: string;
  questionType: AssessmentQuestionType;
  answer: string;
  matchingAnswers: string[];
  isCorrect: boolean;
  requiresManualReview: boolean;
  awardedPoints: number;
  maxPoints: number;
};

type AttemptSummary = {
  id: string;
  status: string;
  score: number;
  totalPoints: number;
  pendingManualPoints: number;
  manualReviewPending: boolean;
  percentage: number;
  submittedAt: string;
  responses: AttemptResponse[];
};

type StudentAssessmentDetailsResponse = {
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
    canTake: boolean;
    availabilityLabel: string;
    status: string;
    attempt: AttemptSummary | null;
  };
  questions: Array<{
    id: string;
    questionType: AssessmentQuestionType;
    prompt: string;
    options: string[];
    matchingPairs: Array<{
      id: string;
      prompt: string;
      match: string;
    }>;
    matchingOptions: string[];
    rubricTotalPoints: number;
  }>;
};

type AssessmentResponseDraft = {
  answer: string;
  matchingAnswers: string[];
};

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

function formatAssessmentType(value: 'quiz' | 'quarter-exam') {
  return value === 'quarter-exam' ? 'Quarter exam' : 'Quiz';
}

function formatQuestionType(value: AssessmentQuestionType) {
  switch (value) {
    case 'multiple-choice':
      return 'Multiple choice';
    case 'true-false':
      return 'True or false';
    case 'matching-type':
      return 'Matching type';
    case 'fill-in-the-blanks':
      return 'Fill in the blanks';
    case 'essay':
      return 'Essay';
    default:
      return 'Question';
  }
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
    case 'Checked':
    case 'Available':
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
    case 'Pending review':
    case 'Submitted':
      return 'border-[#c8d9ec] bg-[#eef4fa] text-[#2f78bc]';
    case 'Scheduled':
    case 'Due soon':
      return 'border-[#f2d9bc] bg-[#fff5e8] text-[#b06b15]';
    case 'Closed':
      return 'border-[#ecd0d0] bg-[#fff2f2] text-[#b35a5a]';
    default:
      return 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]';
  }
}

function createEmptyDraft(question: StudentAssessmentDetailsResponse['questions'][number]) {
  return {
    answer: '',
    matchingAnswers: question.matchingPairs.map(() => ''),
  };
}

function getDraftForQuestion(
  question: StudentAssessmentDetailsResponse['questions'][number],
  drafts: Record<string, AssessmentResponseDraft>,
  attemptResponseByQuestionId: Map<string, AttemptResponse>,
) {
  const draft = drafts[question.id];

  if (draft) {
    return {
      answer: draft.answer,
      matchingAnswers:
        question.questionType === 'matching-type'
          ? question.matchingPairs.map((_, index) => draft.matchingAnswers[index] ?? '')
          : [],
    };
  }

  const attemptResponse = attemptResponseByQuestionId.get(question.id);

  if (attemptResponse) {
    return {
      answer: attemptResponse.answer ?? '',
      matchingAnswers:
        question.questionType === 'matching-type'
          ? question.matchingPairs.map(
            (_, index) => attemptResponse.matchingAnswers[index] ?? '',
          )
          : [],
    };
  }

  return createEmptyDraft(question);
}

function isQuestionAnswered(
  question: StudentAssessmentDetailsResponse['questions'][number],
  draft: AssessmentResponseDraft,
) {
  if (question.questionType === 'matching-type') {
    return draft.matchingAnswers.some((value) => value.trim().length > 0);
  }

  return draft.answer.trim().length > 0;
}

function getAttemptScoreSummary(attempt: AttemptSummary) {
  const autoCheckedTotal = Math.max(attempt.totalPoints - attempt.pendingManualPoints, 0);

  if (attempt.manualReviewPending) {
    return {
      label: autoCheckedTotal > 0 ? 'Auto-checked score' : 'Submission recorded',
      value:
        autoCheckedTotal > 0
          ? `${attempt.score} / ${autoCheckedTotal}`
          : 'Essay review pending',
      meta:
        attempt.pendingManualPoints > 0
          ? `${attempt.pendingManualPoints} point${attempt.pendingManualPoints === 1 ? '' : 's'} pending manual essay review`
          : 'Awaiting manual review',
    };
  }

  return {
    label: 'Final score',
    value: `${attempt.score} / ${attempt.totalPoints}`,
    meta: `${attempt.percentage.toFixed(1)}% checked`,
  };
}

function AssessmentAttempt() {
  const { subjectId, assessmentId } = useParams();
  const navigate = useNavigate();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const { activeUser, isError } = useCurrentStudent();
  const [responseDrafts, setResponseDrafts] = useState<Record<string, AssessmentResponseDraft>>({});
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
    queryKey: ['student-assessment', subjectId, assessmentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/student/subjects/${subjectId}/assessments/${assessmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = (await response.json()) as {
        message?: string;
        data?: StudentAssessmentDetailsResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load assessment details');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId && assessmentId),
  });

  const fullName = useMemo(
    () =>
      [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName]
        .filter(Boolean)
        .join(' '),
    [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName],
  );

  const attemptResponseByQuestionId = useMemo(
    () =>
      new Map(
        (assessmentQuery.data?.assessment.attempt?.responses ?? []).map((response) => [
          response.questionId,
          response,
        ]),
      ),
    [assessmentQuery.data?.assessment.attempt?.responses],
  );

  const answeredCount = useMemo(() => {
    if (!assessmentQuery.data || assessmentQuery.data.assessment.attempt) {
      return 0;
    }

    return assessmentQuery.data.questions.reduce((count, question) => {
      const draft = getDraftForQuestion(question, responseDrafts, attemptResponseByQuestionId);
      return count + (isQuestionAnswered(question, draft) ? 1 : 0);
    }, 0);
  }, [assessmentQuery.data, attemptResponseByQuestionId, responseDrafts]);

  const submitAssessmentMutation = useMutation({
    mutationFn: async () => {
      const payload = assessmentQuery.data;

      if (!payload) {
        throw new Error('Assessment details are not available');
      }

      const response = await fetch(
        `/api/student/subjects/${subjectId}/assessments/${assessmentId}/attempt`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            responses: payload.questions.map((question) => {
              const draft = getDraftForQuestion(
                question,
                responseDrafts,
                attemptResponseByQuestionId,
              );

              return {
                questionId: question.id,
                answer: draft.answer.trim(),
                matchingAnswers:
                  question.questionType === 'matching-type'
                    ? question.matchingPairs.map(
                      (_, index) => draft.matchingAnswers[index]?.trim() ?? '',
                    )
                    : [],
              };
            }),
          }),
        },
      );

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit assessment');
      }

      return data;
    },
    onSuccess: async (data) => {
      setPopupState({
        open: true,
        title: 'Assessment submitted',
        message:
          data.message
          || 'Your answers are saved. Objective items were checked automatically.',
        variant: 'success',
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['student-assessment', subjectId, assessmentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['student-subject-detail', subjectId],
        }),
      ]);
    },
    onError: (error: Error) => {
      setPopupState({
        open: true,
        title: 'Unable to submit assessment',
        message: error.message || 'Please try again in a moment.',
        variant: 'error',
      });
    },
  });

  if (!activeUser || isError) {
    return null;
  }

  if (!assessmentQuery.isLoading && assessmentQuery.isError) {
    return <Navigate to={`/student/subjects/${subjectId}`} replace />;
  }

  const payload = assessmentQuery.data;
  const scoreSummary = payload?.assessment.attempt
    ? getAttemptScoreSummary(payload.assessment.attempt)
    : null;

  function updateAnswer(questionId: string, answer: string) {
    setResponseDrafts((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? { answer: '', matchingAnswers: [] }),
        answer,
      },
    }));
  }

  function updateMatchingAnswer(questionId: string, index: number, value: string) {
    setResponseDrafts((current) => {
      const draft = current[questionId] ?? { answer: '', matchingAnswers: [] };
      const nextMatchingAnswers = [...draft.matchingAnswers];
      nextMatchingAnswers[index] = value;

      return {
        ...current,
        [questionId]: {
          ...draft,
          matchingAnswers: nextMatchingAnswers,
        },
      };
    });
  }

  function handleSubmitAssessment() {
    if (!payload || payload.assessment.attempt || !payload.assessment.canTake) {
      return;
    }

    const confirmed = window.confirm(
      'Finish this assessment now? Your answers will be submitted for checking and you will not be able to retake it.',
    );

    if (!confirmed) {
      return;
    }

    submitAssessmentMutation.mutate();
  }

  return (
    <StudentLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
    >
      <div className="mx-auto w-full max-w-[94rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[1.9rem] bg-[linear-gradient(180deg,#d9e4ee_0%,#ccd8e4_100%)] px-6 py-6 shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b8cad8]">
          {assessmentQuery.isLoading ? (
            <p className="text-fluid-md text-[#6b8198]">Loading assessment...</p>
          ) : payload ? (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/student/subjects/${subjectId}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(255,255,255,0.88)] px-3.5 py-2 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-white"
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  Back to subject
                </button>

                <p className="mt-4 text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                  {payload.subject.title} | {payload.subject.code}
                </p>
                <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.05em] text-[#173b70]">
                  {payload.assessment.title}
                </h1>
                <p className="mt-2 max-w-3xl text-fluid-md leading-[1.7] text-[#6b8198]">
                  {payload.assessment.detail || 'Review each question carefully before you submit your answers.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                    {formatCalendarDate(payload.assessment.schedule)}
                  </span>
                  <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                    {formatAssessmentType(payload.assessment.assessmentType)}
                  </span>
                  <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                    {payload.assessment.targetSectionLabel}
                  </span>
                  <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                    {formatAssessmentWindow(payload.assessment.startTime, payload.assessment.endTime)}
                  </span>
                </div>
              </div>

              <div className="min-w-[16rem] rounded-[1.5rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-5 py-4 text-white shadow-[0_1rem_2rem_rgba(27,46,70,0.18)]">
                <p className="text-fluid-2xs uppercase tracking-[0.18em] text-[#d5e2ef]">
                  Assessment status
                </p>
                <p className="mt-3 text-fluid-xl font-semibold">
                  {payload.assessment.attempt ? scoreSummary?.value : payload.assessment.questionCount}
                  {!payload.assessment.attempt ? ` question${payload.assessment.questionCount === 1 ? '' : 's'}` : ''}
                </p>
                <p className="mt-2 text-fluid-sm text-[#d5e2ef]">
                  {payload.assessment.attempt
                    ? scoreSummary?.meta
                    : payload.assessment.canTake
                      ? 'You can start and submit this assessment now.'
                      : payload.assessment.availabilityLabel}
                </p>
                <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(payload.assessment.status)}`}>
                  {payload.assessment.status}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        {payload ? (
          payload.assessment.attempt ? (
            <section className="mt-6 rounded-[1.8rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[1.35rem] shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b9ccda]">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)]">
                <div className="rounded-[1.35rem] border border-[#c2d2df] bg-[linear-gradient(180deg,#fefefe_0%,#f4f8fb_100%)] px-5 py-5 shadow-[0_.75rem_1.8rem_rgba(40,68,99,0.08)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                        Result summary
                      </p>
                      <h2 className="mt-2 text-fluid-xl font-semibold text-[#173b70]">
                        {scoreSummary?.label}
                      </h2>
                      <p className="mt-2 text-fluid-base leading-[1.65] text-[#6b8198]">
                        {payload.assessment.attempt.manualReviewPending
                          ? 'Objective items were checked automatically. Essay responses still need faculty review before your final grade is complete.'
                          : 'Your assessment has been checked. Review the saved responses below.'}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(payload.assessment.attempt.status)}`}>
                      {payload.assessment.attempt.status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                      <p className="text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                        Score
                      </p>
                      <p className="mt-2 text-fluid-xl font-semibold text-[#173b70]">
                        {scoreSummary?.value}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                      <p className="text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                        Submitted
                      </p>
                      <p className="mt-2 text-fluid-md font-semibold text-[#173b70]">
                        {formatDateTime(payload.assessment.attempt.submittedAt)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                      <p className="text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                        Coverage
                      </p>
                      <p className="mt-2 text-fluid-md font-semibold text-[#173b70]">
                        {payload.questions.length} question{payload.questions.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-[#c2d2df] bg-[linear-gradient(180deg,#fefefe_0%,#f4f8fb_100%)] px-5 py-5 shadow-[0_.75rem_1.8rem_rgba(40,68,99,0.08)]">
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                    Review notes
                  </p>
                  <div className="mt-4 space-y-3 text-fluid-base leading-[1.65] text-[#6b8198]">
                    <p className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                      Objective items are checked immediately after you submit.
                    </p>
                    <p className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                      Essay questions stay pending until your instructor reviews them manually.
                    </p>
                    <p className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                      Your score card in the subject page updates from the same saved attempt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {payload.questions.map((question, index) => {
                  const draft = getDraftForQuestion(
                    question,
                    responseDrafts,
                    attemptResponseByQuestionId,
                  );
                  const attemptResponse = attemptResponseByQuestionId.get(question.id) ?? null;

                  return (
                    <article
                      key={question.id}
                      className="rounded-[1.3rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_.8rem_1.9rem_rgba(40,68,99,0.1)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                            Question {index + 1}
                          </p>
                          <h3 className="mt-2 text-fluid-lg font-semibold text-[#173b70]">
                            {question.prompt}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                            {formatQuestionType(question.questionType)}
                          </span>
                          {attemptResponse ? (
                            <span className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${statusTone(attemptResponse.requiresManualReview ? 'Pending review' : attemptResponse.isCorrect ? 'Checked' : 'Closed')}`}>
                              {attemptResponse.requiresManualReview
                                ? 'Pending review'
                                : attemptResponse.isCorrect
                                  ? 'Correct'
                                  : 'Incorrect'}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {question.questionType === 'multiple-choice' || question.questionType === 'true-false' ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {question.options.map((option) => {
                            const isSelected = draft.answer === option;

                            return (
                              <div
                                key={option}
                                className={`rounded-[1rem] border px-4 py-3 text-fluid-base ${
                                  isSelected
                                    ? attemptResponse?.requiresManualReview
                                      ? 'border-[#c8d9ec] bg-[#eef4fa] text-[#2f78bc]'
                                      : attemptResponse?.isCorrect
                                        ? 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]'
                                        : 'border-[#ecd0d0] bg-[#fff2f2] text-[#b35a5a]'
                                    : 'border-[#cad8e3] bg-[rgba(255,255,255,0.88)] text-[#5d7690]'
                                }`}
                              >
                                {option}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {question.questionType === 'matching-type' ? (
                        <div className="mt-4 space-y-3">
                          {question.matchingPairs.map((pair, pairIndex) => (
                            <div
                              key={pair.id}
                              className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3"
                            >
                              <p className="text-fluid-sm font-semibold uppercase tracking-[0.14em] text-[#6d86a0]">
                                Prompt
                              </p>
                              <p className="mt-2 text-fluid-md font-semibold text-[#173b70]">
                                {pair.prompt}
                              </p>
                              <p className="mt-3 text-fluid-sm font-semibold uppercase tracking-[0.14em] text-[#6d86a0]">
                                Your answer
                              </p>
                              <p className="mt-2 text-fluid-base text-[#45627f]">
                                {draft.matchingAnswers[pairIndex] || 'No answer submitted'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {question.questionType === 'fill-in-the-blanks' ? (
                        <div className="mt-4 rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                          <p className="text-fluid-sm font-semibold uppercase tracking-[0.14em] text-[#6d86a0]">
                            Your answer
                          </p>
                          <p className="mt-2 text-fluid-md text-[#45627f]">
                            {draft.answer || 'No answer submitted'}
                          </p>
                        </div>
                      ) : null}

                      {question.questionType === 'essay' ? (
                        <div className="mt-4 space-y-3">
                          <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.14em] text-[#6d86a0]">
                              Your response
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-fluid-md leading-[1.7] text-[#45627f]">
                              {draft.answer || 'No answer submitted'}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                            <p className="text-fluid-sm font-semibold uppercase tracking-[0.14em] text-[#6d86a0]">
                              Rubric points
                            </p>
                            <p className="mt-2 text-fluid-md text-[#45627f]">
                              Up to {question.rubricTotalPoints} point{question.rubricTotalPoints === 1 ? '' : 's'} after manual review.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : payload.assessment.canTake ? (
            <section className="mt-6 rounded-[1.8rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[1.35rem] shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b9ccda]">
              <div className="flex flex-col gap-4 rounded-[1.35rem] border border-[#c2d2df] bg-[linear-gradient(180deg,#fefefe_0%,#f4f8fb_100%)] px-5 py-5 shadow-[0_.75rem_1.8rem_rgba(40,68,99,0.08)] lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6d86a0]">
                    Assessment in progress
                  </p>
                  <h2 className="mt-2 text-fluid-xl font-semibold text-[#173b70]">
                    Answer all items, then finish to check your exam.
                  </h2>
                  <p className="mt-2 text-fluid-base leading-[1.65] text-[#6b8198]">
                    Multiple-choice, true or false, matching type, and fill-in-the-blanks
                    are checked automatically after submission. Essay answers are saved
                    and left for manual review.
                  </p>
                </div>

                <div className="grid gap-3 sm:min-w-[17rem] sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                    <p className="text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Answered
                    </p>
                    <p className="mt-2 text-fluid-xl font-semibold text-[#173b70]">
                      {answeredCount} / {payload.questions.length}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3">
                    <p className="text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                      Submission
                    </p>
                    <p className="mt-2 text-fluid-md font-semibold text-[#173b70]">
                      One attempt only
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {payload.questions.map((question, index) => {
                  const draft = getDraftForQuestion(
                    question,
                    responseDrafts,
                    attemptResponseByQuestionId,
                  );

                  return (
                    <article
                      key={question.id}
                      className="rounded-[1.3rem] border border-[#bccdda] bg-[linear-gradient(180deg,#f5f9fc_0%,#eaf1f7_100%)] px-5 py-5 shadow-[0_.8rem_1.9rem_rgba(40,68,99,0.1)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-fluid-2xs font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
                            Question {index + 1}
                          </p>
                          <h3 className="mt-2 text-fluid-lg font-semibold text-[#173b70]">
                            {question.prompt}
                          </h3>
                        </div>
                        <span className="rounded-full border border-[#c6d6e2] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                          {formatQuestionType(question.questionType)}
                        </span>
                      </div>

                      {question.questionType === 'multiple-choice' || question.questionType === 'true-false' ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {question.options.map((option) => {
                            const isSelected = draft.answer === option;

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateAnswer(question.id, option)}
                                className={`rounded-[1rem] border px-4 py-3 text-left text-fluid-base font-medium transition ${
                                  isSelected
                                    ? 'border-[#6eaad9] bg-[linear-gradient(180deg,#edf6ff_0%,#e1effd_100%)] text-[#215f99] shadow-[0_10px_20px_rgba(43,121,186,0.12)]'
                                    : 'border-[#cad8e3] bg-[rgba(255,255,255,0.9)] text-[#5d7690] hover:bg-white'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {question.questionType === 'matching-type' ? (
                        <div className="mt-4 space-y-3">
                          {question.matchingPairs.map((pair, pairIndex) => (
                            <div
                              key={pair.id}
                              className="grid gap-3 rounded-[1rem] border border-[#cad8e3] bg-[linear-gradient(180deg,#eef4f8_0%,#e5edf4_100%)] px-4 py-3 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-center"
                            >
                              <div>
                                <p className="text-fluid-sm font-semibold uppercase tracking-[0.14em] text-[#6d86a0]">
                                  Prompt
                                </p>
                                <p className="mt-2 text-fluid-md font-semibold text-[#173b70]">
                                  {pair.prompt}
                                </p>
                              </div>
                              <div>
                                <p className="mb-2 text-fluid-sm font-semibold uppercase tracking-[0.14em] text-[#6d86a0]">
                                  Match
                                </p>
                                <CustomSelect
                                  id={`student-match-${question.id}-${pair.id}`}
                                  options={question.matchingOptions.map((option) => ({
                                    label: option,
                                    value: option,
                                  }))}
                                  placeholder="Select match"
                                  value={draft.matchingAnswers[pairIndex] ?? ''}
                                  onChange={(value) => updateMatchingAnswer(question.id, pairIndex, value)}
                                  tone="muted"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {question.questionType === 'fill-in-the-blanks' ? (
                        <div className="mt-4">
                          <label
                            htmlFor={`student-fill-${question.id}`}
                            className="mb-2 block text-fluid-sm font-semibold text-[#173b70]"
                          >
                            Your answer
                          </label>
                          <input
                            id={`student-fill-${question.id}`}
                            type="text"
                            value={draft.answer}
                            onChange={(event) => updateAnswer(question.id, event.target.value)}
                            placeholder="Type the missing answer"
                            className="w-full rounded-[1rem] border border-[#b8c8d7] bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base text-[#25456d] outline-none transition focus:border-[#6eaad9]"
                          />
                        </div>
                      ) : null}

                      {question.questionType === 'essay' ? (
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <label
                              htmlFor={`student-essay-${question.id}`}
                              className="block text-fluid-sm font-semibold text-[#173b70]"
                            >
                              Your response
                            </label>
                            <span className="text-fluid-sm font-medium text-[#6b8198]">
                              {question.rubricTotalPoints} point{question.rubricTotalPoints === 1 ? '' : 's'} rubric
                            </span>
                          </div>
                          <textarea
                            id={`student-essay-${question.id}`}
                            value={draft.answer}
                            onChange={(event) => updateAnswer(question.id, event.target.value)}
                            rows={7}
                            placeholder="Write your essay response here."
                            className="w-full resize-none rounded-[1rem] border border-[#b8c8d7] bg-[rgba(255,255,255,0.96)] px-4 py-3 text-fluid-base leading-6 text-[#25456d] outline-none transition focus:border-[#6eaad9]"
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-4 rounded-[1.35rem] border border-[#c2d2df] bg-[linear-gradient(180deg,#fefefe_0%,#f4f8fb_100%)] px-5 py-5 shadow-[0_.75rem_1.8rem_rgba(40,68,99,0.08)] lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-fluid-sm font-semibold text-[#173b70]">
                    Finish and check exam
                  </p>
                  <p className="mt-2 text-fluid-sm leading-[1.65] text-[#6b8198]">
                    Submitting will lock this assessment. Objective items are checked
                    immediately, while essay items wait for manual review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitAssessment}
                  disabled={submitAssessmentMutation.isPending || payload.questions.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2f78bc] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-5 py-3 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiSend className="h-4 w-4" />
                  {submitAssessmentMutation.isPending ? 'Submitting...' : 'Finish and check exam'}
                </button>
              </div>
            </section>
          ) : (
            <section className="mt-6 rounded-[1.8rem] bg-[linear-gradient(180deg,#e4edf5_0%,#d6e1eb_100%)] p-[1.35rem] shadow-[0_.95rem_2.2rem_rgba(40,68,99,0.12)] ring-[0.01rem] ring-[#b9ccda]">
              <div className="rounded-[1.4rem] border border-dashed border-[#c2d2df] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fb_100%)] px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#dbe8f6_0%,#c8d9ec_100%)] text-[#255a91]">
                  <FiClock className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-fluid-xl font-semibold text-[#173b70]">
                  This assessment is not open right now
                </h2>
                <p className="mt-2 text-fluid-base leading-[1.65] text-[#6b8198]">
                  {payload.assessment.questionCount === 0
                    ? 'Your instructor has not added any questions yet.'
                    : `Current availability: ${payload.assessment.availabilityLabel}. Return during the scheduled assessment window.`}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full border border-[#c6d6e2] bg-white px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                    {formatCalendarDate(payload.assessment.schedule)}
                  </span>
                  <span className="rounded-full border border-[#c6d6e2] bg-white px-3 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#607790]">
                    {formatAssessmentWindow(payload.assessment.startTime, payload.assessment.endTime)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/student/subjects/${subjectId}`)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#2f78bc] transition hover:bg-[#f8fbfd]"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Back to subject
                </button>
              </div>
            </section>
          )
        ) : null}
      </div>

      <NotificationPopup
        open={popupState.open}
        title={popupState.title}
        message={popupState.message}
        variant={popupState.variant}
        onClose={() => setPopupState((current) => ({ ...current, open: false }))}
      />
    </StudentLayout>
  );
}

export default AssessmentAttempt;

