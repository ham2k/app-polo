// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Cursor-preserving formatters for <H2kNativeTextInput>.
//
// The native control marks the caret position with a single sentinel character
// (CURSOR, U+0001) inside the string it sends to JS. Because the sentinel is a
// non-printable control char that never appears in legitimate input (callsigns,
// RST, grids, etc.), all of these become plain `string -> string` functions and
// the caret "rides along" for free — no selection math required.
//
// Character-class filters (numeric/decimal/rst) would otherwise strip the
// sentinel, so they run through `aroundCursor`, which applies the filter to the
// text on each side of the caret independently and re-inserts the marker.
//
// An `onValueFormatting` callback receives the sentinel-bearing string and must
// return a sentinel-bearing string. Compose the helpers below, or write your own.

// U+0001 (Start Of Heading). Defined via fromCharCode so there is no raw control
// character in the source. Must match CURSOR_SENTINEL on the native side.
export const CURSOR = String.fromCharCode(1)

const NOT_NUMBER_WITH_SIGNS = /[^0-9+-]/g
const NOT_NUMBER_WITH_SIGNS_AND_PERIODS = /[^0-9+,.-]/g
const NOT_RST_WITH_SIGNS = /[^0-9A+-]/g
const SIGN_AFTER_A_DIGIT = /([\d,.])[+-]/g
const LEFT_TRIM = /^\s+/ // \s never matches the sentinel, so the caret is safe
const SPACES = / /g

// Apply a plain string->string filter to the text on each side of the caret,
// keeping the sentinel in place. If there is no sentinel (e.g. a programmatic
// value), the filter is applied to the whole string.
const aroundCursor = (fn) => (text) => {
  const i = text.indexOf(CURSOR)
  if (i < 0) return fn(text)
  return fn(text.slice(0, i)) + CURSOR + fn(text.slice(i + CURSOR.length))
}

export const noSpaces = (t) => t.replace(SPACES, '')
export const leftTrim = (t) => t.replace(LEFT_TRIM, '')
export const periodToSlash = (t) => t.replaceAll('.', '/')
export const numeric = aroundCursor((t) => t.replace(NOT_NUMBER_WITH_SIGNS, '').replace(SIGN_AFTER_A_DIGIT, '$1'))
export const decimal = aroundCursor((t) => t.replace(NOT_NUMBER_WITH_SIGNS_AND_PERIODS, '').replace(SIGN_AFTER_A_DIGIT, '$1'))
export const rst = aroundCursor((t) => t.toUpperCase().replace(NOT_RST_WITH_SIGNS, ''))

// Compose several formatters left-to-right. Falsy entries are skipped, so you can
// write `compose(noSpaces, mode === 'callsign' && periodToSlash)`.
export const compose = (...fns) => (t) =>
  fns.reduce((acc, fn) => (fn ? fn(acc) : acc), t)

// Helpers for authoring formatters that want the two halves around the caret
// instead of operating on the whole sentinel-bearing string.
export function splitAtCursor (text) {
  const i = text.indexOf(CURSOR)
  if (i < 0) return [text, '']
  return [text.slice(0, i), text.slice(i + CURSOR.length)]
}

export function joinAtCursor (before, after) {
  return `${before}${CURSOR}${after}`
}

export function stripCursor (text) {
  return text.replaceAll(CURSOR, '')
}
