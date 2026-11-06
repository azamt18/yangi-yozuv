export const MESSAGE_CONVERT_SELECTION = 'convert-selection';

/** Page view: { type, action: 'status' | 'start' | 'stop', force?: boolean } → { state }. */
export const MESSAGE_PAGE_VIEW = 'page-view';
export type PageViewState = 'off' | 'on' | 'not-uzbek';
