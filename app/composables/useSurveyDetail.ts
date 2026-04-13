import type { SurveyGetResponse, SurveyResponse } from "~~/types/portal";

interface UseSurveyDetailOptions {
  requireActive?: boolean;
  failureMessage: string;
}

export async function useSurveyDetail(
  surveyId: number,
  options: UseSurveyDetailOptions,
) {
  if (!Number.isInteger(surveyId) || surveyId < 1) {
    throw createError({
      statusCode: 404,
      statusMessage: "Survey not found",
    });
  }

  const { data, error } = await useFetch<SurveyGetResponse>("/api/survey", {
    query: { surveyId },
  });

  if (error.value) {
    throw createError({
      statusCode: error.value.statusCode || 500,
      statusMessage: error.value.statusMessage || options.failureMessage,
    });
  }

  const survey = data.value?.survey;
  const responses: SurveyResponse[] = data.value?.responses ?? [];

  if (!survey || (options.requireActive && !survey.isActive)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Survey not found",
    });
  }

  return { survey, responses };
}
