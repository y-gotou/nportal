import minutesData from "~~/generated/minutes.json";
import resourcesData from "~~/content/resources.json";
import scheduleData from "~~/content/schedule.json";
import type {
  Minutes,
  MinutesMeta,
  ResourceItem,
  ScheduleItem,
} from "~~/types/portal";

export const portalTitle = "N Portal";
export const portalDescription =
  "社内AI勉強会の議事録、予定、資料、アンケートをまとめた軽量ポータルです。";

const allMinutes = minutesData as Minutes[];
const allResources = resourcesData as ResourceItem[];
const allSchedule = scheduleData as ScheduleItem[];

export function getMinutesList(): MinutesMeta[] {
  return allMinutes.map(({ slug, title, date, attendees, topics }) => ({
    slug,
    title,
    date,
    attendees,
    topics,
  }));
}

export function getMinutes(slug: string): Minutes | null {
  return allMinutes.find((minutes) => minutes.slug === slug) ?? null;
}

export function getResources(): ResourceItem[] {
  return [...allResources].sort((a, b) => b.date.localeCompare(a.date));
}

export function getSchedule(): ScheduleItem[] {
  return [...allSchedule].sort((a, b) => a.date.localeCompare(b.date));
}

export function getRecentMinutes(limit = 3): MinutesMeta[] {
  return getMinutesList().slice(0, limit);
}

export function getNextEvent(today = new Date().toISOString().slice(0, 10)) {
  return getSchedule().find((item) => item.date >= today) ?? null;
}
