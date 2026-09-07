# Potato Meet

Potato Meet is a Chrome extension that overlays animated potatoes on other participants' faces in Google Meet. Video frames and face estimates are processed in your browser and are not persistently stored by the extension.

![Potato Meet in Google Meet](docs/images/potato-meet-browser.png)

## Features

- Shows potatoes only on confirmed camera faces, excluding your own video and screen shares
- Offers three styles: classic potato, sweet potato, and purple potato
- Adds optional frameless sunglasses as a separate layer
- Reacts to mouth movement and head direction
- Automatically adjusts processing load based on the number of participants
- Shows an instant preview of your selection in the popup

## Use in Chrome

Potato Meet requires Node.js 20 or later and Chrome 120 or later.

```bash
npm ci
npm run build
```

On the first build, the project downloads the face-detection model from MediaPipe's official distribution source and verifies its SHA-256 checksum.

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `dist` folder in this repository.
5. Open Google Meet and turn on **Show potatoes** in the Potato Meet popup.

Potato Meet always starts turned off in each new Google Meet tab.

## Updating and troubleshooting

After rebuilding, reload Potato Meet in `chrome://extensions`, then open its popup on the Meet tab. Version 0.3.4 reconnects tabs missing the content script and lets you turn **Show potatoes** on without leaving the call. If site access is denied or an older context persists, reload the Meet tab. For a store installation, the new version must first be published and installed; rebuilding this repository does not update it.

Version 0.3.3 starts face tracking in an extension-owned frame and worker so that the Meet page's WebAssembly restrictions do not prevent initialization. The popup reports initialization, missing participant videos, and startup errors. The extension still excludes your own video.

Version 0.3.5 defers face-tracker initialization until a visible participant video appears, avoids hidden-tab and unrelated text-change scans, and reuses the participant processing order until layout or membership changes. Detection resolution, timing, participant limits, and image assets remain the same. The unused nosimd WASM pair is no longer packaged; the runtime already explicitly selected the SIMD pair.

## Development and testing

| Command | Purpose |
|---|---|
| `npm run check` | Run type checking, unit tests, and the production build |
| `npm run test:browser` | Load the extension in Chrome and run the browser test |
| `npm run model` | Download and verify the face-detection model |
| `npm run assets -- <image-path>` | Prepare potato image assets |

Head direction, mouth movement, and long-running behavior are verified manually in a real Google Meet call. The browser tests cover both an unrestricted page and a page CSP that forbids WebAssembly. They use an AI-generated person who does not represent a real individual. Test screenshots are written to `test-results`, leaving published screenshots unchanged.

## Project structure

```text
├── docs/       Specifications, asset information, and screenshots
├── licenses/   Third-party licenses
├── public/     Images and model files copied into the extension
├── scripts/    Build and asset-preparation scripts
├── src/        Extension source code
└── tests/      Unit and browser tests
```

- [Current specification](docs/spec.md)
- [Image assets](docs/assets.md)
- [Third-party software](docs/third-party.md)
- [Chrome Web Store listing text](docs/chrome-web-store-listing.md)
- [Privacy policy draft](docs/privacy-policy.md)
- [Publishing checklist](docs/publishing-checklist.md)
- [MediaPipe distribution and privacy review](docs/mediapipe-distribution-review.md)

Do not publish until the MediaPipe review is resolved and the operator, contact, support, and public privacy-policy URL placeholders are replaced with confirmed values.

## Privacy

- Chrome permissions are `storage` for preferences and `scripting` to reconnect an existing Meet tab. Host access is limited to `https://meet.google.com/*`.
- The extension runs only on `https://meet.google.com/*`.
- It does not request microphone, camera, recording, or browsing-history permissions.
- It does not use a CDN, analytics service, or remote logging.
- It does not persistently store video, face images, face landmarks, participant names, or meeting URLs.

## License

This repository does not currently include an open-source license. Public access to the source code does not grant permission to reuse or redistribute it.

The `dist` folder and face-detection model are not committed to Git. Before creating a distribution package, review the conditions documented in [Third-party software](docs/third-party.md).
