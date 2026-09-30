/** Shared between the service worker (writer) and the app (reader) for the Android share target. */
export const SHARE_CACHE = "meoden-shared"
export const SHARE_ACTION = "share-target"
/** Query flag the service worker adds when it redirects into the app after a share. */
export const SHARE_FLAG = "shared"
export const FILENAME_HEADER = "x-meoden-filename"
