// @vitest-environment node
/**
 * MoroccoCityField.astro — render contract tests.
 *
 * Same approach as CustomerFields.render.test.ts: render through Astro's
 * Container API against the real component, because the claim being tested
 * is about markup that shoppers get served.
 *
 * The contract (free-text input, not a dropdown):
 *   - Renders a required text input named `provinceId` (the column Moroccan
 *     carriers key off — matches CreateShipmentInput.provinceId).
 *   - The input is a plain <input type="text">, NOT a Select — the shopper
 *     types their city; the server resolves it via findMoroccanProvinceByName().
 *   - All user-facing strings come from the language pack (no hardcoding).
 *   - The label is present for assistive tech but visually hidden (sr-only),
 *     matching the name/phone fields in CustomerFields.astro.
 *   - Field errors render below the input.
 *   - The Algeria wilaya + commune fields are NOT rendered.
 */
/// <reference types="vitest/globals" />

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import MoroccoCityField from "./MoroccoCityField.astro";
import { en as enContent } from "@/theme/content/en";
import { ar as arContent } from "@/theme/content/ar";

async function render(content: any, fieldErrors: any = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(MoroccoCityField, {
    props: { content, fieldErrors, isRTL: false },
  });
}

describe("MoroccoCityField", () => {
  it("renders a required text input named provinceId", async () => {
    const html = await render(enContent);
    expect(html).toContain('name="provinceId"');
    expect(html).toContain('type="text"');
    expect(html).toContain('required');
  });

  it("is a plain text input, NOT a Select dropdown", async () => {
    const html = await render(enContent);
    // The Select component renders a <button> with role="combobox"; a free-text
    // input does not. The contract is: no combobox, just an <input type="text">.
    expect(html).not.toContain('role="combobox"');
    expect(html).not.toContain('data-id="f-morocco-city"');
  });

  it("uses autocomplete=address-level2 (city-level autofill)", async () => {
    const html = await render(enContent);
    expect(html).toContain('autocomplete="address-level2"');
  });

  it("uses content pack strings — no hardcoded labels", async () => {
    const html = await render(enContent);
    expect(html).toContain(enContent.formMoroccoCityLabel);
    // The placeholder is suffixed with " *" to mark the field as required.
    expect(html).toContain(`${enContent.formMoroccoCityLabel} *`);
  });

  it("carries a visually-hidden label for assistive tech", async () => {
    const html = await render(enContent);
    expect(html).toContain('class="sr-only"');
    expect(html).toContain(enContent.formMoroccoCityLabel);
  });

  it("renders the field error when present", async () => {
    const html = await render(enContent, {
      provinceId: ["Please enter your city"],
    });
    expect(html).toContain("Please enter your city");
  });

  it("does NOT render the Algeria wilaya or commune fields", async () => {
    const html = await render(enContent);
    expect(html).not.toContain('name="wilayaId"');
    expect(html).not.toContain('name="communeId"');
  });

  it("renders under RTL with the Arabic label", async () => {
    const html = await render(arContent);
    expect(html).toContain(arContent.formMoroccoCityLabel);
    expect(html).toContain('name="provinceId"');
  });
});
