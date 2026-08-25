import {
  isPotatoVariant,
  type ExtensionMessage,
  type ExtensionStateResponse,
  type PerformanceMode,
  type PotatoVariant
} from "../types";

const toggleElement = document.querySelector<HTMLInputElement>("#potato-toggle");
const stateLabelElement = document.querySelector<HTMLElement>("#state-label");
const noticeElement = document.querySelector<HTMLElement>("#notice");
const availabilityElement = document.querySelector<HTMLElement>("#availability");
const footerElement = document.querySelector<HTMLElement>("footer");
const sunglassesToggleElement = document.querySelector<HTMLInputElement>("#sunglasses-toggle");
const sunglassesStateElement = document.querySelector<HTMLElement>("#sunglasses-state");
const previewElement = document.querySelector<HTMLElement>("#selection-preview");
const previewBodyElement = document.querySelector<HTMLImageElement>("#preview-body");
const previewSunglassesElement = document.querySelector<HTMLImageElement>("#preview-sunglasses");
const selectionSummaryElement = document.querySelector<HTMLElement>("#selection-summary");
const variantElements = [...document.querySelectorAll<HTMLInputElement>("input[name='potato-variant']")];

if (
  !toggleElement || !stateLabelElement || !noticeElement || !availabilityElement || !footerElement ||
  !sunglassesToggleElement || !sunglassesStateElement || !previewElement || !previewBodyElement ||
  !previewSunglassesElement || !selectionSummaryElement
) {
  throw new Error("ポップアップを初期化できませんでした。");
}

const toggle: HTMLInputElement = toggleElement;
const stateLabel: HTMLElement = stateLabelElement;
const notice: HTMLElement = noticeElement;
const availability: HTMLElement = availabilityElement;
const footer: HTMLElement = footerElement;
const sunglassesToggle: HTMLInputElement = sunglassesToggleElement;
const sunglassesState: HTMLElement = sunglassesStateElement;
const preview: HTMLElement = previewElement;
const previewBody: HTMLImageElement = previewBodyElement;
const previewSunglasses: HTMLImageElement = previewSunglassesElement;
const selectionSummary: HTMLElement = selectionSummaryElement;
let storedSunglassesEnabled = false;
let selectedVariant: PotatoVariant = "classic";

const VARIANT_DETAILS: Record<PotatoVariant, { label: string; path: string }> = {
  classic: { label: "じゃがいも", path: "potato/potato-body.png" },
  sweet: { label: "さつまいも", path: "potato/potato-body-sweet.png" },
  purple: { label: "紫いも", path: "potato/potato-body-purple.png" }
};

const PERFORMANCE_LABELS: Record<PerformanceMode, string> = {
  full: "標準動作",
  balanced: "負荷を調整中",
  light: "軽量動作"
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
  const summary = storedSunglassesEnabled
    ? `${selected.label} + サングラス`
    : selected.label;
  selectionSummary.textContent = summary;
  preview.setAttribute("aria-label", summary);
}

function render(response: ExtensionStateResponse | null): void {
  const availableHere = Boolean(response?.available);
  toggle.disabled = !availableHere;
  toggle.checked = Boolean(response?.enabled);
  stateLabel.textContent = toggle.checked ? "オン" : "オフ";
  if (response) storedSunglassesEnabled = response.sunglassesEnabled;
  sunglassesToggle.checked = storedSunglassesEnabled;
  sunglassesState.textContent = sunglassesToggle.checked ? "オン" : "オフ";

  if (response) {
    selectVariant(response.variant);
    availability.textContent = response.trackedCount > 0
      ? `${response.trackedCount}人・${PERFORMANCE_LABELS[response.performanceMode]}`
      : "このタブで使用できます";
  } else {
    availability.textContent = "Google Meet用";
  }

  notice.textContent = availableHere ? "映像は保存・送信されません" : "Google Meetを開くと使えます";
  footer.classList.toggle("unavailable", !availableHere);
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
  });
}

sunglassesToggle.addEventListener("change", async () => {
  storedSunglassesEnabled = sunglassesToggle.checked;
  sunglassesState.textContent = storedSunglassesEnabled ? "オン" : "オフ";
  updatePreview();
  await chrome.storage.local.set({ sunglassesEnabled: storedSunglassesEnabled });
  const response = await send({ type: "POTATO_SET_SUNGLASSES", enabled: storedSunglassesEnabled });
  if (response) render(response);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  const variant = changes.potatoVariant?.newValue;
  if (isPotatoVariant(variant)) selectVariant(variant);

  const sunglassesEnabled = changes.sunglassesEnabled?.newValue;
  if (typeof sunglassesEnabled === "boolean") {
    storedSunglassesEnabled = sunglassesEnabled;
    sunglassesToggle.checked = sunglassesEnabled;
    sunglassesState.textContent = sunglassesEnabled ? "オン" : "オフ";
    updatePreview();
  }
});

void (async () => {
  const stored = await chrome.storage.local.get(["potatoVariant", "sunglassesEnabled"]);
  if (isPotatoVariant(stored.potatoVariant)) selectVariant(stored.potatoVariant);
  if (typeof stored.sunglassesEnabled === "boolean") storedSunglassesEnabled = stored.sunglassesEnabled;
  render(await send({ type: "POTATO_GET_STATE" }));
})();
