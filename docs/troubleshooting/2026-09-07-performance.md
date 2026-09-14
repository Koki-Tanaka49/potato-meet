# 0.3.5: reduce redundant work while preserving tracking behavior

## Changes

- Do not initialize MediaPipe until an eligible, visible participant video exists. Once initialized, keep the worker available while On, but stop the detection timer when the target list is empty. Resume automatically when video appears.
- Ignore background-tab scans and layout reads, and ignore text-only mutations for immediate video discovery. The existing 750 ms scan remains the fallback for classification/attribute changes. Video additions/removals still trigger a coalesced scan.
- Cache detection priority until participant membership or layout changes, instead of allocating/sorting/slicing the list for every detection. Read each video's rectangle and classification text only once per scan.
- Cancel unfinished tracker initialization on Off. Use a local renderer reference during asynchronous startup so an earlier On cannot replace a newer renderer after Off/On. Serialize detections across visibility transitions and keep scheduling after a target disappears mid-detection.
- Package only the SIMD JS/WASM pair that the host already explicitly selects. The unused nosimd pair was never loaded by the existing host. The MediaPipe version, active WASM/model, image assets, face confidence thresholds, detection dimensions/delays and participant limits are unchanged. Runtime outbound-indicator checks continue to scan all shipped MediaPipe runtime files.

## Measured distribution sizes

Decimal bytes, from the generated ZIPs (not JavaScript heap or process RAM):

| Artifact | 0.3.4 | 0.3.5 | Reduction |
|---|---:|---:|---:|
| ZIP | 12,378,779 | 9,411,546 | 24.0% |
| Uncompressed files | 26,493,660 | 16,842,803 | 36.4% |
| Files | 27 | 25 | 2 unused files |

0.3.5 ZIP SHA-256: `a69a614f7ef0988d281f57cc03a723c1d2ee1a5d74edd2db50ac9ede315dac2c`.

## Evidence and limits

Before the changes, deterministic controller tests failed for unnecessary initialization with no candidates, scanning hidden-tab mutations, and an old renderer load overriding a newer startup. Those regressions now pass. Further tests cover text mutation coalescing, cancellation on Off, and continuing with another participant after one disappears.

Type checking, 24 unit tests, and normal/CSP/reconnection browser scenarios passed. Browser scenarios use the real bundled MediaPipe runtime with synthetic video and cover video becoming visible after On, multiple participants, mouth/variant/sunglasses behavior, On/Off and host cleanup. After eliminating the final redundant adapter sort, the normal browser scenario was rerun to cover target ordering.

These tests do not quantify CPU, GPU, battery use, or peak process memory in a live Meet call. No percentage claim is made for runtime resource savings. Before more invasive changes, measure actual face-tracking and fullscreen-canvas costs in comparable real calls. Lowering inference resolution/rate or changing model/overlay rendering requires separate accuracy and visual comparisons.
