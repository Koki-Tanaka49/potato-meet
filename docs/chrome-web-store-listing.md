# Chrome Web Store listing and review text

Updated: 2026-09-01

This document contains paste-ready text for the Chrome Web Store Developer Dashboard. It is not legal advice. Do not submit the item until the two MediaPipe blockers in [mediapipe-distribution-review.md](./mediapipe-distribution-review.md) are resolved and all placeholders are replaced.

## Current implementation used for these statements

| Item | Current implementation |
|---|---|
| Manifest | Manifest V3, version 0.3.2 |
| Chrome permission | `storage` only |
| Site access | Content script and bundled resources are limited to `https://meet.google.com/*` |
| Main processing | Other participants' visible video frames are processed in a local Worker using bundled MediaPipe JavaScript, WebAssembly, and model files |
| Persistent data | Potato style and sunglasses setting in `chrome.storage.local` |
| Not persistently stored | Video, face images, facial landmarks, direction, mouth state, participant names, meeting URL, and audio |
| External runtime traffic | No external HTTP request was observed in the current automated browser test; the MediaPipe version-specific metrics question is unresolved |

## 1. Title candidates

The store title comes from the manifest `name` field. The current value is `Potato Meet`; changing or localizing it requires a source and manifest change outside this document-only task.

| Locale | Candidate | Recommendation and trademark note |
|---|---|---|
| English | **Potato Overlay for Google Meet™** | Recommended format because it describes compatibility and keeps the extension's own name separate from the Google product name. Requires a manifest change |
| English | Potato Meet | Matches the current manifest, but “Meet” may be understood as part of Google's mark. Obtain a trademark review before using it as the final product name |
| Japanese | **Google Meet™用ポテトオーバーレイ** | Recommended Japanese compatibility description. Requires manifest localization and a source change |
| Japanese | Potato Meet（ポテトミート） | Easy to recognize, but has the same trademark concern as the current English name |

Do not use a Google Meet logo or a modified Google product icon as the extension icon. Google's current guidance permits accurate plain-text references but says not to imply affiliation, endorsement, or sponsorship and not to incorporate Google trademarks into a product name. The Google Workspace branding guide gives “for [Google product]” as the safer compatibility form.

Official sources:

- [Google Brand Resource Center guidance](https://about.google/brand-resource-center/guidance/)
- [Google Workspace Marketplace branding guidelines](https://developers.google.com/workspace/marketplace/terms/branding)

## 2. Short descriptions

Chrome requires the manifest description to be no more than 132 characters. Counts below include spaces and punctuation and were checked as Unicode code points.

### English — 117 characters

```text
Adds animated potatoes to faces in Google Meet. Video frames and face analysis stay in the browser and are not saved.
```

### Japanese — 59 characters

```text
Google Meetの相手参加者の顔に動くポテトを表示します。映像と顔の推定結果はブラウザ内で処理し、保存しません。
```

The current manifest description is also within the 132-character limit, but changing it still requires a manifest update and version review.

## 3. Detailed description

### English

```text
Potato Overlay for Google Meet™ adds animated potato images over the faces of other participants visible in your Google Meet call.

Open the extension popup in a Google Meet tab and turn on “Show potatoes.” The extension detects visible camera faces, follows face position and direction, and reacts to mouth movement. You can choose from three potato styles and add sunglasses. The effect appears only in your browser. It does not alter the camera video you send or what other participants see.

Privacy by design
• Video frames are processed in your browser for the overlay feature.
• Video, face images, facial landmarks, face direction, mouth state, participant names, and meeting URLs are not persistently stored.
• Audio is not processed.
• The extension has no account, advertising, operator analytics server, or remote logging.
• The only requested Chrome permission is storage, used to remember the selected potato style and sunglasses setting.
• The extension runs only on https://meet.google.com/*.

The extension reads limited Google Meet tile text and attributes only to exclude your own video and screen shares. This information is processed locally and is not persistently stored.

Potato Overlay for Google Meet is a visual effect, not an anonymization, identity-verification, or facial-recognition tool. Face detection can be affected by lighting, face size, occlusion, camera angle, and changes to the Google Meet interface.

Support: [SUPPORT URL OR EMAIL]
Privacy policy: [PUBLIC PRIVACY POLICY URL]

Google Meet™ is a trademark of Google LLC. This extension is an independent product and is not affiliated with, endorsed by, or sponsored by Google LLC.
```

### Japanese

```text
Google Meet™用ポテトオーバーレイは、Google Meetで表示中の相手参加者の顔に、動きに追従するポテト画像を重ねるChrome拡張機能です。

Google Meetのタブで拡張機能のポップアップを開き、「Show potatoes」をONにすると使えます。表示中のカメラ映像から顔の位置と向きを推定し、口の動きにも反応します。3種類のポテトとサングラスを選べます。表示は自分のブラウザ内だけで行われ、相手へ送るカメラ映像や他の参加者が見る画面は変わりません。

プライバシーへの配慮
・映像フレームはポテト表示のためにブラウザ内で処理します。
・映像、顔画像、顔の特徴点、向き、口の状態、参加者名、会議URLは永続保存しません。
・音声は処理しません。
・アカウント、広告、運営者の分析サーバー、遠隔ログはありません。
・Chromeの権限はstorageだけで、ポテトの種類とサングラス設定の保存に使います。
・実行先はhttps://meet.google.com/*だけです。

自分の映像と画面共有を対象から除外するため、Google Meetの参加者タイルにある表示テキストと属性を必要な範囲で一時参照します。この情報は端末内で処理し、永続保存しません。

本拡張機能は見た目を変えるための機能であり、匿名化、本人確認、顔認識を目的としません。照明、顔の大きさ、遮蔽、カメラ角度、Google Meetの画面仕様変更により、顔を検出できない場合があります。

サポート: [SUPPORT URL OR EMAIL]
プライバシーポリシー: [PUBLIC PRIVACY POLICY URL]

Google Meet™はGoogle LLCの商標です。本拡張機能は独立した製品であり、Google LLCとの提携、承認、後援関係はありません。
```

## 4. Category

| Priority | Dashboard category | Reason |
|---:|---|---|
| 1 | **Just for Fun** | The main user value is a playful visual effect |
| 2 | Communication | It enhances a video-conferencing experience, but communication itself is not provided by the extension |

Use **Just for Fun** unless the final product positioning changes. The current category list and definitions are in [Chrome Web Store Best Practices](https://developer.chrome.com/docs/webstore/best-practices#choose_your_extensions_category_well).

## 5. Privacy tab: paste-ready answers

### Single purpose

```text
Add locally generated animated potato overlays that follow the faces of other participants visible in a Google Meet call.
```

Japanese working translation:

```text
Google Meetで表示中の相手参加者の顔に、ブラウザ内で生成した動くポテト画像を追従表示します。
```

### `storage` permission justification

```text
The storage permission is used only to save the user's selected potato style and sunglasses on/off preference in chrome.storage.local. Video, face images, facial landmarks, participant names, and meeting URLs are not stored with this permission.
```

### Host access justification for `https://meet.google.com/*`

```text
Access is limited to https://meet.google.com/*. It is required to find visible participant video elements, process current video frames locally for face position, direction, and mouth state, read limited tile labels and attributes to exclude the user's own video and screen shares, and draw the potato overlay. The extension does not run on other sites.
```

### WebAssembly content security policy note

This is not a permission field, but add it to reviewer notes if a reviewer asks about `wasm-unsafe-eval`:

```text
The extension_pages content security policy includes wasm-unsafe-eval only so the bundled MediaPipe WebAssembly runtime can be instantiated. The WebAssembly, its loader, the worker script, and the model are all included in the extension package and loaded through chrome.runtime.getURL(). No remote script or WebAssembly is executed.
```

### Remote code declaration

Select:

```text
No, I am not using remote code.
```

Reviewer explanation:

```text
All executable JavaScript and WebAssembly are bundled in the extension ZIP. The face-processing worker is created from a script bundled in the extension, and the worker, WebAssembly loader, WebAssembly binary, model, and images are loaded from chrome-extension:// URLs generated with chrome.runtime.getURL(). The model is data and is also bundled. The build process may download the pinned model before packaging, but the installed extension does not download executable code at runtime.
```

Chrome defines remote hosted code as executable JavaScript or WebAssembly loaded from outside the extension package. See [Deal with remote hosted code violations](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code).

## 6. Privacy tab: data types

Local-only access still has to be disclosed. For the current source, the conservative and evidence-based selection is:

| Dashboard data type | Select? | Current handling |
|---|---:|---|
| Personally identifiable information | **Yes** | Meet tile text or attributes scanned to exclude self video and screen shares can include participant names. It is not extracted as an identity record, persisted, or intentionally transmitted |
| Personal communications | **Yes** | Current frames from other participants' Meet video are processed locally to place the overlay |
| Website content | **Yes** | The extension reads visible Meet video elements and limited tile labels and attributes on `meet.google.com` |
| Health information | No | It does not diagnose health or infer a health condition |
| Financial and payment information | No | Not accessed |
| Authentication information | No | Passwords, tokens, cookies, and sign-in credentials are not accessed |
| Location | No | Not accessed |
| Web history | No | Browsing history is not accessed or recorded; execution is limited to the current Meet page |
| User activity | No | Clicks, keystrokes, mouse movement, and browsing behavior are not tracked |

Derived face position, direction, and mouth state should be described in the privacy policy and detailed description even if the Dashboard has no exact matching checkbox. These values are used in memory and not persistently stored.

### Limited Use certifications

The final answers must match the final package and published privacy policy. For the current intended design, the operator should be able to certify that data is used only for the disclosed single purpose, is not used for personalized advertising, is not sold, and is not read by humans. **Do not submit these certifications yet:** the version-specific MediaPipe metrics transfer remains unresolved.

After resolving that question, use one of these paths:

| Final finding | Required Dashboard action |
|---|---|
| Confirmed no MediaPipe metrics or other external user-data transfer in the final package | Certify no transfer and keep the local-processing disclosures above |
| Metrics are sent or cannot reasonably be ruled out | Disclose the exact metrics and Google as recipient, make the privacy policy and in-product notice consistent, obtain any required informed consent, and confirm the transfer fits Chrome Web Store Limited Use before certifying |

Required public Limited Use statement, already included in `privacy-policy.md`:

```text
The Extension's use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.
```

Chrome's official FAQ explicitly says local processing must be disclosed: [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## 7. Support text

### English

```text
Need help or found a problem? Contact [SUPPORT EMAIL] or visit [SUPPORT URL]. Please include the Potato Meet version, Chrome version, operating system, and steps to reproduce. Do not send meeting recordings, participant images, meeting links, passwords, or other private meeting content.
```

### Japanese

```text
使い方の質問や不具合は、[SUPPORT EMAIL]または[SUPPORT URL]へお知らせください。Potato Meetのバージョン、Chromeのバージョン、OS、再現手順を記載してください。会議録画、参加者の画像、会議リンク、パスワード、その他の非公開の会議内容は送らないでください。
```

## 8. Trademark attribution

Use this in both the English and Japanese listings and on the support or homepage site:

```text
Google Meet™ is a trademark of Google LLC. This extension is an independent product and is not affiliated with, endorsed by, or sponsored by Google LLC.
```

```text
Google Meet™はGoogle LLCの商標です。本拡張機能は独立した製品であり、Google LLCとの提携、承認、後援関係はありません。
```

## 9. Reviewer test instructions

No Potato Meet account or paid subscription is required. A Google account may be required by Google Meet. A complete test requires two participants or a second device because the extension intentionally excludes the reviewer's own video.

```text
1. Install the extension and open https://meet.google.com/ in desktop Chrome.
2. Start or join a test meeting with at least two participants and make another participant's camera video visible. The extension intentionally excludes the current user's own video and screen shares.
3. Click the extension toolbar icon. Confirm the popup shows three potato styles, a “Show potatoes” switch, and a sunglasses switch.
4. Turn on “Show potatoes.” Expected: a potato overlay appears only after a face is detected in the other participant's visible camera tile. It does not appear on the current user's tile or a screen-share tile.
5. Ask the other participant to turn their head and open and close their mouth. Expected: the overlay follows face position and direction and changes its mouth state.
6. Select each potato style and toggle sunglasses. Expected: the visible overlay and popup preview update. The selected style and sunglasses preference remain after the popup is reopened.
7. Turn off “Show potatoes.” Expected: all overlays disappear and face processing stops for that Meet tab.
8. Open a non-Meet tab and open the popup. Expected: the overlay switch is unavailable and the extension states that Google Meet must be opened.

Privacy notes for review:
• The only Chrome permission is storage, used for potato style and sunglasses preferences.
• Runtime access is limited to https://meet.google.com/*.
• Video frames and facial estimates are processed in a local Worker and are not persistently stored.
• All JavaScript, WebAssembly, the Face Landmarker model, and image assets are bundled in the extension package.
• No operator account, analytics service, advertising, remote logging, or operator-controlled server is used.
```

## 10. Listing asset warning

The repository's current screenshots are not ready for upload:

- `docs/images/potato-meet-browser.png` is 1280×720, not the required 1280×800 or 640×400.
- `docs/images/potato-meet-popup.png` is 360×640, not a valid store screenshot size.
- No 128×128 store icon or 440×280 small promotional tile is currently present.

Use the exact asset requirements in [Chrome Web Store image guidance](https://developer.chrome.com/docs/webstore/images) and the checklist in [publishing-checklist.md](./publishing-checklist.md).

## Official Chrome Web Store sources

- [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Provide test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)
