# Face tracking does not start (0.3.2)

## Observed and reproduced

On 2026-09-07, a live Meet tab had a Potato Meet overlay with `data-potato-count="0"`. Participant video elements were visible, decoded, and inside supported participant containers. The call ended before the extension's initialization error could be retrieved. The exact cause of that live failure remains unconfirmed.

The existing mock test passed. Adding the response header `Content-Security-Policy: script-src 'self' 'unsafe-inline'; worker-src 'self' blob:;` made the same test fail during initialization with `WebAssembly.instantiate(): Compiling or instantiating WebAssembly module violates ... Content Security Policy`.

Version 0.3.2 fetched the bundled worker source and launched it as a page-origin Blob. That worker inherited the page's policy; the manifest's WebAssembly permission did not apply to that worker. This is a confirmed compatibility defect, independent of whether it was the only cause in the reported call.

## Change in 0.3.3

A hidden extension-owned frame starts the bundled dedicated worker. The worker uses the existing extension CSP (`wasm-unsafe-eval`). Video frames cross a private MessageChannel as transferable ImageBitmaps; no network service is added. The host accepts connections only from its Meet parent and selects bundled runtime/model URLs itself. Stopping tracking removes the host frame and closes the channel. Initialization has a 15-second timeout.

The popup polls tracking state and displays startup progress, no candidate videos, or initialization errors. Previously it only showed On/Off, hiding initialization errors.

## Verification and remaining check

The browser regression test runs both without a page CSP and with the policy above. It checks detected overlays, exclusion of self/share tiles, multiple participants, repeated On/Off, frame cleanup, popup state refresh, and absence of HTTP(S) requests beyond the mock page. Fixtures contain an AI-generated face, not meeting captures.

Reload the updated extension, reload the Meet tab, then enable Show potatoes. Verify in a real call with another participant's visible camera. Store installations require a published update; a local build alone does not update the installed store version. No store publication was performed as part of this fix.
