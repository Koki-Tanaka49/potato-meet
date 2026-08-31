# Potato Meet Privacy Policy / プライバシーポリシー

> Draft for publication. Before publishing, replace every bracketed placeholder and complete the MediaPipe review described below. This document is an operational template, not legal advice.
>
> 公開用ドラフトです。公開前に角括弧のプレースホルダーをすべて置き換え、後述のMediaPipe確認を完了してください。本書は運用のためのひな型であり、法的助言ではありません。

- Last updated / 最終更新日: 2026-09-01
- Effective date / 発効日: `[PUBLICATION DATE / 公開日]`
- Operator / 運営者: `[DEVELOPER OR ORGANIZATION NAME / 開発者または組織名]`
- Contact / 問い合わせ先: `[CONTACT EMAIL OR SUPPORT FORM URL / 連絡用メールアドレスまたは問い合わせフォームURL]`

---

## 日本語

### 1. 対象

本プライバシーポリシーは、Chrome拡張機能「Potato Meet」（以下「本拡張機能」）に適用されます。運営者は`[DEVELOPER OR ORGANIZATION NAME]`です。

### 2. 単一の目的

本拡張機能の目的は、Google Meetで利用者のブラウザに表示されている相手参加者の顔に、動きに追従するポテト画像を重ねることです。表示は利用者自身のブラウザ内だけで行われ、相手へ送る映像や他の参加者が見る画面は変更しません。本拡張機能は、匿名化、本人確認、顔認識を目的としません。

### 3. 本拡張機能が取り扱う情報

Chrome Web Storeの方針では、端末内だけで処理する情報も開示対象です。本拡張機能は、機能の提供に必要な範囲で次の情報を取り扱います。

| 情報 | 取得元と目的 | 保存と保持期間 |
|---|---|---|
| Google Meetに表示中の相手参加者の映像フレーム | 顔の位置、向き、口の開閉を推定し、ポテトを重ねるため | 処理中のメモリで一時的に使用します。フレームごとの処理後に破棄し、永続保存しません |
| 顔の特徴点、顔の範囲、向き、口の開閉の推定結果 | ポテトの位置、角度、口の表示を調整するため | Meetタブの処理中だけメモリに保持します。機能をOFFにした時またはタブを閉じた時に破棄し、永続保存しません |
| Meetの参加者タイルにある表示テキスト、属性、映像トラックのラベル | 自分の映像と画面共有を対象から除外するため。参加者名を含む場合があります | 分類時に一時参照するだけで、永続保存しません |
| 選択したポテトの種類とサングラスのON/OFF | 次回も同じ表示設定を使えるようにするため | Chromeの`storage.local`に保存し、利用者が変更する、拡張機能のデータを消去する、またはアンインストールするまで保持します |

本拡張機能は音声を処理せず、マイク、カメラ、録画、閲覧履歴のChrome権限を要求しません。会議URL、映像、顔画像、顔の推定結果、参加者名を永続保存する機能はありません。

### 4. 利用目的

上記の情報は、次の目的に限って使用します。

- 相手参加者の顔を検出し、ポテト画像を追従表示すること
- 自分の映像と画面共有を表示対象から除外すること
- 利用者が選んだポテトの種類とサングラス設定を保持すること
- 機能の安全性、性能、信頼性を確認し、改善すること。ただし、現行実装には運営者の分析サーバーや遠隔ログはありません

広告、信用評価、データ販売、参加者の識別、会議内容の分析には使用しません。

### 5. 運営者による収集、保存、共有

現行実装には運営者が管理するサーバー、アカウント登録、分析サービス、広告サービス、遠隔ログがありません。運営者は、映像フレーム、顔の推定結果、Meet上の表示テキスト、会議URLを受信または保存する仕組みを設けていません。

ポテトの種類とサングラス設定は、利用者のChrome内にだけ保存されます。これらの設定を運営者へ送信する仕組みはありません。

### 6. MediaPipeとGoogleへの指標送信に関する未確定事項

本拡張機能は、`@mediapipe/tasks-vision@0.10.21`、同梱したWebAssemblyファイル、同梱した`face_landmarker.task`を使用します。GoogleのMediaPipe Tasks Privacy Noticeは、入力画像や動画は端末上で処理されGoogleのサーバーへ送られないと説明しています。一方、同じ告知は、MediaPipe Tasks APIが性能と利用状況の指標をGoogleへ送信すると説明しています。MediaPipe APIs Terms of Serviceには、SDKの利用状況、推論回数、ハードウェア性能、アプリID、処理媒体の一般的な特徴、ホスト環境などの例があります。

本プロジェクトの対象版0.10.21を使った現在の自動試験では、対象の操作中に外部HTTP通信は観測されていません。ただし、この試験だけでは、時間差、環境差、別の実行経路で指標が送信される可能性まで否定できません。Googleの告知も0.10.21のWeb版に限定した説明ではないため、対象版の実際の挙動は確認中です。

公開前に、運営者はこの点を解決しなければなりません。最終配布版で指標送信が行われる、または合理的に否定できない場合は、送信される情報、送信先であるGoogle、目的、保持期間またはGoogleの適用方針、必要な同意方法を本ポリシーとChrome Web Storeの申告に反映します。Googleによる保持期間は現在確認できていないため、本書では断定しません。現行プロジェクトには、運営者がこれらの指標を受け取るための管理画面や連携機能はありません。

公式資料:

- [MediaPipe Tasks Privacy Notice](https://developers.google.com/edge/mediapipe/solutions/tasks#mediapipe_tasks_privacy_notice)
- [MediaPipe APIs Terms of Service](https://developers.google.com/edge/mediapipe/legal/tos)
- [Google Privacy Policy](https://policies.google.com/privacy)

### 7. 保持期間と削除

- 映像フレームと顔の推定結果は永続保存しません。機能をOFFにするかMeetタブを閉じると、継続中の処理と表示用データを破棄します。
- Meet上の表示テキストと属性は分類時に一時参照し、永続保存しません。
- ポテトの種類とサングラス設定は、利用者が変更する、Chromeで拡張機能のデータを消去する、または本拡張機能をアンインストールするまで端末内に保持されます。
- 運営者のサーバーに利用者データを保持する仕組みはありません。
- MediaPipe指標が対象版から送信される場合のGoogle側の保持期間は確認中です。

### 8. 情報の保護

顔検出用のJavaScript、WebAssembly、モデルは拡張機能パッケージに同梱し、拡張機能内のURLから読み込みます。実行対象は`https://meet.google.com/*`に限定し、必要なChrome権限は設定保存用の`storage`だけです。ただし、端末、Chrome、Google Meet、第三者ライブラリに絶対的な安全性を保証するものではありません。

### 9. Chrome Web Store Limited Use

本拡張機能によるGoogle APIから受け取った情報の使用は、Limited Use要件を含む[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies#limited-use)に従います。利用者データは、開示した単一目的とその利用者向け機能の提供または改善に必要な範囲に限定して使用します。個人向け広告、リターゲティング広告、信用評価、データ販売には使用または提供しません。方針で認められる例外を除き、人が利用者データを読むことはありません。

### 10. 変更

情報の取り扱いを変更する場合は、変更後の処理を開始する前に本ポリシー、Chrome Web Storeの申告、必要な製品内表示を更新します。重要な変更について、適用法またはChrome Web Storeの方針上必要な場合は、利用者へ通知し同意を求めます。

### 11. 問い合わせ

本ポリシーまたは本拡張機能の情報の取り扱いに関する問い合わせ先:

- 運営者: `[DEVELOPER OR ORGANIZATION NAME]`
- メールまたは問い合わせフォーム: `[CONTACT EMAIL OR SUPPORT FORM URL]`
- 所在地（必要な場合）: `[MAILING ADDRESS OR NOT APPLICABLE]`

---

## English

### 1. Scope

This Privacy Policy applies to the Potato Meet Chrome extension (the “Extension”). The operator is `[DEVELOPER OR ORGANIZATION NAME]`.

### 2. Single purpose

The Extension adds animated potato images that follow the faces of other participants visible in a Google Meet call in the user's browser. The effect is visible only in the user's browser. It does not change the video sent to other participants or what other participants see. The Extension is not intended for anonymization, identity verification, or facial recognition.

### 3. Information handled by the Extension

Chrome Web Store policy requires disclosure even when information is processed only on the user's device. The Extension handles the following information only as needed to provide its feature.

| Information | Source and purpose | Storage and retention |
|---|---|---|
| Video frames of other participants currently displayed in Google Meet | To estimate face position, direction, and mouth opening and place the potato overlay | Used temporarily in memory. Each frame is discarded after processing and is not persistently stored |
| Estimated facial landmarks, face area, direction, and mouth opening | To position, rotate, and animate the overlay | Held in memory only while processing the Meet tab. Discarded when the feature is turned off or the tab closes; not persistently stored |
| Display text, attributes, and video-track labels from Meet participant tiles | To exclude the user's own video and screen shares. This material can include participant names | Read temporarily for classification and not persistently stored |
| Selected potato style and sunglasses on/off setting | To reuse the user's display preferences | Stored in Chrome `storage.local` until the user changes them, clears extension data, or uninstalls the Extension |

The Extension does not process audio and does not request Chrome permissions for the microphone, camera, recording, or browsing history. It has no feature that persistently stores meeting URLs, video, face images, facial estimates, or participant names.

### 4. Uses

The information above is used only to:

- detect faces of other participants and display a following potato image;
- exclude the user's own video and screen shares from the effect;
- retain the selected potato style and sunglasses setting; and
- verify and improve feature safety, performance, and reliability. The current implementation has no operator analytics server or remote logging.

It is not used for advertising, credit decisions, data sales, participant identification, or analysis of meeting content.

### 5. Collection, storage, and sharing by the operator

The current implementation has no operator-controlled server, account registration, analytics service, advertising service, or remote logging. The operator has not implemented a mechanism to receive or store video frames, facial estimates, Meet display text, or meeting URLs.

The potato style and sunglasses setting remain in the user's Chrome profile. The Extension has no mechanism to send those settings to the operator.

### 6. Unresolved MediaPipe metrics question

The Extension uses `@mediapipe/tasks-vision@0.10.21`, bundled WebAssembly files, and a bundled `face_landmarker.task` file. Google's MediaPipe Tasks Privacy Notice says that input images and video are processed on-device and are not sent to Google servers. The same notice says that MediaPipe Tasks APIs send performance and utilization metrics to Google. The MediaPipe APIs Terms of Service gives examples including SDK usage, inference counts, hardware performance, app ID, general characteristics of processed media, and host environment.

The project's current automated test did not observe external HTTP traffic during the covered flow with version 0.10.21. That test does not rule out delayed, environment-specific, or other execution paths. Google's notice is not specific to the Web 0.10.21 package, so the exact behavior of the version used here remains under review.

The operator must resolve this issue before publication. If the final package sends metrics, or if such transmission cannot reasonably be ruled out, the operator will update this policy and the Chrome Web Store disclosures with the exact information sent, Google as the recipient, the purpose, the retention period or applicable Google policy, and any required consent flow. Google's retention period for any such metrics has not been confirmed and is not asserted here. The current project has no dashboard or integration through which the operator receives these metrics.

Official sources:

- [MediaPipe Tasks Privacy Notice](https://developers.google.com/edge/mediapipe/solutions/tasks#mediapipe_tasks_privacy_notice)
- [MediaPipe APIs Terms of Service](https://developers.google.com/edge/mediapipe/legal/tos)
- [Google Privacy Policy](https://policies.google.com/privacy)

### 7. Retention and deletion

- Video frames and facial estimates are not persistently stored. Turning off the feature or closing the Meet tab stops ongoing processing and discards display state.
- Meet display text and attributes are read temporarily for classification and are not persistently stored.
- The potato style and sunglasses setting remain on the device until the user changes them, clears the Extension's data in Chrome, or uninstalls the Extension.
- There is no operator server that retains user data.
- Google's retention period remains under review if the MediaPipe version sends metrics.

### 8. Security

Face-processing JavaScript, WebAssembly, and the model are bundled in the extension package and loaded from extension URLs. Execution is limited to `https://meet.google.com/*`, and the only requested Chrome permission is `storage` for preferences. No device, browser, Google Meet service, or third-party component can be guaranteed to be completely secure.

### 9. Chrome Web Store Limited Use

The Extension's use of information received from Google APIs will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies#limited-use), including the Limited Use requirements. User data will be used only as necessary to provide or improve the disclosed single purpose and its user-facing features. It will not be used or transferred for personalized advertising, retargeting, credit decisions, or sale. Humans will not read user data except where an exception is permitted by the policy.

### 10. Changes

Before beginning a materially different data practice, the operator will update this policy, the Chrome Web Store disclosures, and any required in-product disclosure. The operator will notify users and request consent when required by applicable law or Chrome Web Store policy.

### 11. Contact

Questions about this policy or the Extension's handling of information can be sent to:

- Operator: `[DEVELOPER OR ORGANIZATION NAME]`
- Email or support form: `[CONTACT EMAIL OR SUPPORT FORM URL]`
- Mailing address, if required: `[MAILING ADDRESS OR NOT APPLICABLE]`

## Policy sources

- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Chrome Web Store privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
