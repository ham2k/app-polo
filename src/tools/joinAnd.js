/*
 * Copyright ©️ 2024, 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GLOBAL from '../GLOBAL'

export function joinAnd(parts, { separator, conjunction, final } = {}) {
  separator = separator || GLOBAL?.t?.(['general.formatting.list.separator', ', ']) || ', '
  conjunction = conjunction || GLOBAL?.t?.(['general.formatting.list.conjunction', ' and ']) || ' and '
  final = final || GLOBAL?.t?.(['general.formatting.list.final', 'general.formatting.list.conjunction'], conjunction) || conjunction

  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts.join(`${conjunction}`)
  return parts.slice(0, -1).join(separator) + `${final}` + parts.slice(-1)
}

export function joinCalls(calls, options = {}) {
  const { markdown, ...rest } = options
  if (markdown) {
    calls = calls.map(call => `${call}`)
  }
  return joinAnd(calls, { ...rest, separator: ',\u2009', conjunction: ',\u2009' })
}
