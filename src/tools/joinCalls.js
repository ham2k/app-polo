// Copyright ©️ 2024, 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { joinAnd } from '@ham2k/lib-format-tools'

export function joinCalls (calls, options = {}) {
  const { markdown, ...rest } = options
  if (markdown) {
    calls = calls.map(call => `${call}`)
  }
  return joinAnd(calls, { ...rest, separator: ',\u2009', conjunction: ',\u2009' })
}
