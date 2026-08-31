# Chrome Web Store publishing checklist

Updated: 2026-09-01

This checklist separates work that can be completed in the repository from actions that require the developer, publisher account, or a rights decision. It is not legal advice.

## Release gate

**Current recommendation: do not upload or submit the package for review yet.** The exact redistribution terms for the bundled `face_landmarker.task` and the MediaPipe Web 0.10.21 metrics behavior are not confirmed. All Chrome Web Store visibility levels go through policy review, and even private distribution would distribute the model to testers.

| Mark | Meaning |
|---|---|
| `[x]` | Confirmed in the repository on 2026-09-01 |
| `[ ]` | Still required |
| `BLOCKED` | Must be resolved before packaging or submission |

## 1. Developer account

| Check | Owner | Status / action |
|---|---|---|
| Register a Chrome Web Store developer account and pay the one-time registration fee | Developer account owner | `[ ]` Use a long-lived account that is checked regularly |
| Accept the current Developer Agreement and Program Policies | Developer account owner | `[ ]` Complete in the Dashboard |
| Set the publisher name | Developer account owner | `[ ]` Use the final legal or public publisher name |
| Verify the contact email | Developer account owner | `[ ]` Required by the account setup flow |
| Set a monitored support email or support URL | Developer account owner | `BLOCKED` Replace the placeholders with confirmed values; do not infer an email address or URL |
| Enable publication and review notifications | Developer account owner | `[ ]` Monitor rejection, takedown, staged, and publication mail |
| Decide whether the item is owned by an individual or a publisher group | Developer account owner | `[ ]` Add only the members who need access and give them the minimum role |

Official sources:

- [Register your developer account](https://developer.chrome.com/docs/webstore/register)
- [Set up your developer account](https://developer.chrome.com/docs/webstore/set-up-account)
- [Share ownership](https://developer.chrome.com/docs/webstore/share-ownership)

## 2. Name, trademark, and images

| Check | Owner | Status / action |
|---|---|---|
| Decide the final title after reviewing Google trademark guidance | Developer and rights reviewer | `[ ]` The current manifest name is `Potato Meet`; the safer candidate is `Potato Overlay for Google Meet™` |
| Keep the title, manifest, listing, screenshots, and support site consistent | Repository maintainer and Dashboard editor | `[ ]` A name change requires a source change and a new package |
| Add a 128×128 PNG store icon to the ZIP and declare appropriate manifest icons | Repository maintainer | `[x]` The manifest declares 16, 32, 48, and 128 px icons for the extension and action |
| Create the required 440×280 PNG or JPEG small promotional tile | Designer / Dashboard editor | `[x]` `docs/store-assets/potato-meet-promo-440x280.png` |
| Create at least one store screenshot at 1280×800 or 640×400, up to five | Designer / tester | `[x]` `docs/store-assets/potato-meet-screenshot-1280x800.png` uses the synthetic browser-test participant |
| Use square corners, no padding, and show the real user experience | Designer / tester | `[ ]` Prefer 1280×800 |
| Obtain permission from any real participant shown in promotional material | Developer / rights reviewer | `[ ]` Prefer synthetic participants and fictional names, as in the current test assets |
| Optionally create a 1400×560 marquee tile | Designer / Dashboard editor | `[x]` `docs/store-assets/potato-meet-marquee-1400x560.png` |
| Add the Google Meet trademark attribution and no-affiliation statement | Dashboard editor / website owner | `[ ]` Paste the text from `chrome-web-store-listing.md` |

Official sources:

- [Chrome Web Store image requirements](https://developer.chrome.com/docs/webstore/images)
- [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Google Brand Resource Center guidance](https://about.google/brand-resource-center/guidance/)

## 3. Repository and ZIP package

| Check | Owner | Status / action |
|---|---|---|
| Use Manifest V3 | Repository | `[x]` `manifest_version` is 3 |
| Limit Chrome permissions to the minimum | Repository | `[x]` Only `storage` is requested |
| Limit site access to Google Meet | Repository | `[x]` Content script and web-accessible resources match only `https://meet.google.com/*` |
| Bundle executable JavaScript and WebAssembly | Repository | `[x]` Current build copies the MediaPipe WebAssembly and bundles JavaScript locally |
| Bundle the pinned model and verify its SHA-256 | Repository | `[x]` Build verifies `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| Confirm the right to redistribute the exact `face_landmarker.task` object | Developer / rights reviewer | `BLOCKED` See `mediapipe-distribution-review.md` |
| Resolve whether MediaPipe Web 0.10.21 sends metrics in the final package | Repository maintainer and privacy owner | `BLOCKED` Current test saw no external HTTP traffic, but official current MediaPipe notice says Tasks APIs send metrics |
| Include Apache 2.0 text and applicable notices | Repository | `[x]` The build copies `licenses/apache-2.0.txt` and `licenses/mediapipe-notice.txt` |
| Add a distributed notice that identifies the appended changes to `vision_wasm_internal.js`, or obtain a review that the existing notice is sufficient | Repository maintainer / rights reviewer | `[ ]` Apache 2.0 section 4 requires modified-file notices; the build appends two assignments to the copied loader |
| Add the required extension icon to the package | Repository maintainer | `[x]` The build includes only the four runtime icon sizes and excludes image-generation originals |
| Confirm `name`, `version`, `description`, and icons before ZIP creation | Repository maintainer | `[x]` Version 0.3.2 package metadata and icon references are internally consistent; repeat after any title change |
| Run type checking, unit tests, and production build | Repository maintainer | `[x]` `npm run check` passed on 2026-09-01 |
| Run the automated browser test | Repository maintainer | `[x]` `npm run test:browser` passed on 2026-09-01, including the in-product local-processing notice |
| Run the manual real-Meet test | Tester | `[ ]` Include two participants, head direction, mouth movement, tile changes, and a 15-minute session |
| Inspect the built package for secrets, source-only fixtures, development files, unexpected URLs, and remote code | Repository maintainer | `[ ]` `npm run release:check` rejected unnecessary file classes and passed on 2026-09-01; the final manual content review is still required |
| Create a ZIP with `manifest.json` at the ZIP root | Repository maintainer | `[x]` `artifacts/potato-meet-0.3.2.zip` contains the manifest at the root and 25 files |
| Record the final ZIP SHA-256 and file list | Repository maintainer | `[x]` SHA-256: `8446871962799bd443a4866791d6943c7f58477aa6dd23cff4b33265d442a83e`; retain the file list with the release record |

Suggested final commands after the blockers are resolved:

```bash
npm ci
npm run check
npm run test:browser
npm run release:check
unzip -l artifacts/potato-meet-0.3.2.zip
shasum -a 256 artifacts/potato-meet-0.3.2.zip
```

Check that `manifest.json` appears at the root of the `unzip -l` output. Each later upload must use a higher manifest version.

Official source: [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare).

## 4. Privacy and support publication

| Check | Owner | Status / action |
|---|---|---|
| Replace operator, contact, address, support, policy URL, and publication-date placeholders | Privacy owner / website owner | `BLOCKED` Replace the named placeholders in `privacy-policy.md` and `chrome-web-store-listing.md` with confirmed values; do not infer them |
| Resolve the MediaPipe metrics question and revise the policy if necessary | Privacy owner and repository maintainer | `BLOCKED` Do not claim “no transmission” until the final package is verified |
| Publish the bilingual privacy policy at an HTTPS URL available without login | Website owner | `[ ]` Put it on the extension's site or one click from its homepage |
| Keep the privacy policy, detailed listing, Privacy tab, and in-product text consistent | Privacy owner / Dashboard editor | `[ ]` Local video and face processing must be disclosed |
| Disclose the limited Meet text/attribute scan used to exclude self video and screen shares | Privacy owner / Dashboard editor | `[ ]` This can include participant names and is local-only |
| Add the affirmative Chrome Web Store Limited Use statement | Website owner | `[x]` Draft text is in `privacy-policy.md`; it still needs publication |
| Decide and implement informed consent if final MediaPipe behavior or applicable law requires it | Privacy owner and repository maintainer | `BLOCKED` Google's current MediaPipe notice assigns this responsibility to the app developer |
| Provide a support URL or monitored support email | Website owner / Dashboard editor | `[ ]` Tell users not to send private meeting content |
| Define a process for privacy questions and deletion requests | Privacy owner | `[ ]` The extension has no operator server data; explain how users clear local settings |

Official sources:

- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

## 5. Dashboard listing and Privacy tab

| Check | Owner | Status / action |
|---|---|---|
| Paste the final detailed description in every supported locale | Dashboard editor | `[ ]` English and Japanese drafts are in `chrome-web-store-listing.md` |
| Select **Just for Fun** as the primary category | Dashboard editor | `[ ]` Use Communication only if final positioning centers on conferencing utility |
| Add homepage, support, and privacy policy URLs | Dashboard editor / website owner | `[ ]` URLs must be public and current |
| Paste the single-purpose statement | Dashboard editor | `[ ]` Use the exact narrow statement in `chrome-web-store-listing.md` |
| Justify `storage` | Dashboard editor | `[ ]` It stores only potato style and sunglasses preference |
| Justify Google Meet site access | Dashboard editor | `[ ]` Explain local frame processing, the limited tile-label scan, and overlay drawing |
| Select “No, I am not using remote code” | Dashboard editor | `[ ]` Confirm again against the final ZIP |
| Select data types conservatively | Dashboard editor / privacy owner | `[ ]` Current source supports Personally identifiable information, Personal communications, and Website content because local processing is still in scope |
| Complete every Limited Use certification | Dashboard editor / privacy owner | `BLOCKED` Complete only after MediaPipe metrics and any third-party transfer are resolved |
| Upload required localized screenshots and the global promotional tile | Dashboard editor | `[ ]` Current repository images do not meet the required store dimensions |
| Add support text and trademark attribution | Dashboard editor | `[ ]` Paste from `chrome-web-store-listing.md` |

## 6. Distribution decision

| Check | Owner | Status / action |
|---|---|---|
| Choose Public, Unlisted, or Private visibility | Publisher | `[ ]` Public is discoverable; Unlisted requires the URL; Private is limited to selected testers |
| Confirm target countries or all regions | Publisher | `[ ]` Consider support languages and local-law review |
| If using a separate test listing, label it “DEVELOPMENT BUILD” or “BETA” and state that it is for testing | Publisher / repository maintainer | `[ ]` Avoid repetitive-content enforcement |
| Decide automatic or deferred publishing | Publisher | `[ ]` Deferred publishing allows a manual release after approval; the staged approval expires after 30 days |
| Remember that every visibility setting has the same policy requirements and review | Publisher | `[x]` Do not use Private or Unlisted as a workaround for unresolved rights or privacy issues |

Official source: [Set up distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).

## 7. Review submission

| Check | Owner | Status / action |
|---|---|---|
| Upload the final ZIP and resolve all pre-submission installation-test errors | Publisher / repository maintainer | `[ ]` Upload only after all blockers above are closed |
| Paste reviewer test instructions | Dashboard editor | `[ ]` Use the two-participant steps in `chrome-web-store-listing.md` |
| State that no Potato Meet account or paid subscription is required | Dashboard editor | `[ ]` A Google account may still be required by Google Meet |
| Give reviewers all needed credentials if later features require them | Dashboard editor | `[ ]` Never place real user credentials in the repository |
| Re-read every field against the exact uploaded ZIP | Publisher and reviewer | `[ ]` Pay special attention to permissions, site access, data types, remote code, and MediaPipe behavior |
| Submit for review | Publisher | `[ ]` A new extension, new developer, broad access, or hard-to-review code can increase review time |
| Monitor review status and publisher email | Publisher | `[ ]` Contact developer support if review is pending more than three weeks, subject to current guidance |

Official sources:

- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Provide test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)
- [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process)
- [Check review status](https://developer.chrome.com/docs/webstore/check-review)

## 8. After publication

| Check | Owner | Frequency / trigger |
|---|---|---|
| Monitor support messages, reviews, crashes, and policy email | Publisher / maintainer | At least weekly |
| Re-test against current Google Meet UI and supported Chrome versions | Maintainer | Before each release and after significant Meet UI changes |
| Re-check MediaPipe privacy notice, terms, package version, model terms, and Google branding rules | Privacy owner / rights reviewer | Before each release and at least quarterly |
| Update the privacy policy, in-product disclosure, and Dashboard before changing data practices | Privacy owner / maintainer | Before the changed behavior is enabled |
| Increase the manifest version and upload a complete new ZIP | Maintainer / publisher | Every package update |
| Re-run external-network observation and inspect final package URLs | Maintainer | Every package update |
| Keep final ZIP hash, submission text, screenshots, test evidence, and rights evidence | Publisher | Every release |
| Respond promptly to policy warnings, rejection, or takedown notices | Publisher | On receipt |

## Repository-complete work in this document task

- `[x]` Paste-ready English and Japanese listing copy
- `[x]` Permission, host access, remote code, single-purpose, data-type, support, trademark, and reviewer-test text
- `[x]` Bilingual privacy-policy draft with local-processing disclosure and Limited Use statement
- `[x]` Official-source review and MediaPipe evidence matrix
- `[x]` Explicit release blockers and owner-separated checklist

These documents do not complete the developer-account actions, image creation, manifest icon work, rights confirmation, telemetry confirmation, consent decision, website publication, Dashboard entry, or final submission.
