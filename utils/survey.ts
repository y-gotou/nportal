import type {
  Survey,
  SurveyAnswerValue,
  SurveyDistributionItem,
  SurveyResponse,
  SurveyResultBlock,
} from "../types/portal";

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function parseSurveyOptions(value: string | null | undefined) {
  return parseStringArray(value ?? "[]");
}

export function parseMultipleChoiceAnswer(answer: string) {
  const parsed = parseStringArray(answer);

  if (parsed.length > 0 || answer.trim().startsWith("[")) {
    return parsed;
  }

  return answer
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function serializeSurveyAnswer(answer: SurveyAnswerValue | undefined) {
  if (Array.isArray(answer)) {
    return JSON.stringify(answer);
  }

  return answer ?? "";
}

function getDistributionWidth(value: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.max((value / total) * 100, value > 0 ? 8 : 0)}%`;
}

function buildDistribution(
  optionCounts: Record<string, number>,
  totalResponses: number,
): SurveyDistributionItem[] {
  return Object.entries(optionCounts).map(([label, value]) => ({
    label,
    value,
    width: getDistributionWidth(value, totalResponses),
  }));
}

function groupResponsesByQuestionId(responses: SurveyResponse[]) {
  const grouped = new Map<number, SurveyResponse[]>();

  for (const response of responses) {
    const questionResponses = grouped.get(response.questionId) ?? [];
    questionResponses.push(response);
    grouped.set(response.questionId, questionResponses);
  }

  return grouped;
}

export function buildSurveyResultBlocks(
  survey: Survey,
  responses: SurveyResponse[],
): SurveyResultBlock[] {
  const responsesByQuestionId = groupResponsesByQuestionId(responses);

  return survey.questions.map((question) => {
    const questionResponses = responsesByQuestionId.get(question.id) ?? [];

    if (question.questionType === "free_text") {
      return {
        ...question,
        responseCount: questionResponses.length,
        freeTextAnswers: questionResponses
          .map((response) => response.answer.trim())
          .filter(Boolean),
        distribution: [],
      };
    }

    const optionCounts = Object.fromEntries(
      question.options.map((option) => [option, 0]),
    ) as Record<string, number>;

    for (const response of questionResponses) {
      const values =
        question.questionType === "multiple_choice"
          ? parseMultipleChoiceAnswer(response.answer)
          : [response.answer];

      for (const value of values) {
        if (value in optionCounts) {
          optionCounts[value] = (optionCounts[value] ?? 0) + 1;
        }
      }
    }

    return {
      ...question,
      responseCount: questionResponses.length,
      freeTextAnswers: [],
      distribution: buildDistribution(optionCounts, questionResponses.length),
    };
  });
}
