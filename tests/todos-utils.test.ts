import assert from "node:assert/strict";
import test from "node:test";
import { isTodoOverdue } from "../shared/utils/todos.ts";

const today = "2026-10-02";

test("isTodoOverdue is true only for open todos whose due date has passed", () => {
  assert.equal(isTodoOverdue({ dueDate: "2026-10-01", doneAt: null }, today), true);
  assert.equal(isTodoOverdue({ dueDate: "2025-12-31", doneAt: null }, today), true);
});

test("isTodoOverdue does not treat the due date itself as overdue", () => {
  assert.equal(isTodoOverdue({ dueDate: "2026-10-02", doneAt: null }, today), false);
  assert.equal(isTodoOverdue({ dueDate: "2026-10-03", doneAt: null }, today), false);
});

test("isTodoOverdue is false for done todos and todos without a due date", () => {
  assert.equal(isTodoOverdue({ dueDate: "2026-10-01", doneAt: "2026-10-02T00:00:00.000Z" }, today), false);
  assert.equal(isTodoOverdue({ dueDate: null, doneAt: null }, today), false);
});
