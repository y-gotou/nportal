import type { Ref } from "vue";

// isOpenがtrueの間だけdocumentのクリックを監視し、targets外のクリックで閉じる
export function useClickOutside(
  isOpen: Ref<boolean>,
  targets: Array<Ref<HTMLElement | null>>,
) {
  function onClick(event: MouseEvent) {
    const node = event.target as Node;
    if (targets.some((target) => target.value?.contains(node))) return;
    isOpen.value = false;
  }

  watch(isOpen, (open) => {
    if (open) {
      document.addEventListener("click", onClick, true);
    } else {
      document.removeEventListener("click", onClick, true);
    }
  });

  onUnmounted(() => document.removeEventListener("click", onClick, true));
}
