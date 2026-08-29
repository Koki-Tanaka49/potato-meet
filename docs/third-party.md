# Third-party software

## MediaPipe Tasks Vision

- Package: `@mediapipe/tasks-vision@0.10.21`
- Official project: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0
- License text: `licenses/apache-2.0.txt`
- Additional notices: `licenses/mediapipe-notice.txt`

The build copies the package's JavaScript and WebAssembly files into `dist`. The generated `dist` directory is not committed to Git.

## MediaPipe Face Landmarker model

- File: `face_landmarker.task`
- Official distribution source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- Official usage example: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md

The model is not committed to Git. If the model is missing, `npm run build` downloads it from the official source and verifies that its SHA-256 checksum matches exactly before use.

The official materials above do not clearly state the redistribution terms for the standalone model file. Confirm the applicable terms before distributing an extension package that includes the model.
