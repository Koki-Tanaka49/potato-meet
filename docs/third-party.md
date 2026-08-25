# 第三者ソフトウェア

## MediaPipe Tasks Vision

- パッケージ: `@mediapipe/tasks-vision@0.10.21`
- 公式プロジェクト: https://github.com/google-ai-edge/mediapipe
- ライセンス: Apache License 2.0
- ライセンス本文: `licenses/apache-2.0.txt`
- 追加の権利表示: `licenses/mediapipe-notice.txt`

ビルド時に、パッケージのJavaScriptとWebAssemblyを`dist`へコピーします。生成された`dist`はGitへ保存しません。

## MediaPipe Face Landmarker model

- ファイル: `face_landmarker.task`
- 公式配布元: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- 公式の使用例: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md

モデルはGitへ保存しません。`npm run build`は、モデルがない場合に公式配布元から取得し、使用前にSHA-256が完全に一致することを確認します。

上記の公式資料では、モデルファイル単体の再配布条件を明確に確認できていません。モデルを含む拡張機能パッケージを配布する前に、適用される条件を確認してください。
