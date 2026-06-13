// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable no-bitwise */

// From https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
export function hashCode (str) {
  str = str ?? ''
  let hash = 0
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}
