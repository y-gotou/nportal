export interface ScheduleItem {
  id: number;
  date: string;
  time: string;
  title: string;
  meetingUrl?: string | null;
  minutesSlug?: string | null;
  topics: string[];
  presenter: string;
  location?: string | null;
}

export interface ResourceItem {
  id: number;
  title: string;
  url: string;
  type: string;
  tags: string[];
  date: string;
  presenter: string | null;
  relatedMinutesSlug?: string | null;
}

export interface MinutesMeta {
  slug: string;
  title: string;
  date: string;
  attendees: string[];
  topics: string[];
}

export interface Minutes extends MinutesMeta {
  contentHtml: string;
}

export type SurveyQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "free_text";

export interface SurveyQuestion {
  id: number;
  questionText: string;
  questionType: SurveyQuestionType;
  options: string[];
}

export interface Survey {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  isActive: boolean;
  responseCount?: number;
  hasResponded?: boolean;
  questions: SurveyQuestion[];
}

export interface SurveyResponse {
  questionId: number;
  answer: string;
  submittedAt: string;
}

export interface SurveyAnswerInput {
  questionId: number;
  answer: string;
}

export type SurveyAnswerValue = string | string[];

export interface SurveyGetResponse {
  survey: Survey;
  responses: SurveyResponse[];
  myAnswers?: Record<number, string>;
}

export interface SurveysResponse {
  surveys: Survey[];
}

export interface CurrentUser {
  email: string;
}

export interface MeResponse {
  user: CurrentUser;
}

export interface SurveyDistributionItem {
  label: string;
  value: number;
  width: string;
}

export interface SurveyResultBlock extends SurveyQuestion {
  responseCount: number;
  freeTextAnswers: string[];
  distribution: SurveyDistributionItem[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}
