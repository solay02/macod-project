// @vitest-environment node
/**
 * What the order form actually emits for a given Checkout Form Policy.
 *
 * MaCod — Morocco only. The Algeria wilaya/commune branch was removed;
 * the form always renders the Morocco city input (free text).
 *
 * The rule that matters most here: a hidden field ships NO markup.
 */
/// <reference types="vitest/globals" />

import { Window } from "happy-dom";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import CustomerFields from "./CustomerFields.astro";
import { en as enContent } from "@/theme/content/en";
import type { CheckoutFormPolicy } from "@/core/api/types";

const DEFAULTS: CheckoutFormPolicy = {
  address: "optional",
  notes: "optional",
  email: "hidden",
  deliveryOptions: { home: true, stopDesk: true },
  customFields: [],
};

async function render(formPolicy?: Partial<CheckoutFormPolicy>) {
  const container = await AstroContainer.create();
  return container.renderToString(CustomerFields, {
    props: {
      content: enContent,
      fieldErrors: {},
      isRTL: false,
      ...(formPolicy === undefined ? {} : { formPolicy: { ...DEFAULTS, ...formPolicy } }),
    },
  });
}

describe("MaCod form (Morocco only — no Algeria branch)", () => {
  it("renders the form with the Morocco city field", async () => {
    const html = await render(undefined);
    expect(html).toContain('name="customerName"');
    expect(html).toContain('name="phone"');
    expect(html).toContain('name="provinceId"');
    expect(html).toContain('value="home"');
    expect(html).toContain('value="stop_desk"');
  });

  it("does NOT render the Algeria wilaya or commune fields", async () => {
    const html = await render(undefined);
    expect(html).not.toContain('name="wilayaId"');
    expect(html).not.toContain('name="communeId"');
  });

  it("does NOT render the email field by default", async () => {
    const html = await render(undefined);
    expect(html).not.toContain('name="email"');
  });
});

describe("email field", () => {
  it("renders an optional row without a required attribute", async () => {
    const html = await render({ email: "optional" });
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(html).toMatch(/<input[^>]*name="email"(?![^>]*required)/);
  });

  it("marks the field required when the merchant requires it", async () => {
    const html = await render({ email: "required" });
    expect(html).toMatch(/<input[^>]*name="email"[^>]*required/);
  });

  it("ships no markup when hidden", async () => {
    expect(await render({ email: "hidden" })).not.toContain('name="email"');
  });
});

describe("address field", () => {
  it("renders by default (optional)", async () => {
    const html = await render({ address: "optional" });
    expect(html).toContain('name="address"');
  });

  it("is required when the merchant requires it", async () => {
    const html = await render({ address: "required" });
    expect(html).toMatch(/<input[^>]*name="address"[^>]*required/);
  });

  it("ships no markup when hidden", async () => {
    expect(await render({ address: "hidden" })).not.toContain('name="address"');
  });
});

describe("notes field", () => {
  it("renders by default (optional)", async () => {
    const html = await render({ notes: "optional" });
    expect(html).toContain('name="notes"');
  });

  it("ships no markup when hidden", async () => {
    expect(await render({ notes: "hidden" })).not.toContain('name="notes"');
  });
});

describe("delivery options", () => {
  it("renders both home and stop-desk by default", async () => {
    const html = await render(undefined);
    expect(html).toContain('value="home"');
    expect(html).toContain('value="stop_desk"');
  });

  it("renders only home when stop-desk is disabled", async () => {
    const html = await render({ deliveryOptions: { home: true, stopDesk: false } });
    expect(html).toContain('value="home"');
    expect(html).not.toContain('value="stop_desk"');
  });
});
