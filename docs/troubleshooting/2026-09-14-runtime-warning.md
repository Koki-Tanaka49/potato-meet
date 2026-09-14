# MediaPipe OpenGL warning and multiple-face verification

The reported diagnostic ends with `OpenGL error checking is disabled`, prefixed by `W0907`. The preceding text is the bundled MediaPipe JavaScript runtime, not an exception stack.

MediaPipe emits this message at warning severity when its Emscripten build skips automatic OpenGL error checks. The message alone does not report a failed initialization, failed face detection, or an actual OpenGL error. The upstream implementation logs the warning and returns from the check; it does not abort the detector. See [MediaPipe's implementation](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/gpu/gl_context.cc).

No runtime patch or blanket console suppression is needed for this warning. If potatoes are still missing, check the popup's tracking status and capture the actual error message separately. After updating a locally loaded extension, reload the extension and refresh the Meet tab after the call.

Version 0.3.6 separately addresses multiple-face behavior:

| Case | Previous behavior | Updated behavior |
| --- | --- | --- |
| Several people in one camera | One face per frame | Up to four faces per frame |
| Different cameras using one detector | Video tracking shared across camera frames | Each frame detected independently |
| Slow detection across cameras | Fixed retention could expire before the next detection | Retention includes the measured detection interval |

Validation uses synthetic face fixtures, including two and four faces in one camera, eight camera overlays, restrictive CSP, and reconnection. A controller regression reproduces lost overlays with four cameras and 200 ms inference before the fix. These checks do not establish the cause or resolution of every missing overlay in a real meeting.
