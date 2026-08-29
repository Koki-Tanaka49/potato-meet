import {
  isPotatoVariant,
  type ExtensionMessage,
  type ExtensionStateResponse,
  type PotatoVariant
} from "../types";

const toggleElement = document.querySelector<HTMLInputElement>("#potato-toggle");
const stateLabelElement = document.querySelector<HTMLElement>("#state-label");
const sunglassesToggleElement = document.querySelector<HTMLInputElement>("#sunglasses-toggle");
const sunglassesStateElement = document.querySelector<HTMLElement>("#sunglasses-state");
const previewElement = document.querySelector<HTMLElement>("#selection-preview");
const previewBodyElement = document.querySelector<HTMLImageElement>("#preview-body");
const previewSunglassesElement = document.querySelector<HTMLImageElement>("#preview-sunglasses");
const selectionSummaryElement = document.querySelector<HTMLElement>("#selection-summary");
const connectionNoticeElement = document.querySelector<HTMLElement>("#connection-notice");
const variantElements = [...document.querySelectorAll<HTMLInputElement>("input[name='potato-variant']")];

if (
  !toggleElement || !stateLabelElement || !sunglassesToggleElement || !sunglassesStateElement ||
  !previewElement || !previewBodyElement ||
  !previewSunglassesElement || !selectionSummaryElement || !connectionNoticeElement
) {
  throw new Error("Could not initialize the popup.");
}

const toggle: HTMLInputElement = toggleElement;
const stateLabel: HTMLElement = stateLabelElement;
const sunglassesToggle: HTMLInputElement = sunglassesToggleElement;
const sunglassesState: HTMLElement = sunglassesStateElement;
const preview: HTMLElement = previewElement;
const previewBody: HTMLImageElement = previewBodyElement;
const previewSunglasses: HTMLImageElement = previewSunglassesElement;
const selectionSummary: HTMLElement = selectionSummaryElement;
const connectionNotice: HTMLElement = connectionNoticeElement;
let storedSunglassesEnabled = false;
let selectedVariant: PotatoVariant = "classic";

const VARIANT_DETAILS: Record<PotatoVariant, { label: string; path: string }> = {
  classic: { label: "Classic potato", path: "potato/potato-body.png" },
  sweet: { label: "Sweet potato", path: "potato/potato-body-sweet.png" },
  purple: { label: "Purple potato", path: "potato/potato-body-purple.png" }
};

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function send(message: ExtensionMessage): Promise<ExtensionStateResponse | null> {
  const tab = await activeTab();
  if (tab?.id === undefined) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, message) as ExtensionStateResponse;
  } catch {
    return null;
  }
}

function selectVariant(variant: PotatoVariant): void {
  selectedVariant = variant;
  for (const input of variantElements) input.checked = input.value === variant;
  updatePreview();
}

function updatePreview(): void {
  const selected = VARIANT_DETAILS[selectedVariant];
  previewBody.src = chrome.runtime.getURL(selected.path);
  previewSunglasses.hidden = !storedSunglassesEnabled;
  preview.dataset.variant = selectedVariant;
  const summary = storedSunglassesEnabled
    ? `${selected.label} + sunglasses`
    : selected.label;
  selectionSummary.textContent = summary;
  preview.setAttribute("aria-label", summary);
}

function render(response: ExtensionStateResponse | null): void {
  const availableHere = Boolean(response?.available);
  connectionNotice.hidden = response !== null;
  toggle.disabled = !availableHere;
  toggle.checked = Boolean(response?.enabled);
  stateLabel.textContent = toggle.checked ? "On" : "Off";
  if (response) storedSunglassesEnabled = response.sunglassesEnabled;
  sunglassesToggle.checked = storedSunglassesEnabled;
  sunglassesState.textContent = sunglassesToggle.checked ? "On" : "Off";

  if (response) selectVariant(response.variant);
  updatePreview();
}

toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  const response = await send({ type: "POTATO_SET_ENABLED", enabled: toggle.checked });
  render(response);
});

for (const input of variantElements) {
  input.addEventListener("change", async () => {
    if (!input.checked || !isPotatoVariant(input.value)) return;
    const variant = input.value;
    selectVariant(variant);
    await chrome.storage.local.set({ potatoVariant: variant });
    const response = await send({ type: "POTATO_SET_VARIANT", variant });
    if (response) render(response);
    else connectionNotice.hidden = false;
  });
}

sunglassesToggle.addEventListener("change", async () => {
  storedSunglassesEnabled = sunglassesToggle.checked;
  sunglassesState.textContent = storedSunglassesEnabled ? "On" : "Off";
  updatePreview();
  await chrome.storage.local.set({ sunglassesEnabled: storedSunglassesEnabled });
  const response = await send({ type: "POTATO_SET_SUNGLASSES", enabled: storedSunglassesEnabled });
  if (response) render(response);
  else connectionNotice.hidden = false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  const variant = changes.potatoVariant?.newValue;
  if (isPotatoVariant(variant)) selectVariant(variant);

  const sunglassesEnabled = changes.sunglassesEnabled?.newValue;
  if (typeof sunglassesEnabled === "boolean") {
    storedSunglassesEnabled = sunglassesEnabled;
    sunglassesToggle.checked = sunglassesEnabled;
    sunglassesState.textContent = sunglassesEnabled ? "On" : "Off";
    updatePreview();
  }
});

void (async () => {
  const stored = await chrome.storage.local.get(["potatoVariant", "sunglassesEnabled"]);
  if (isPotatoVariant(stored.potatoVariant)) selectVariant(stored.potatoVariant);
  if (typeof stored.sunglassesEnabled === "boolean") storedSunglassesEnabled = stored.sunglassesEnabled;
  render(await send({ type: "POTATO_GET_STATE" }));
})();
