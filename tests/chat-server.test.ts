import assert from "node:assert/strict";
import test from "node:test";
import {
  createChatMessage,
  getChatRoomVersion,
  listChatMessages,
  listChatReactions,
  listDeletedChatMessageIds,
  softDeleteChatMessage,
  toggleChatReaction,
  type ChatMessageRow,
} from "../server/utils/chat.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../types/portal.ts";

interface MockState {
  messages: ChatMessageRow[];
  reactions: Array<{ id: number; message_id: number; user_email: string; emoji: string }>;
  versions: Map<number, number>;
  nextMessageId: number;
  nextReactionId: number;
}

function createState(overrides: Partial<MockState> = {}): MockState {
  return {
    messages: [],
    reactions: [],
    versions: new Map(),
    nextMessageId: 1,
    nextReactionId: 1,
    ...overrides,
  };
}

function makeMessageRow(overrides: Partial<ChatMessageRow> = {}): ChatMessageRow {
  return {
    id: 1,
    schedule_id: 10,
    user_email: "member@example.com",
    kind: "text",
    body: "hello",
    reply_to_id: null,
    file_key: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    deleted_at: null,
    created_at: "2026-06-12 10:00:00",
    ...overrides,
  };
}

function execute(state: MockState, query: string, values: unknown[]): unknown {
  if (query.startsWith("INSERT INTO chat_messages")) {
    const id = state.nextMessageId++;
    state.messages.push(
      makeMessageRow({
        id,
        schedule_id: values[0] as number,
        user_email: values[1] as string,
        kind: values[2] as string,
        body: values[3] as string,
        reply_to_id: values[4] as number | null,
        file_key: values[5] as string | null,
        file_name: values[6] as string | null,
        file_size: values[7] as number | null,
        mime_type: values[8] as string | null,
      }),
    );
    return id;
  }

  if (query.startsWith("UPDATE chat_messages SET deleted_at")) {
    const message = state.messages.find((row) => row.id === values[0]);
    if (message && !message.deleted_at) {
      message.deleted_at = "2026-06-12 11:00:00";
    }
    return null;
  }

  if (query.startsWith("INSERT INTO chat_reactions")) {
    state.reactions.push({
      id: state.nextReactionId++,
      message_id: values[0] as number,
      user_email: values[1] as string,
      emoji: values[2] as string,
    });
    return null;
  }

  if (query.startsWith("DELETE FROM chat_reactions")) {
    state.reactions = state.reactions.filter((row) => row.id !== values[0]);
    return null;
  }

  if (query.startsWith("INSERT INTO chat_room_state")) {
    const scheduleId = values[0] as number;
    state.versions.set(scheduleId, (state.versions.get(scheduleId) ?? 0) + 1);
    return null;
  }

  throw new Error(`Unexpected write query: ${query}`);
}

function queryFirst(state: MockState, query: string, values: unknown[]): unknown {
  if (query.startsWith("SELECT version FROM chat_room_state")) {
    const version = state.versions.get(values[0] as number);
    return version === undefined ? null : { version };
  }

  if (query.startsWith("SELECT id FROM chat_reactions")) {
    return (
      state.reactions.find(
        (row) =>
          row.message_id === values[0] && row.user_email === values[1] && row.emoji === values[2],
      ) ?? null
    );
  }

  if (query.includes("FROM chat_messages WHERE id = ?")) {
    return state.messages.find((row) => row.id === values[0]) ?? null;
  }

  throw new Error(`Unexpected first query: ${query}`);
}

function queryAll(state: MockState, query: string, values: unknown[]): unknown[] {
  if (query.includes("FROM chat_messages WHERE schedule_id = ? AND id > ?")) {
    return state.messages.filter(
      (row) => row.schedule_id === values[0] && row.id > (values[1] as number),
    );
  }

  if (query.startsWith("SELECT r.message_id")) {
    const messageIds = new Set(
      state.messages.filter((row) => row.schedule_id === values[0]).map((row) => row.id),
    );
    return state.reactions.filter((row) => messageIds.has(row.message_id));
  }

  if (query.includes("deleted_at IS NOT NULL")) {
    return state.messages
      .filter((row) => row.schedule_id === values[0] && row.deleted_at !== null)
      .map((row) => ({ id: row.id }));
  }

  throw new Error(`Unexpected all query: ${query}`);
}

function createMockDb(state: MockState): D1DatabaseLike {
  function prepare(query: string): D1PreparedStatement {
    let bound: unknown[] = [];

    const statement: D1PreparedStatement & { execute?: () => void } = {
      bind(...values: unknown[]) {
        bound = values;
        return statement;
      },
      first<T>() {
        return Promise.resolve(queryFirst(state, query, bound) as T | null);
      },
      all<T>() {
        return Promise.resolve({ results: queryAll(state, query, bound) as T[] });
      },
      execute() {
        return execute(state, query, bound);
      },
    };

    return statement;
  }

  return {
    prepare,
    batch(statements: D1PreparedStatement[]) {
      const results = statements.map((statement) => {
        const lastRowId = (statement as { execute?: () => unknown }).execute?.();
        return { meta: { last_row_id: lastRowId } };
      });
      return Promise.resolve(results);
    },
  };
}

test("getChatRoomVersion: 状態がなければ0、あればその値", async () => {
  const state = createState({ versions: new Map([[10, 5]]) });
  const db = createMockDb(state);

  assert.equal(await getChatRoomVersion(db, 10), 5);
  assert.equal(await getChatRoomVersion(db, 99), 0);
});

test("createChatMessage: メッセージ追加と同時にバージョンが+1される", async () => {
  const state = createState({ nextMessageId: 7 });
  const db = createMockDb(state);

  const messageId = await createChatMessage(db, {
    scheduleId: 10,
    userEmail: "member@example.com",
    kind: "text",
    body: "こんにちは",
    replyToId: null,
    attachment: null,
  });

  assert.equal(messageId, 7);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0]?.body, "こんにちは");
  assert.equal(state.versions.get(10), 1);
});

test("createChatMessage: 添付情報が保存される", async () => {
  const state = createState();
  const db = createMockDb(state);

  await createChatMessage(db, {
    scheduleId: 10,
    userEmail: "member@example.com",
    kind: "text",
    body: "",
    replyToId: null,
    attachment: {
      fileKey: "local/chat/2026-06-12/abc-image.png",
      fileName: "image.png",
      fileSize: 2048,
      mimeType: "image/png",
    },
  });

  assert.equal(state.messages[0]?.file_key, "local/chat/2026-06-12/abc-image.png");
  assert.equal(state.messages[0]?.mime_type, "image/png");
});

test("softDeleteChatMessage: 論理削除とバージョン+1", async () => {
  const message = makeMessageRow({ id: 1, schedule_id: 10 });
  const state = createState({ messages: [message], nextMessageId: 2, versions: new Map([[10, 3]]) });
  const db = createMockDb(state);

  await softDeleteChatMessage(db, message);

  assert.notEqual(state.messages[0]?.deleted_at, null);
  assert.equal(state.versions.get(10), 4);
});

test("toggleChatReaction: 付与→解除のトグルと毎回のバージョン+1", async () => {
  const message = makeMessageRow({ id: 1, schedule_id: 10 });
  const state = createState({ messages: [message], nextMessageId: 2 });
  const db = createMockDb(state);

  const first = await toggleChatReaction(db, message, "member@example.com", "👍");
  assert.equal(first, "added");
  assert.equal(state.reactions.length, 1);
  assert.equal(state.versions.get(10), 1);

  const second = await toggleChatReaction(db, message, "member@example.com", "👍");
  assert.equal(second, "removed");
  assert.equal(state.reactions.length, 0);
  assert.equal(state.versions.get(10), 2);
});

test("listChatMessages: afterで差分取得できる", async () => {
  const state = createState({
    messages: [
      makeMessageRow({ id: 1, schedule_id: 10, body: "first" }),
      makeMessageRow({ id: 2, schedule_id: 10, body: "second" }),
      makeMessageRow({ id: 3, schedule_id: 99, body: "other room" }),
    ],
    nextMessageId: 4,
  });
  const db = createMockDb(state);

  const all = await listChatMessages(db, 10);
  assert.deepEqual(all.map((m) => m.id), [1, 2]);

  const diff = await listChatMessages(db, 10, 1);
  assert.deepEqual(diff.map((m) => m.id), [2]);
});

test("listChatReactions: メッセージ×絵文字でグルーピングされる", async () => {
  const state = createState({
    messages: [makeMessageRow({ id: 1, schedule_id: 10 })],
    nextMessageId: 2,
    reactions: [
      { id: 1, message_id: 1, user_email: "a@example.com", emoji: "👍" },
      { id: 2, message_id: 1, user_email: "b@example.com", emoji: "👍" },
      { id: 3, message_id: 1, user_email: "a@example.com", emoji: "🎉" },
    ],
    nextReactionId: 4,
  });
  const db = createMockDb(state);

  const reactions = await listChatReactions(db, 10);

  assert.equal(reactions.length, 2);
  const thumbsUp = reactions.find((r) => r.emoji === "👍");
  assert.deepEqual(thumbsUp?.userEmails, ["a@example.com", "b@example.com"]);
});

test("listDeletedChatMessageIds: 削除済みIDのみ返す", async () => {
  const state = createState({
    messages: [
      makeMessageRow({ id: 1, schedule_id: 10 }),
      makeMessageRow({ id: 2, schedule_id: 10, deleted_at: "2026-06-12 11:00:00" }),
    ],
    nextMessageId: 3,
  });
  const db = createMockDb(state);

  assert.deepEqual(await listDeletedChatMessageIds(db, 10), [2]);
});
