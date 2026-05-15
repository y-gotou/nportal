export interface ScheduleItem {
  id: number;
  date: string;
  time: string;
  title: string;
  meetingUrl?: string | null;
  minutesSlug?: string | null;
  topics: string[];
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
  sourceType: "url" | "file";
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  submittedBy?: string | null;
  canEdit?: boolean;
}

export interface MinutesMeta {
  slug: string;
  title: string;
  date: string;
  attendees: string[];
  topics: string[];
}

export interface Minutes extends MinutesMeta {
  contentMd: string;
  contentHtml: string;
}

export interface MinutesPayload {
  title: string;
  date: string;
  attendees: string[];
  topics: string[];
  contentMd: string;
}

export type SurveyQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "free_text";

export type SurveyStatus =
  | "draft"
  | "active"
  | "closed";

export interface SurveyQuestion {
  id: number;
  questionText: string;
  questionType: SurveyQuestionType;
  options: string[];
  allowOtherText: boolean;
}

export interface Survey {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  status: SurveyStatus;
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

export interface SurveyChoiceAnswerWithOther {
  selected: string | string[];
  otherText: string;
}

export type SurveyAnswerValue =
  | string
  | string[]
  | SurveyChoiceAnswerWithOther;

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
  isAdmin: boolean;
}

export interface MeResponse {
  user: CurrentUser;
}

export interface MinutesListResponse {
  minutes: MinutesMeta[];
}

export interface MinutesDetailResponse {
  minutes: Minutes;
}

export interface ScheduleListResponse {
  schedule: ScheduleItem[];
}

export interface ResourcesListResponse {
  resources: ResourceItem[];
}

export interface ResourceMarkdownResponse {
  resource: ResourceItem;
  contentHtml: string;
}

export interface SurveyDistributionItem {
  label: string;
  value: number;
  width: string;
}

export interface SurveyResultBlock extends SurveyQuestion {
  responseCount: number;
  freeTextAnswers: string[];
  otherTextAnswers: string[];
  distribution: SurveyDistributionItem[];
}

export type SpeakerApplicationStatus = 'pending' | 'scheduled' | 'done';

export type ReportType = "bug" | "request";

export interface Report {
  id: number;
  reportType: ReportType;
  title: string;
  detail: string;
  userEmail: string;
  createdAt: string;
}

export interface CreateReportInput {
  reportType: ReportType;
  title: string;
  detail: string;
}

export interface ReportsListResponse {
  reports: Report[];
}

export interface SpeakerApplication {
  id: number;
  user_email: string;
  title: string;
  duration: number;
  note: string | null;
  status: SpeakerApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface SpeakersListResponse {
  applications: SpeakerApplication[];
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
