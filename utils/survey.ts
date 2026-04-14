import type {
  Survey,
  SurveyAnswerValue,
  SurveyChoiceAnswerWithOther,
  SurveyDistributionItem,
  SurveyQuestionType,
  SurveyResponse,
  SurveyResultBlock,
} from "../types/portal";

export const SURVEY_OTHER_OPTION_VALUE = "__other__";
export const SURVEY_OTHER_OPTION_LABEL = "その他";

interface ParsedSurveySelectionAnswer {
  selected: string[];
  otherText: string;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStructuredAnswer(answer: string): ParsedSurveySelectionAnswer | null {
  try {
    const parsed = JSON.parse(answer) as unknown;
    if (!isRecord(parsed) || !("selected" in parsed)) {
      return null;
    }

    const selectedRaw = parsed.selected;
    const selected = Array.isArray(selectedRaw)
      ? selectedRaw.filter((item): item is string => typeof item === "string")
      : typeof selectedRaw === "string"
        ? [selectedRaw]
        : [];

    return {
      selected,
      otherText: typeof parsed.otherText === "string" ? parsed.otherText : "",
    };
  } catch {
    return null;
  }
}

export function parseSurveyOptions(value: string | null | undefined) {
  return parseStringArray(value ?? "[]");
}

export function parseMultipleChoiceAnswer(answer: string) {
  const structured = parseStructuredAnswer(answer);

  if (structured) {
    return structured.selected;
  }

  const parsed = parseStringArray(answer);

  if (parsed.length > 0 || answer.trim().startsWith("[")) {
    return parsed;
  }

  return answer
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseSurveySelectionAnswer(
  answer: string,
  questionType: SurveyQuestionType,
): ParsedSurveySelectionAnswer {
  if (questionType === "free_text") {
    return {
      selected: [],
      otherText: answer,
    };
  }

  const structured = parseStructuredAnswer(answer);
  if (structured) {
    return structured;
  }

  if (questionType === "multiple_choice") {
    return {
      selected: parseMultipleChoiceAnswer(answer),
      otherText: "",
    };
  }

  return {
    selected: answer.trim() ? [answer] : [],
    otherText: "",
  };
}

export function serializeSurveyAnswer(answer: SurveyAnswerValue | undefined) {
  if (Array.isArray(answer)) {
    return JSON.stringify(answer);
  }

  if (typeof answer === "object" && answer !== null) {
    const normalized: SurveyChoiceAnswerWithOther = {
      selected: answer.selected,
      otherText: answer.otherText.trim(),
    };
    return JSON.stringify(normalized);
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
        otherTextAnswers: [],
        distribution: [],
      };
    }

    const optionCounts = Object.fromEntries(
      [
        ...question.options,
        ...(question.allowOtherText ? [SURVEY_OTHER_OPTION_LABEL] : []),
      ].map((option) => [option, 0]),
    ) as Record<string, number>;
    const otherTextAnswers: string[] = [];

    for (const response of questionResponses) {
      const parsedAnswer = parseSurveySelectionAnswer(
        response.answer,
        question.questionType,
      );

      for (const value of parsedAnswer.selected) {
        const label =
          value === SURVEY_OTHER_OPTION_VALUE ? SURVEY_OTHER_OPTION_LABEL : value;

        if (label in optionCounts) {
          optionCounts[label] = (optionCounts[label] ?? 0) + 1;
        }
      }

      if (parsedAnswer.otherText.trim()) {
        otherTextAnswers.push(parsedAnswer.otherText.trim());
      }
    }

    return {
      ...question,
      responseCount: questionResponses.length,
      freeTextAnswers: [],
      otherTextAnswers,
      distribution: buildDistribution(optionCounts, questionResponses.length),
    };
  });
}
