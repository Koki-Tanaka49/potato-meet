# Chrome Web Store publishing checklist

Updated: 2026-09-04

This checklist separates work that can be completed in the repository from actions that require the developer, publisher account, or a rights decision. It is not legal advice.

## Release gate

**MediaPipe review: cleared for this pinned release under the documented practical release standard.** Do not submit yet because the developer-account setup, public privacy/support URLs, real-Meet test, and other unchecked items below remain open.

| Mark | Meaning |
|---|---|
| `[x]` | Confirmed in the repository on 2026-09-04 |
| `[ ]` | Still required |
| `BLOCKED` | Must be resolved before packaging or submission |

## 1. Developer account

| Check | Owner | Status / action |
|---|---|---|
| Register a Chrome Web Store developer account and pay the one-time registration fee | Developer account owner | `[ ]` Not registered as of 2026-09-03; use a long-lived account that is checked regularly |
| Accept the current Developer Agreement and Program Policies | Developer account owner | `[ ]` Complete in the Dashboard |
| Set the publisher name | Developer account owner | `[ ]` Operator name confirmed as `Koki Tanaka`; enter and verify it in the Dashboard |
| Verify the contact email | Developer account owner | `[ ]` Required by the account setup flow |
| Set a monitored support email or support URL | Developer account owner | `[x]` Support email: `koki.tanaka.workwork@gmail.com`; planned URL: `https://koki-tanaka49.github.io/potato-meet/` |
| Enable publication and review notifications | Developer account owner | `[ ]` Monitor rejection, takedown, staged, and publication mail |
| Decide whether the item is owned by an individual or a publisher group | Developer account owner | `[ ]` Add only the members who need access and give them the minimum role |

Official sources:

- [Register your developer account](https://developer.chrome.com/docs/webstore/register)
- [Set up your developer account](https://developer.chrome.com/docs/webstore/set-up-account)
- [Share ownership](https://developer.chrome.com/docs/webstore/share-ownership)

## 2. Name, trademark, and images

| Check | Owner | Status / action |
|---|---|---|
| Decide the final title | Developer | `[x]` Selected `Potato Meet` on 2026-09-03; the manifest already matches |
| Review the final title against Google trademark guidance | Developer and rights reviewer | `[ ]` Keep the no-affiliation statement and complete the remaining review before submission |
| Keep the title, manifest, listing, screenshots, and support site consistent | Repository maintainer and Dashboard editor | `[x]` Repository materials use `Potato Meet`; recheck the Dashboard before submission |
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
| Limit Chrome permissions to the minimum | Repository | `[x]` `storage` for preferences; `scripting` and Meet-only host access for reconnection |
| Limit site access to Google Meet | Repository | `[x]` Content script and web-accessible resources match only `https://meet.google.com/*` |
| Bundle executable JavaScript and WebAssembly | Repository | `[x]` Current build copies the MediaPipe WebAssembly and bundles JavaScript locally |
| Bundle the pinned model and verify its SHA-256 | Repository | `[x]` Build verifies `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| Review redistribution of the exact `face_landmarker.task` object | Developer / rights reviewer | `[x]` Practical release decision recorded: all three component model cards state Apache 2.0, and the pinned hash exactly matches a model bundled by a currently published Chrome Web Store extension |
| Review MediaPipe Web 0.10.21 external traffic in the final package | Repository maintainer and privacy owner | `[x]` Automated test observed no external HTTP traffic; runtime inspection found no known MediaPipe outbound indicators; the build rejects a different MediaPipe version or known indicators |
| Include Apache 2.0 text and applicable notices | Repository | `[x]` The build copies `licenses/apache-2.0.txt` and `licenses/mediapipe-notice.txt` |
| Add a distributed notice that identifies the appended changes to `vision_wasm_internal.js`, or obtain a review that the existing notice is sufficient | Repository maintainer / rights reviewer | `[x]` The build appends an inline modification notice and `docs/third-party.md` describes the two assignments and their purpose |
| Add the required extension icon to the package | Repository maintainer | `[x]` The build includes only the four runtime icon sizes and excludes image-generation originals |
| Confirm `name`, `version`, `description`, and icons before ZIP creation | Repository maintainer | `[x]` Version 0.3.2 package metadata and icon references are internally consistent; repeat after any title change |
| Run type checking, unit tests, and production build | Repository maintainer | `[x]` `npm run check` passed on 2026-09-04; all 12 unit tests passed, including the MediaPipe version and outbound-indicator build check |
| Run the automated browser test | Repository maintainer | `[x]` `npm run test:browser` passed on 2026-09-04, including the prominent in-product local-processing notice |
| Run the manual real-Meet test | Tester | `[ ]` Schedule later; include two participants, head direction, mouth movement, tile changes, and a 15-minute session |
| Inspect the built package for secrets, source-only fixtures, development files, unexpected URLs, and remote code | Repository maintainer | `[x]` `npm run release:check` passed on 2026-09-04; all 25 files, text URLs, secret-like patterns, and the distributed modification notice were reviewed. Only expected Meet and third-party notice URLs were found |
| Create a ZIP with `manifest.json` at the ZIP root | Repository maintainer | `[x]` `artifacts/potato-meet-0.3.2.zip` contains the manifest at the root and 25 files |
| Record the final ZIP SHA-256 and file list | Repository maintainer | `[x]` Candidate SHA-256: `fb437bb8023a577e7a5be091cd9fa0c8fcc463c4689c3836bb4b33e729d4db8b`; replace this record if any release file changes |

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
| Replace operator, contact, address, support, policy URL, and publication-date placeholders | Privacy owner / website owner | `BLOCKED` Operator, email, planned URLs, and `Not applicable` address are recorded. Set the effective date when the policy is published |
| Record the MediaPipe external-traffic review in the policy | Privacy owner and repository maintainer | `[x]` Policy describes the 0.10.21 test, runtime inspection, version pin, and update-time re-review |
| Publish the bilingual privacy policy at an HTTPS URL available without login | Website owner | `[ ]` Draft target: `https://koki-tanaka49.github.io/potato-meet/privacy-policy.html`; GitHub Pages is not enabled yet |
| Keep the privacy policy, detailed listing, Privacy tab, and in-product text consistent | Privacy owner / Dashboard editor | `[ ]` Repository text is aligned; verify the final published policy and Dashboard answers |
| Disclose the limited Meet text/attribute scan used to exclude self video and screen shares | Privacy owner / Dashboard editor | `[x]` Popup, policy, and listing drafts now disclose local participant-tile text processing |
| Add the affirmative Chrome Web Store Limited Use statement | Website owner | `[x]` Draft text is in `privacy-policy.md`; it still needs publication |
| Provide an affirmative action before local face processing begins | Privacy owner and repository maintainer | `[x]` Processing is off by default and begins only after the user sees the local-processing notice and turns on `Show potatoes` |
| Provide a support URL or monitored support email | Website owner / Dashboard editor | `[x]` `koki.tanaka.workwork@gmail.com` and the safety notice are included in the support-page draft; publication is tracked separately |
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
| Add homepage, support, and privacy policy URLs | Dashboard editor / website owner | `[ ]` Planned URLs are documented; verify them after GitHub Pages is enabled |
| Paste the single-purpose statement | Dashboard editor | `[ ]` Use the exact narrow statement in `chrome-web-store-listing.md` |
| Justify `storage` | Dashboard editor | `[ ]` It stores only potato style and sunglasses preference |
| Justify `scripting` and Meet host access | Dashboard editor | `[ ]` Restore a missing content-script connection in the existing Meet tab; use the updated listing justification |
| Justify Google Meet site access | Dashboard editor | `[ ]` Explain local frame processing, the limited tile-label scan, and overlay drawing |
| Select “No, I am not using remote code” | Dashboard editor | `[ ]` Confirm again against the final ZIP |
| Select data types conservatively | Dashboard editor / privacy owner | `[ ]` Current source supports Personally identifiable information, Personal communications, and Website content because local processing is still in scope |
| Complete every Limited Use certification | Dashboard editor / privacy owner | `[ ]` The reviewed release supports no external transfer; complete only after the published policy and final uploaded ZIP are verified |
| Upload required localized screenshots and the global promotional tile | Dashboard editor | `[ ]` Repository assets meet the required dimensions; visually recheck and upload them after the release blockers are closed |
| Add support text and trademark attribution | Dashboard editor | `[ ]` Paste from `chrome-web-store-listing.md` |

## 6. Distribution decision

| Check | Owner | Status / action |
|---|---|---|
| Choose Public, Unlisted, or Private visibility | Publisher | `[x]` Start as **Unlisted**; later change to Public in the Distribution tab and republish, allowing time for review |
| Confirm target countries or all regions | Publisher | `[x]` Start with **Japan only** |
| Confirm initial pricing and purchases | Publisher / repository maintainer | `[x]` Initial release is free with no advertising or in-extension purchases; review implementation and disclosures before adding future monetization |
| If using a separate test listing, label it “DEVELOPMENT BUILD” or “BETA” and state that it is for testing | Publisher / repository maintainer | `[ ]` Avoid repetitive-content enforcement |
| Decide automatic or deferred publishing | Publisher | `[x]` Publish the Unlisted item automatically after approval |
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
- `[x]` MediaPipe practical release decision, remaining blockers, and owner-separated checklist

These documents record the MediaPipe rights and external-traffic decision but do not complete developer-account actions, website publication, real-Meet validation, Dashboard entry, or final submission. Image creation and manifest icon integration are complete in the repository.
