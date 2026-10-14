/**
 * Delivery details, shared by the product order form and the checkout page.
 *
 * MaCod — Morocco only. The wilaya/commune loading logic was removed when
 * Algeria was stripped from the platform; the Morocco city field is a plain
 * text input that the server resolves to a province slug, so there is no
 * dynamic dropdown to populate.
 *
 * What remains: delivery-type switching (home/stop_desk address toggling)
 * and the re-pricing trigger that fires when the delivery type changes.
 */

export interface ShippingRate {
  home: number;
  stopDesk: number;
}

export type ShippingRates = Record<string, ShippingRate>;
export type DeliveryType = "home" | "stop_desk";

export interface DeliveryCopy {
  communeLoading: string;
  communePlaceholder: string;
  communeDisabled: string;
}

export function parseShippingRates(raw: string | null | undefined): ShippingRates {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const rates: ShippingRates = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "object" && value !== null) {
        const v = value as { home?: number; stopDesk?: number };
        rates[key] = {
          home: typeof v.home === "number" ? v.home : 0,
          stopDesk: typeof v.stopDesk === "number" ? v.stopDesk : 0,
        };
      }
    }
    return rates;
  } catch {
    return {};
  }
}

const SELECTED_CLASSES = ["border-[var(--clr-primary)]", "text-[var(--clr-primary)]", "bg-[var(--clr-primary)]/5", "shadow-sm"];
const UNSELECTED_CLASSES = ["border-[var(--clr-border)]", "text-[var(--clr-text-2)]", "bg-[var(--clr-surface-alt)]"];

/** Current shipping rates loaded from the `data-shipping-rates` attribute. */
let currentRates: ShippingRates = {};

/** The province text the shopper typed (free-text; server resolves to a slug). */
let selectedProvinceText: string = "";

/** The currently selected delivery type. */
let currentDelivery: DeliveryType = "home";

/**
 * Watch the shipping rates data attribute. When it changes, the callback fires
 * with the parsed rates. Returns an unwatch function.
 */
export function watchShippingRates(
  callback: (loaded: ShippingRates) => void,
): () => void {
  const el = document.querySelector<HTMLElement>("[data-shipping-rates]");
  if (el) {
    const raw = el.dataset.shippingRates ?? "";
    currentRates = parseShippingRates(raw);
    callback(currentRates);
  }
  return () => {};
}

/**
 * Look up the rate for a province + delivery type. Returns the numeric fee.
 */
export function rateFor(
  rates: ShippingRates,
  provinceId: string,
  deliveryType: DeliveryType,
): number {
  const r = rates[provinceId] ?? rates[selectedProvinceText] ?? { home: 0, stopDesk: 0 };
  return deliveryType === "stop_desk" ? r.stopDesk : r.home;
}

/**
 * Returns the shopper's typed city text (the Morocco city input's value).
 * Kept for API compatibility — MaCod renamed wilaya → province.
 */
export function selectedWilayaId(): string {
  const input = document.getElementById("f-morocco-city") as HTMLInputElement | null;
  selectedProvinceText = input?.value ?? "";
  return selectedProvinceText;
}

export function currentDeliveryType(): DeliveryType {
  return currentDelivery;
}

export { toggleAddressFields };

function toggleAddressFields(): void {
  const checked = document.querySelector<HTMLInputElement>('.delivery-radio-input:checked');
  const hidden = checked?.value === "stop_desk";
  const container = document.getElementById("address-field-container");
  if (container) {
    container.style.display = hidden ? "none" : "";
  }
  const input = document.getElementById("f-address") as HTMLInputElement | null;
  if (input?.dataset.addressRequired === "true") input.required = !hidden;
}

function paintDeliveryRadios(): void {
  document.querySelectorAll<HTMLInputElement>(".delivery-radio-input").forEach((radio) => {
    const face = radio.nextElementSibling as HTMLElement | null;
    if (!face) return;
    const on = radio.checked;
    face.classList.remove(...(on ? UNSELECTED_CLASSES : SELECTED_CLASSES));
    face.classList.add(...(on ? SELECTED_CLASSES : UNSELECTED_CLASSES));
  });
}

/**
 * Wire the delivery block. Returns a disposer.
 *
 * `onChange` fires whenever the delivery price could have moved — a new
 * delivery type — and never for anything else.
 */
export function bindDeliveryFields(
  _copy: DeliveryCopy,
  options: { isRTL: boolean; onChange: () => void },
): () => void {
  const aborter = new AbortController();
  const { signal } = aborter;

  document.querySelectorAll<HTMLInputElement>(".delivery-radio-input").forEach((radio) => {
    radio.addEventListener(
      "change",
      () => {
        paintDeliveryRadios();
        toggleAddressFields();
        currentDelivery = (radio.value as DeliveryType) ?? "home";
        options.onChange();
      },
      { signal },
    );
  });

  // Track the Morocco city input — replaces the old wilaya change listener.
  const cityInput = document.getElementById("f-morocco-city") as HTMLInputElement | null;
  cityInput?.addEventListener(
    "change",
    () => {
      selectedProvinceText = cityInput.value;
      options.onChange();
    },
    { signal },
  );

  toggleAddressFields();

  return () => aborter.abort();
}
