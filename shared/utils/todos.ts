export const TODO_TITLE_MAX_LENGTH = 200;
export const TODO_ASSIGNEE_MAX_LENGTH = 50;

// 期限の当日は超過としない。today は YYYY-MM-DD
export function isTodoOverdue(
  todo: { dueDate: string | null; doneAt: string | null },
  today: string,
): boolean {
  return todo.doneAt === null && todo.dueDate !== null && todo.dueDate < today;
}

// 登録者の記録が無い課題(createdBy が null)は、管理者のみ操作できる
export function canEditTodo(
  todo: { createdBy: string | null },
  user: { email: string; isAdmin: boolean } | null | undefined,
): boolean {
  if (!user) return false;
  return user.isAdmin || todo.createdBy === user.email;
}
