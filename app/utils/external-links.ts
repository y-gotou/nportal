export interface LinkAttributeTarget {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

interface OriginalAttributes {
  target: string | null;
  rel: string | null;
}

export function isExternalHttpUrl(href: string, currentOrigin: string): boolean {
  try {
    const currentUrl = new URL(currentOrigin);
    const linkUrl = new URL(href, currentUrl);
    const isHttp = linkUrl.protocol === "http:" || linkUrl.protocol === "https:";
    return isHttp && linkUrl.origin !== currentUrl.origin;
  } catch {
    return false;
  }
}

function restoreAttribute(
  link: LinkAttributeTarget,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    link.removeAttribute(name);
    return;
  }
  link.setAttribute(name, value);
}

export function createExternalLinkController(currentOrigin: string) {
  const managedLinks = new WeakMap<LinkAttributeTarget, OriginalAttributes>();

  return {
    update(link: LinkAttributeTarget): void {
      const href = link.getAttribute("href");
      if (!href || !isExternalHttpUrl(href, currentOrigin)) {
        const original = managedLinks.get(link);
        if (original) {
          restoreAttribute(link, "target", original.target);
          restoreAttribute(link, "rel", original.rel);
          managedLinks.delete(link);
        }
        return;
      }

      if (!managedLinks.has(link)) {
        managedLinks.set(link, {
          target: link.getAttribute("target"),
          rel: link.getAttribute("rel"),
        });
      }

      const relValues = new Set((link.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean));
      relValues.add("noopener");
      relValues.add("noreferrer");

      link.setAttribute("target", "_blank");
      link.setAttribute("rel", [...relValues].join(" "));
    },
  };
}
