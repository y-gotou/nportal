import type {
  Survey,
  SurveyAnswerValue,
  SurveyChoiceAnswerWithOther,
  SurveyDistributionItem,
  SurveyQuestionType,
  SurveyResponse,
  SurveyResultBlock,
  SurveyStatus,
} from "../types/portal";

export const SURVEY_OTHER_OPTION_VALUE = "__other__";
export const SURVEY_OTHER_OPTION_LABEL = "その他";
const SURVEY_TIME_ZONE = "Asia/Tokyo";

// 公開開始/回答期限の入力刻み (分)。
// wrangler.jsonc / nuxt.config.ts の cron (*/15) と同期させること。
export const SURVEY_SCHEDULE_GRANULARITY_MINUTES = 15;

export function getSurveyStatusLabel(status: SurveyStatus): string {
  if (status === "draft") return "下書き";
  if (status === "active") return "受付中";
  return "受付終了";
}

function getJstDateParts(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: SURVEY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const entries = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: entries.year ?? "",
    month: entries.month ?? "",
    day: entries.day ?? "",
    hour: entries.hour ?? "",
    minute: entries.minute ?? "",
  };
}

function addDaysToJstDateTimeInputValue(value: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return "";
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + days);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hour}:${minute}`;
}

export function toJstDateTimeInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parts = getJstDateParts(value);
  if (!parts) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function getDefaultSurveyPublishStartsAt(now = new Date()) {
  const parts = getJstDateParts(now);
  if (!parts) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`;
}

export function getDefaultSurveyResponseDeadlineAt(
  publishStartsAt?: string | null,
  now = new Date(),
) {
  const base = publishStartsAt?.trim() || getDefaultSurveyPublishStartsAt(now);
  return addDaysToJstDateTimeInputValue(base, 1);
}

export function fromJstDateTimeInputValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00+09:00`).toISOString();
}

export function formatSurveyDateTime(value: string | null | undefined) {
  const parts = value ? getJstDateParts(value) : null;
  if (!parts) {
    return "";
  }

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export function buildSurveyAvailabilityText(survey: Pick<Survey, "publishStartsAt" | "responseDeadlineAt">) {
  const labels = [
    survey.publishStartsAt ? `開始 ${formatSurveyDateTime(survey.publishStartsAt)}` : "",
    survey.responseDeadlineAt ? `期限 ${formatSurveyDateTime(survey.responseDeadlineAt)}` : "",
  ].filter(Boolean);

  return labels.join(" / ");
}

export function formatSurveyResponseDeadline(survey: Pick<Survey, "responseDeadlineAt">) {
  if (!survey.responseDeadlineAt) {
    return "";
  }

  return `回答期限: ${formatSurveyDateTime(survey.responseDeadlineAt)}`;
}

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

function hasMeaningfulAnswer(
  answer: ParsedSurveySelectionAnswer,
) {
  return answer.selected.length > 0 || answer.otherText.trim().length > 0;
}

export function buildSurveyResultBlocks(
  survey: Survey,
  responses: SurveyResponse[],
): SurveyResultBlock[] {
  const responsesByQuestionId = groupResponsesByQuestionId(responses);

  return survey.questions.map((question) => {
    const questionResponses = responsesByQuestionId.get(question.id) ?? [];

    if (question.questionType === "free_text") {
      const freeTextAnswers = questionResponses
        .map((response) => response.answer.trim())
        .filter(Boolean);

      return {
        ...question,
        responseCount: freeTextAnswers.length,
        freeTextAnswers,
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
    let responseCount = 0;

    for (const response of questionResponses) {
      const parsedAnswer = parseSurveySelectionAnswer(
        response.answer,
        question.questionType,
      );
      const otherText = parsedAnswer.otherText.trim();

      if (hasMeaningfulAnswer(parsedAnswer)) {
        responseCount += 1;
      }

      for (const value of parsedAnswer.selected) {
        const label =
          value === SURVEY_OTHER_OPTION_VALUE ? SURVEY_OTHER_OPTION_LABEL : value;

        if (label in optionCounts) {
          optionCounts[label] = (optionCounts[label] ?? 0) + 1;
        }
      }

      if (otherText) {
        otherTextAnswers.push(otherText);
      }
    }

    return {
      ...question,
      responseCount,
      freeTextAnswers: [],
      otherTextAnswers,
      distribution: buildDistribution(optionCounts, responseCount),
    };
  });
}
