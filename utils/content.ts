import minutesData from "../generated/minutes.json" with { type: "json" };
import resourcesData from "../content/resources.json" with { type: "json" };
import scheduleData from "../content/schedule.json" with { type: "json" };
import type {
  Minutes,
  MinutesMeta,
  ResourceItem,
  ScheduleItem,
} from "../types/portal";

export const portalTitle = "N Portal";
export const portalDescription =
  "社内AI勉強会の議事録、予定、資料、アンケートをまとめた軽量ポータルです。";

function compareDateAscending<T extends { date: string }>(left: T, right: T) {
  return left.date.localeCompare(right.date);
}

function compareDateDescending<T extends { date: string }>(left: T, right: T) {
  return right.date.localeCompare(left.date);
}

export function getTodayDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const allMinutes = [...(minutesData as Minutes[])].sort(compareDateDescending);
const allResources = [...(resourcesData as ResourceItem[])].sort(compareDateDescending);
const allSchedule = [...(scheduleData as ScheduleItem[])].sort(compareDateAscending);

const minutesList = allMinutes.map(({ slug, title, date, attendees, topics }) => ({
  slug,
  title,
  date,
  attendees,
  topics,
}));

const minutesBySlug = new Map(allMinutes.map((minutes) => [minutes.slug, minutes]));

export function getMinutesList(): MinutesMeta[] {
  return [...minutesList];
}

export function getMinutes(slug: string): Minutes | null {
  return minutesBySlug.get(slug) ?? null;
}

export function getResources(): ResourceItem[] {
  return [...allResources];
}

export function getSchedule(): ScheduleItem[] {
  return [...allSchedule];
}

export function splitScheduleByDate(today = getTodayDate()) {
  const upcoming: ScheduleItem[] = [];
  const past: ScheduleItem[] = [];

  for (const item of allSchedule) {
    if (item.date >= today) {
      upcoming.push(item);
      continue;
    }

    past.push(item);
  }

  return {
    upcoming,
    past: past.reverse(),
  };
}

export function getRecentMinutes(limit = 3): MinutesMeta[] {
  return minutesList.slice(0, limit);
}

export function getNextEvent(today = getTodayDate()) {
  return allSchedule.find((item) => item.date >= today) ?? null;
}
