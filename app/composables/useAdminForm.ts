import { reactive, ref } from "vue";

// admin 系フォームで共通の「エラー表示・送信中・サーバーエラー」状態と定型処理
export function useAdminForm(failureMessage: string) {
  const errors = reactive<Record<string, string>>({});
  const isSubmitting = ref(false);
  const serverError = ref<string | null>(null);

  // 検証結果で表示を置き換え、エラーがなければ true を返す
  function applyErrors(e: Record<string, string>): boolean {
    for (const key of Object.keys(errors)) {
      delete errors[key];
    }
    Object.assign(errors, e);
    return Object.keys(e).length === 0;
  }

  // 送信処理を実行し、例外メッセージを serverError に反映する
  async function submitWith(action: () => Promise<void>): Promise<void> {
    isSubmitting.value = true;
    serverError.value = null;
    try {
      await action();
    }
    catch (e: unknown) {
      serverError.value = e instanceof Error ? e.message : failureMessage;
    }
    finally {
      isSubmitting.value = false;
    }
  }

  return { errors, isSubmitting, serverError, applyErrors, submitWith };
}
