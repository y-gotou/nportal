import assert from "node:assert/strict";
import test from "node:test";
import {
  createExternalLinkController,
  isExternalHttpUrl,
  type LinkAttributeTarget,
} from "../app/utils/external-links.ts";

class TestLink implements LinkAttributeTarget {
  private readonly attributes = new Map<string, string>();

  constructor(attributes: Record<string, string>) {
    for (const [name, value] of Object.entries(attributes)) {
      this.attributes.set(name, value);
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

test("external HTTP(S) URL is detected by origin", () => {
  const origin = "https://portal.example.com";

  assert.equal(isExternalHttpUrl("https://example.com/path", origin), true);
  assert.equal(isExternalHttpUrl("http://portal.example.com/path", origin), true);
  assert.equal(isExternalHttpUrl("https://sub.portal.example.com/path", origin), true);
  assert.equal(isExternalHttpUrl("https://portal.example.com:8443/path", origin), true);
  assert.equal(isExternalHttpUrl("https://portal.example.com/path", origin), false);
  assert.equal(isExternalHttpUrl("/minutes", origin), false);
  assert.equal(isExternalHttpUrl("mailto:user@example.com", origin), false);
  assert.equal(isExternalHttpUrl("not a valid URL", origin), false);
});

test("external link attributes are added without discarding existing rel values", () => {
  const controller = createExternalLinkController("https://portal.example.com");
  const link = new TestLink({
    href: "https://example.com/path",
    rel: "nofollow",
  });

  controller.update(link);

  assert.equal(link.getAttribute("target"), "_blank");
  assert.equal(link.getAttribute("rel"), "nofollow noopener noreferrer");
});

test("managed attributes are restored when a link becomes internal", () => {
  const controller = createExternalLinkController("https://portal.example.com");
  const link = new TestLink({
    href: "https://example.com/path",
    target: "preview",
    rel: "nofollow",
  });

  controller.update(link);
  link.setAttribute("href", "/minutes");
  controller.update(link);

  assert.equal(link.getAttribute("target"), "preview");
  assert.equal(link.getAttribute("rel"), "nofollow");
});

test("internal and non-HTTP(S) links are not changed", () => {
  const controller = createExternalLinkController("https://portal.example.com");
  const internal = new TestLink({ href: "/minutes" });
  const mail = new TestLink({ href: "mailto:user@example.com" });

  controller.update(internal);
  controller.update(mail);

  assert.equal(internal.getAttribute("target"), null);
  assert.equal(internal.getAttribute("rel"), null);
  assert.equal(mail.getAttribute("target"), null);
  assert.equal(mail.getAttribute("rel"), null);
});
