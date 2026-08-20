// 発表申し込みフォームの入力値
export interface SpeakerFormValues {
  title: string;
  duration: number | "";
  note: string;
}

// フォームが初期値から変更されているか(手動で初期値へ戻した場合は未変更扱い)
export function isSpeakerFormDirty(current: SpeakerFormValues, initial: SpeakerFormValues): boolean {
  return (
    current.title !== initial.title ||
    current.duration !== initial.duration ||
    current.note !== initial.note
  );
}
