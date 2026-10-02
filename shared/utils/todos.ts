export const TODO_TITLE_MAX_LENGTH = 200;
export const TODO_ASSIGNEE_MAX_LENGTH = 50;

// 期限の当日は超過としない。today は YYYY-MM-DD
export function isTodoOverdue(
  todo: { dueDate: string | null; doneAt: string | null },
  today: string,
): boolean {
  return todo.doneAt === null && todo.dueDate !== null && todo.dueDate < today;
}
