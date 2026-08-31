import assert from "node:assert/strict";
import test from "node:test";
import {
  adminUpdateSpeakerApplication,
  parseResourceIdInput,
  setSpeakerApplicationResource,
} from "../server/utils/speakers.ts";
import { deleteResourceItem } from "../server/utils/resources.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

interface AppRow {
  id: number;
  user_email: string;
  title: string;
  duration: number;
  note: string | null;
  status: string;
  minutes_slug: string | null;
  resource_id: number | null;
  created_at: string;
  updated_at: string;
}

interface ResRow {
  id: number;
  title: string;
  url: string;
  type: string;
  tags: string;
  date: string;
  presenter: string | null;
  related_minutes_slug: string | null;
  source_type: string;
  file_key: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  submitted_by: string | null;
}

interface State {
  applications: AppRow[];
  resources: ResRow[];
  deletedResourceIds: number[];
}

function makeApp(overrides: Partial<AppRow> = {}): AppRow {
  return {
    id: 1,
    user_email: "user@example.com",
    title: "Jujutsu 入門",
    duration: 15,
    note: null,
    status: "scheduled",
    minutes_slug: null,
    resource_id: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeResource(overrides: Partial<ResRow> = {}): ResRow {
  return {
    id: 100,
    title: "発表スライド",
    url: "",
    type: "PDF",
    tags: "[]",
    date: "2026-08-20",
    presenter: null,
    related_minutes_slug: null,
    source_type: "file",
    file_key: "local/resources/deck.pdf",
    file_name: "deck.pdf",
    file_size: 1024,
    mime_type: "application/pdf",
    submitted_by: "user@example.com",
    ...overrides,
  };
}

function createState(overrides: Partial<State> = {}): State {
  return {
    applications: [makeApp()],
    resources: [makeResource()],
    deletedResourceIds: [],
    ...overrides,
  };
}

function queryFirst(state: State, query: string, values: unknown[]): unknown {
  if (query.startsWith("SELECT user_email FROM speaker_applications")) {
    return state.applications.find((row) => row.id === values[0]) ?? null;
  }

  if (query.startsWith("SELECT id, submitted_by FROM resources")) {
    return state.resources.find((row) => row.id === values[0]) ?? null;
  }

  if (query.startsWith("SELECT id FROM speaker_applications WHERE resource_id = ?")) {
    return (
      state.applications.find((row) => row.resource_id === values[0] && row.id !== values[1]) ?? null
    );
  }

  if (query.includes("FROM resources r")) {
    const row = state.resources.find((item) => item.id === values[0]);
    if (!row) return null;
    const linked = state.applications.find((app) => app.resource_id === row.id);
    return {
      ...row,
      linked_application_id: linked?.id ?? null,
      linked_application_title: linked?.title ?? null,
    };
  }

  if (query.includes("UPDATE resources")) {
    const row = state.resources.find((item) => item.id === values[2]);
    if (row) {
      row.presenter = row.presenter || (values[0] as string | null);
      row.related_minutes_slug = row.related_minutes_slug || (values[1] as string | null);
    }
    return null;
  }

  if (query.includes("UPDATE speaker_applications SET resource_id = NULL")) {
    for (const row of state.applications) {
      if (row.resource_id === values[1]) row.resource_id = null;
    }
    return null;
  }

  if (query.includes("UPDATE speaker_applications")) {
    const setClause = query.match(/SET ([\s\S]+?)\s+WHERE/)?.[1] ?? "";
    const columns = setClause.split(",").map((part) => part.trim().split(" ")[0]!);
    const id = values[values.length - 1];
    const row = state.applications.find((item) => item.id === id);
    if (!row) return null;
    columns.forEach((column, index) => {
      (row as unknown as Record<string, unknown>)[column] = values[index];
    });
    return { ...row };
  }

  if (query.startsWith("DELETE FROM resource_images")) {
    return null;
  }

  if (query.startsWith("DELETE FROM resources")) {
    state.deletedResourceIds.push(values[0] as number);
    return null;
  }

  throw new Error(`Unexpected first query: ${query}`);
}

function queryAll(query: string): unknown[] {
  if (query.includes("FROM resource_images")) {
    return [];
  }

  throw new Error(`Unexpected all query: ${query}`);
}

function createDb(state: State): D1DatabaseLike {
  return {
    prepare(query: string) {
      let bound: unknown[] = [];

      const statement: D1PreparedStatement = {
        bind(...values: unknown[]) {
          bound = values;
          return statement;
        },
        first<T>() {
          return Promise.resolve(queryFirst(state, query, bound) as T | null);
        },
        all<T>() {
          return Promise.resolve({ results: queryAll(query) as T[] });
        },
      };

      return statement;
    },
    async batch() {
      return [];
    },
  };
}

test("parseResourceIdInput: 正の整数と解除値を受け付け、不正値を拒否する", () => {
  assert.equal(parseResourceIdInput(5), 5);
  assert.equal(parseResourceIdInput("5"), 5);
  assert.equal(parseResourceIdInput(null), null);
  assert.equal(parseResourceIdInput(""), null);
  assert.throws(() => parseResourceIdInput(0), /positive integer or null/);
  assert.throws(() => parseResourceIdInput(-1), /positive integer or null/);
  assert.throws(() => parseResourceIdInput("abc"), /positive integer or null/);
});

test("setSpeakerApplicationResource: 本人が資料を紐付けて解除できる", async () => {
  const state = createState();
  const db = createDb(state);

  const linked = await setSpeakerApplicationResource(db, 1, 100, "user@example.com");
  assert.equal(linked.resource_id, 100);
  assert.equal(state.applications[0]?.resource_id, 100);

  const cleared = await setSpeakerApplicationResource(db, 1, null, "user@example.com");
  assert.equal(cleared.resource_id, null);
});

test("setSpeakerApplicationResource: 発表済みの応募でも本人が紐付けできる", async () => {
  const state = createState({ applications: [makeApp({ status: "done" })] });

  const linked = await setSpeakerApplicationResource(createDb(state), 1, 100, "user@example.com");
  assert.equal(linked.resource_id, 100);
  assert.equal(linked.status, "done");
});

test("setSpeakerApplicationResource: 他人の応募は 403 で拒否する", async () => {
  await assert.rejects(
    () => setSpeakerApplicationResource(createDb(createState()), 1, 100, "other@example.com"),
    /Forbidden/,
  );
});

test("setSpeakerApplicationResource: 他人が投稿した資料は 403 で拒否する", async () => {
  const state = createState({
    resources: [makeResource({ submitted_by: "other@example.com" })],
  });

  await assert.rejects(
    () => setSpeakerApplicationResource(createDb(state), 1, 100, "user@example.com"),
    /Forbidden/,
  );
  assert.equal(state.applications[0]?.resource_id, null);
});

test("setSpeakerApplicationResource: 管理者経由(userEmail 未指定)は他人の資料も紐付けできる", async () => {
  const state = createState({
    resources: [makeResource({ submitted_by: "other@example.com" })],
  });

  const linked = await setSpeakerApplicationResource(createDb(state), 1, 100);
  assert.equal(linked.resource_id, 100);
});

test("setSpeakerApplicationResource: 存在しない資料は 404 で拒否する", async () => {
  await assert.rejects(
    () => setSpeakerApplicationResource(createDb(createState()), 1, 999, "user@example.com"),
    /Resource not found/,
  );
});

test("setSpeakerApplicationResource: 他の応募に紐付け済みの資料は 409 で拒否する", async () => {
  const state = createState({
    applications: [makeApp(), makeApp({ id: 2, resource_id: 100 })],
  });

  await assert.rejects(
    () => setSpeakerApplicationResource(createDb(state), 1, 100, "user@example.com"),
    /already linked to another application/,
  );
  assert.equal(state.applications[0]?.resource_id, null);
});

test("setSpeakerApplicationResource: 同じ資料の付け替え(自分自身)は許可する", async () => {
  const state = createState({ applications: [makeApp({ resource_id: 100 })] });

  const linked = await setSpeakerApplicationResource(createDb(state), 1, 100, "user@example.com");
  assert.equal(linked.resource_id, 100);
});

test("setSpeakerApplicationResource: 紐付け時に資料の未設定項目へ応募側の値を反映する", async () => {
  const state = createState({
    applications: [makeApp({ minutes_slug: "2026-08-13" })],
  });

  await setSpeakerApplicationResource(createDb(state), 1, 100, "user@example.com");

  assert.equal(state.resources[0]?.presenter, "user@example.com");
  assert.equal(state.resources[0]?.related_minutes_slug, "2026-08-13");
});

test("setSpeakerApplicationResource: 設定済みの資料項目は上書きしない", async () => {
  const state = createState({
    applications: [makeApp({ minutes_slug: "2026-08-13" })],
    resources: [
      makeResource({ presenter: "presenter@example.com", related_minutes_slug: "2026-07-30" }),
    ],
  });

  await setSpeakerApplicationResource(createDb(state), 1, 100, "user@example.com");

  assert.equal(state.resources[0]?.presenter, "presenter@example.com");
  assert.equal(state.resources[0]?.related_minutes_slug, "2026-07-30");
});

test("adminUpdateSpeakerApplication: resource_id の設定と解除ができる", async () => {
  const state = createState();
  const db = createDb(state);

  const linked = await adminUpdateSpeakerApplication(db, 1, { resourceId: 100 });
  assert.equal(linked.resource_id, 100);

  const cleared = await adminUpdateSpeakerApplication(db, 1, { resourceId: null });
  assert.equal(cleared.resource_id, null);
});

test("adminUpdateSpeakerApplication: 他の応募に紐付け済みの資料は 409 で拒否する", async () => {
  const state = createState({
    applications: [makeApp(), makeApp({ id: 2, resource_id: 100 })],
  });

  await assert.rejects(
    () => adminUpdateSpeakerApplication(createDb(state), 1, { resourceId: 100 }),
    /already linked to another application/,
  );
});

test("adminUpdateSpeakerApplication: 後からの minutes_slug 設定が紐付く資料へ追従する", async () => {
  const state = createState({ applications: [makeApp({ resource_id: 100 })] });

  await adminUpdateSpeakerApplication(createDb(state), 1, { minutesSlug: "2026-08-13" });

  assert.equal(state.resources[0]?.related_minutes_slug, "2026-08-13");
});

test("deleteResourceItem: 紐付いている応募の resource_id を解除する", async () => {
  const state = createState({ applications: [makeApp({ resource_id: 100 })] });

  const { fileKey } = await deleteResourceItem(createDb(state), 100, {
    email: "user@example.com",
  });

  assert.equal(fileKey, "local/resources/deck.pdf");
  assert.equal(state.applications[0]?.resource_id, null);
  assert.deepEqual(state.deletedResourceIds, [100]);
});
