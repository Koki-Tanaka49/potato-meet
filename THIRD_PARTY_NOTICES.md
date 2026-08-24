# Third-party notices

## MediaPipe Tasks Vision

- Package: `@mediapipe/tasks-vision@0.10.21`
- Project: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0
- License text: `third_party/Apache-2.0.txt`
- Additional upstream notice: `third_party/MediaPipe-NOTICE.txt`

The build copies the package's local JavaScript and WebAssembly runtime into `dist`. The generated `dist` directory is not committed to this repository.

## MediaPipe Face Landmarker model

- File: `face_landmarker.task`
- Official source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- Official usage reference: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md

The model is not committed to this repository. `npm run build` downloads it from the official source when absent and verifies the exact SHA-256 before use. The official materials above do not clearly state separate redistribution terms for the model file. Verify the applicable terms before distributing a packaged extension that contains the model.
