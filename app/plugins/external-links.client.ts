import { createExternalLinkController } from "~/utils/external-links";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", () => {
    const controller = createExternalLinkController(window.location.origin);

    function updateElement(element: Element): void {
      if (element instanceof HTMLAnchorElement) {
        controller.update(element);
      }
      element.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link => controller.update(link));
    }

    document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link => controller.update(link));

    // 非同期表示と Markdown 由来の HTML を含め、追加・変更されたリンクへ同じ規則を適用する。
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          if (mutation.target instanceof HTMLAnchorElement) {
            controller.update(mutation.target);
          }
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            updateElement(node);
          }
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["href"],
      childList: true,
      subtree: true,
    });
  });
});
