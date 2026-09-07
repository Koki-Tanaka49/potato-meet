# Disabled toggle in an existing Meet tab (0.3.3)

The reported symptom was a grey, unclickable switch after entering a call with Potato Meet Off. In the popup, this means the tab did not return an available controller state. The exact reason the live tab lost its receiver was not captured; possible triggers include installation/update while the tab is already open. Starting Off itself is supported.

Version 0.3.4 attempts reconnection when the popup opens: if a state message fails and the active tab is on https://meet.google.com/, it injects the bundled content.js into that same tab and retries the state request. This restores the switch without navigating the meeting. Tracking stays Off until the user enables it. Failed site permissions still leave the existing connection notice visible. Other sites are never injection targets.

The bundle registers its controller only once per execution world, making reconnection safe alongside normal content-script injection. A separate reproduced popup race is also fixed: an old Off polling response cannot overwrite a completed On action.

Permissions change: scripting plus host_permissions for https://meet.google.com/* are required by Chrome's executeScript API. The site scope is unchanged from the existing content_scripts match. The repository's privacy and listing drafts have been updated; no store publication or installed-browser permission changes were performed.

Validation: popup tests cover reconnection from a missing receiver and delayed Off responses. Connection tests cover non-Meet pages, existing receivers, and denied injection. A browser test omits automatic content scripts to model an already-open tab, verifies a missing receiver, injects the bundle, checks the initial Off state, enables real local face tracking, and verifies reinjection does not duplicate or reset the controller. Normal and restrictive-CSP cases also pass. The user's live-call case still needs verification after installing 0.3.4.

Chrome API reference: https://developer.chrome.com/docs/extensions/reference/api/scripting
