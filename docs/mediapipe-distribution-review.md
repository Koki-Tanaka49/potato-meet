# MediaPipe distribution and privacy review

Updated: 2026-09-01

This is an evidence log and release decision aid for Potato Meet. It is not legal advice. “Verified” below means verified from the listed technical or official source; it does not replace advice from a qualified rights or privacy professional.

## Decision

**Do not distribute the Chrome Web Store ZIP yet.** Two release gates remain open:

1. The official materials found do not expressly attach redistribution terms to the exact standalone object `face_landmarker.task` downloaded from the project URL.
2. Google's 2026 MediaPipe notices say Tasks APIs send performance and utilization metrics, while the project's Web 0.10.21 test currently observes no external HTTP requests. The exact behavior and resulting disclosure or consent duty for this package version are not confirmed.

The SDK and WebAssembly redistribution evidence is substantially stronger: the exact npm package declares Apache-2.0, the official v0.10.21 repository tag carries Apache License 2.0, and the distribution package already includes the license and applicable notice files. The model bundle needs separate confirmation because an Apache-licensed repository, sample, or model card does not automatically prove the license of a separately hosted binary object.

## 1. Items in the release package

| Item | Exact project input | How it enters `dist` |
|---|---|---|
| MediaPipe JavaScript | `@mediapipe/tasks-vision@0.10.21` | esbuild bundles imported code into `dist/face-tracker-worker.js` |
| MediaPipe WebAssembly loader and binaries | `node_modules/@mediapipe/tasks-vision/wasm/*` | `scripts/build.mjs` copies the directory to `dist/mediapipe/wasm` |
| Face Landmarker model bundle | `public/models/face_landmarker.task` | `scripts/fetch-model.mjs` downloads a pinned object if absent, verifies SHA-256, and the build copies it to `dist/models` |
| License and notice files | `licenses/apache-2.0.txt`, `licenses/mediapipe-notice.txt`, `docs/third-party.md` | The build copies all three into `dist` |

Pinned model URL:

```text
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

Pinned SHA-256:

```text
64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff
```

The official object's response headers and downloaded file were checked on 2026-09-01. The object was 3,758,596 bytes, reported GCS generation `1683136941916318`, was last modified on 2023-05-03, and contained:

```text
face_detector.tflite
face_landmarks_detector.tflite
geometry_pipeline_metadata_landmarks.binarypb
face_blendshapes.tflite
```

No license or notice file was present inside that archive.

## 2. Evidence matrix

| Question | Status | Evidence | Limit |
|---|---|---|---|
| Is the exact npm package identified? | **Verified** | `package.json` and lock file pin `@mediapipe/tasks-vision` 0.10.21; npm registry metadata reports the same version and integrity | npm metadata does not decide the model license |
| What license does the exact npm package declare? | **Verified** | Installed package `package.json` says `Apache-2.0`; author is `mediapipe@google.com` | The npm tarball does not include a separate LICENSE file, so retain the official tag license and notices in the extension package |
| Does the official v0.10.21 source tag use Apache 2.0? | **Verified** | [v0.10.21 release](https://github.com/google-ai-edge/mediapipe/releases/tag/v0.10.21) and [LICENSE at v0.10.21](https://github.com/google-ai-edge/mediapipe/blob/v0.10.21/LICENSE) | Repository license scope should still be checked against generated artifacts and third-party notices |
| Does Apache 2.0 permit object-form redistribution? | **Verified as license text** | Section 4 of the official tag license permits redistribution subject to conditions including providing the license, marking modifications, retaining notices, and carrying NOTICE attributions when applicable | Applying those conditions to a particular artifact is a rights decision, not just a technical check |
| Are SDK/WASM license materials included in the ZIP? | **Verified** | `scripts/build.mjs` copies Apache 2.0 and `mediapipe-notice.txt`; current `dist` contains both | Re-check the final ZIP after every dependency update |
| Is the model downloaded from an official Google-hosted URL? | **Verified** | The URL is used by the project and by Google's official MediaPipe sample; the current object matches the pinned SHA-256 | An official download location and sample usage do not by themselves grant redistribution rights |
| Does the exact model object state its redistribution terms? | **Not verified** | HTTP response headers contain object metadata but no license field; the `.task` archive contains model files and metadata but no license or notice | This is the main redistribution blocker |
| Do component model cards state Apache 2.0? | **Verified, indirect** | Official model cards for BlazeFace Short Range, Face Mesh V2, and Blendshape V2 each state Apache License 2.0 | The cards do not expressly identify the hash of the exact `.task` object or state that the combined object may be redistributed |
| Are input video frames sent to Google according to current official notice? | **Official notice says no** | The MediaPipe Tasks Privacy Notice says input images and video are processed on-device and not sent to Google servers | The notice is general and newer than Web 0.10.21 |
| Are performance or utilization metrics sent according to current official notice? | **Official notice says yes** | The same notice says Tasks APIs send performance and utilization metrics to Google | It does not identify which package versions, platforms, endpoints, triggers, or opt-out behavior are covered |
| Does the broader current MediaPipe terms page describe additional contact and metrics? | **Verified** | The MediaPipe APIs Terms say APIs may contact Google for bug fixes, model updates, and accelerator information and list example usage-data categories | The page uses “MediaPipe Solution APIs” broadly and is not a technical specification for Web 0.10.21 |
| Did the current browser test observe external HTTP traffic? | **Verified for the covered test** | `tests/extension.browser.spec.ts` records HTTP(S) requests other than the mocked Meet page and expects an empty array | One mocked flow cannot rule out delayed, conditional, platform-specific, or future traffic |
| Does static review show a configured telemetry destination? | **Not found, not proof of absence** | The 0.10.21 JavaScript contains `fetch` for caller-provided model and graph paths; the Emscripten loader contains fetch/XHR for the caller-provided WebAssembly path. No `sendBeacon`, WebSocket, or hard-coded telemetry endpoint was found in the reviewed JavaScript | WebAssembly strings contain generic metric-related symbols and bundled libraries are complex; static string review cannot prove runtime behavior |

## 3. SDK and WebAssembly redistribution analysis

### Confirmed

- The exact installed package reports `license: Apache-2.0`.
- The official source release tag is v0.10.21 and its root license is Apache License 2.0.
- The project does not load MediaPipe executable code from a CDN at runtime. The JavaScript and WebAssembly used by the extension are packaged in `dist`.
- The build includes an Apache 2.0 license file and the notice currently identified for the WebAssembly distribution.
- The project modifies the copied WebAssembly loader by appending two global assignments so the content script and Worker can share the bundled module factory. This modification should remain documented because Apache 2.0 section 4 requires prominent notices for modified files.

### Required before release

- Add a clear modification note to the final third-party notices for `vision_wasm_internal.js`, or obtain a rights review confirming the existing notice is sufficient. The current source comment documents the technical reason but the distributed notice does not expressly identify the modified file.
- Re-create and inspect notices whenever `@mediapipe/tasks-vision` changes. Do not assume the 0.10.21 notice remains sufficient for another version.
- Keep the license and notice files accessible inside the final ZIP.

### Practical status

SDK/WASM redistribution appears supportable under Apache 2.0 if its conditions and all third-party notices are followed. Treat this as a technical finding, not a legal conclusion.

## 4. Model redistribution analysis

### Evidence supporting use

- The project downloads the model from a Google-owned `storage.googleapis.com/mediapipe-models` URL.
- Google's official MediaPipe web sample references the same Face Landmarker object URL.
- The downloaded `.task` archive contains a short-range face detector, face landmark detector, geometry metadata, and face blendshape model.
- Google's official model cards for BlazeFace Short Range, Face Mesh V2, and Blendshape V2 each state Apache License 2.0.

Official model sources:

- [Official Face Landmarker web sample using the same model URL](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/tasks/face-landmarker.ts)
- [BlazeFace Short Range model card](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf)
- [Face Mesh V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)
- [Blendshape V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf)

### Why this is not enough

- The exact GCS object is separate from the MediaPipe source repository.
- Its HTTP headers do not state a license.
- Its `.task` archive does not contain a license or notice.
- The model cards do not bind their terms to this object's exact URL, generation, SHA-256, or combined archive.
- Apache licensing of sample source code that references a URL does not automatically license the downloaded binary.

### Safe confirmation evidence

Obtain at least one of the following before distributing the model in a Chrome Web Store ZIP:

1. An official Google or MediaPipe page that explicitly states the redistribution license for the exact Face Landmarker task bundle or URL.
2. A license file or metadata published with the exact object and clearly applicable to the pinned hash or version.
3. Written confirmation from an authorized Google or MediaPipe contact that the exact object may be redistributed in a Chrome extension, including any notice requirements.

Record the URL, date, exact wording, responder identity where applicable, and the model SHA-256 with the release evidence.

### Alternatives if confirmation cannot be obtained

- Replace the model with one whose redistribution terms are explicit and compatible, then re-run quality, privacy, and package review.
- Ask users to provide a model they are authorized to use, if that can be made understandable and reliable; this would materially change the product.
- Evaluate runtime download of the official model as data rather than bundling it. Do **not** treat this as an automatic workaround: it changes network behavior, offline behavior, privacy disclosure, consent analysis, Content Security Policy and cross-origin requirements, review evidence, and supply-chain risk. It requires a separate design and Chrome Web Store review.

## 5. MediaPipe metrics and runtime network analysis

### Official current statements

The [MediaPipe Tasks Privacy Notice](https://developers.google.com/edge/mediapipe/solutions/tasks#mediapipe_tasks_privacy_notice), last modified June 5, 2026, states that:

- input data such as images and video is processed on-device and is not sent to Google servers;
- Tasks APIs send performance and utilization metrics to Google; and
- the app developer is responsible for informed consent where required by applicable law.

The [MediaPipe APIs Terms of Service](https://developers.google.com/edge/mediapipe/legal/tos), last modified April 7, 2026, additionally states that Solution APIs may contact Google for items such as bug fixes, updated models, and hardware accelerator compatibility information. It gives example usage-data categories:

- SDK usage, downloads, installs, and session counts;
- inference counts and hardware-level performance;
- app ID and general characteristics of processed media;
- host system and version.

### Project-specific observations

- Potato Meet passes extension-local URLs for the model and WebAssembly.
- `face_landmarker.task`, the JavaScript worker, the WebAssembly loader, and the binary are bundled in `dist`.
- The current Playwright test records external HTTP(S) requests during its covered flow and expects zero.
- Static JavaScript review found only resource-loading fetch/XHR paths for URLs supplied by the caller or Emscripten loader. It found no `sendBeacon`, WebSocket, or hard-coded telemetry service URL.
- WebAssembly contains generic strings mentioning metrics and analytics types. These may come from linked protocol definitions and are not evidence that a network request occurs.

### What remains unknown

- Whether the 2026 notice describes Web package 0.10.21, only newer releases, other platforms, or all of them.
- Whether metrics depend on environment, time, feature, error state, origin, network availability, or a Google service configuration.
- Whether there is an opt-out or build flag for Web 0.10.21.
- The exact fields, endpoint, identifier behavior, and retention period for any Web 0.10.21 metrics.

### Required verification plan

1. Ask MediaPipe maintainers or an authorized Google contact for a version- and platform-specific answer covering `@mediapipe/tasks-vision@0.10.21` on Web.
2. Run the final packaged extension, not only the source build, in clean Chrome profiles on all supported operating systems.
3. Test initial setup, repeated inference, idle periods, errors, offline-to-online transition, tab backgrounding, and a long session.
4. Observe browser network events and, where permitted, system-level connections. Preserve timestamps, hostnames, request methods, and response status without recording participant content.
5. Repeat after Chrome and dependency updates.
6. If any external request occurs, determine its payload and purpose without sending real participant data. Update the privacy policy, Dashboard, in-product notice, consent flow, and test evidence before submission.

A packet test can establish what was observed in the tested conditions; it cannot prove that no other condition will ever send data. Pair testing with authoritative version-specific documentation or written confirmation.

## 6. Chrome Web Store effect

| Topic | Current answer | Release implication |
|---|---|---|
| Remote hosted code | No. JavaScript and WebAssembly are bundled | Select “No, I am not using remote code” after final ZIP inspection |
| Model | Bundled data, not executable JavaScript or WebAssembly | Still needs redistribution rights; model status does not change the remote-code answer |
| Local input processing | Video and facial estimates are processed locally and not persisted | Must still be disclosed as Personal communications and Website content; local handling is not exempt |
| Meet labels and names | Limited tile text and attributes can include participant names and are scanned locally | Conservatively disclose Personally identifiable information and explain the narrow purpose |
| MediaPipe metrics | Unresolved for Web 0.10.21 | Do not complete Limited Use certifications or submit until transfer, recipient, consent, and disclosure are settled |

Chrome sources:

- [Remote hosted code definition](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [Local processing disclosure requirement](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/policies#limited-use)

## 7. Release decision paths

| Path | Conditions | Recommendation |
|---|---|---|
| A. Bundle current SDK/WASM/model | Exact model redistribution rights confirmed; Web 0.10.21 metrics behavior and consent resolved; final notices complete | Preferred if all evidence is obtained because it preserves local resource loading and offline behavior |
| B. Bundle SDK/WASM but replace model | Replacement model has explicit compatible redistribution terms and passes quality, privacy, and performance tests | Acceptable engineering alternative; requires a new technical and rights review |
| C. Download model at runtime | Separate design confirms model access terms, CWS treatment, CORS/CSP, integrity pinning, privacy, consent, and failure behavior | Not a documentation-only shortcut; use only after a dedicated implementation review |
| D. Submit now with uncertainty | One or both release gates unresolved | **Not recommended** |

## 8. Evidence to retain with the release

- Final `package-lock.json` and npm package integrity
- Official v0.10.21 release and license snapshots or archived URLs
- Final SDK/WASM license and notice files
- Exact model URL, GCS generation if available, size, and SHA-256
- Explicit model redistribution evidence or written confirmation
- MediaPipe version-specific metrics confirmation
- Final ZIP file list and SHA-256
- Automated and manual test results, including network-observation scope and limitations
- Published privacy-policy version and Dashboard disclosure export or screenshots
- Date and owner of the rights, privacy, and release approvals

## Official primary sources reviewed

- [MediaPipe v0.10.21 release](https://github.com/google-ai-edge/mediapipe/releases/tag/v0.10.21)
- [MediaPipe v0.10.21 Apache 2.0 license](https://github.com/google-ai-edge/mediapipe/blob/v0.10.21/LICENSE)
- [MediaPipe Face Landmarker guide for Web](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [MediaPipe JavaScript FaceLandmarker API](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.facelandmarker)
- [Official MediaPipe web sample using the model URL](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/tasks/face-landmarker.ts)
- [MediaPipe Tasks Privacy Notice](https://developers.google.com/edge/mediapipe/solutions/tasks#mediapipe_tasks_privacy_notice)
- [MediaPipe APIs Terms of Service](https://developers.google.com/edge/mediapipe/legal/tos)
- [BlazeFace Short Range model card](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf)
- [Face Mesh V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)
- [Blendshape V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf)
