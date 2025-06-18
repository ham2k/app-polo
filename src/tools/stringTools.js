/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { capitalizeString } from './capitalizeString'

export function camelCaseToWords (camelCase, { capitalize } = {}) {
  let words = (camelCase || '').replace(/([A-Z])/g, ' $1')
  if (capitalize) words = capitalizeString(words)

  return words
}

export function simpleTemplate (template, values = {}, context = {}) {
  return template.replace(/\{(.*?)}/g, (match, key) => {
    if (typeof values[key] === 'function') {
      return values[key](key, context)
    } else if (typeof values._default === 'function') {
      return values._default(key, context)
    } else {
      return values[key] || match
    }
  })
}

export function countTemplate (count, { zero, one, more }, context = {}) {
  if (count === 0) {
    return simpleTemplate(zero ?? more, { ...context, count })
  } else if (count === 1) {
    return simpleTemplate(one ?? more, { ...context, count })
  } else {
    return simpleTemplate(more, { ...context, count })
  }
}

export function sanitizeToISO8859 (text) {
  if (!text) return ''
  return text.replace(/[”“]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x00-\xFF]/g, '·')
}

export function slashZeros (text) {
  // See "Combining Solidus" in https://en.wikipedia.org/wiki/Slashed_zero
  if (!text) return ''
  return text.replace(/0/g, '0̸')
}

export function sanitizeForMarkdown (text) {
  if (!text) return ''
  return text.replace(/^[-* \t–—]+/g, '')
}
