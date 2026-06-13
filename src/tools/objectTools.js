// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

export function removeEmptyValues (obj, options = {}) {
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key] !== null && obj[key] !== undefined && (obj[key] !== '' || options.allowEmptyStrings)) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}
