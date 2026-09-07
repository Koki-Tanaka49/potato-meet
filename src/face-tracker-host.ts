// The extension's own CSP permits the bundled WebAssembly runtime.
let connected = false;
window.addEventListener("message", (event: MessageEvent) => {
  if (connected || event.source !== parent || event.origin !== "https://meet.google.com" ||
      event.data?.type !== "POTATO_CONNECT" || event.ports.length !== 1) return;
  connected = true;
  const port = event.ports[0]!;
  const worker = new Worker(chrome.runtime.getURL("face-tracker-worker.js"));
  worker.addEventListener("message", (message) => port.postMessage(message.data));
  worker.addEventListener("error", () => port.postMessage({ type: "init-error", error: "The face-tracking worker stopped unexpectedly." }));
  worker.addEventListener("messageerror", () => port.postMessage({ type: "init-error", error: "Could not read the face-tracking worker response." }));
  port.addEventListener("message", (message) => {
    const data = message.data;
    if (data?.type === "init") {
      worker.postMessage({
        type: "init",
        wasmLoaderPath: chrome.runtime.getURL("mediapipe/wasm/vision_wasm_internal.js"),
        wasmBinaryPath: chrome.runtime.getURL("mediapipe/wasm/vision_wasm_internal.wasm"),
        modelPath: chrome.runtime.getURL("models/face_landmarker.task")
      });
    } else if (data?.type === "detect" && data.frame instanceof ImageBitmap) {
      worker.postMessage(data, [data.frame]);
    }
  });
  port.start();
  window.addEventListener("pagehide", () => { worker.terminate(); port.close(); }, { once: true });
});
