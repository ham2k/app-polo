/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseCallsign } from '@ham2k/lib-callsigns'

export function parseStackedCalls (input) {
  // Stacked calls are separated by `//`
  // The last part of the stack that is a valid call is extracted as `call`
  // along with any other comma-separated calls that were part of that stack part, as `allCalls`.
  // The rest of the stack is returned as a string in`callStack`.

  input = (input || '').trim()
  const parts = input.split('//').filter(x => x)

  let call = null
  let allCalls = null
  const stack = []
  let i = parts.length - 1
  while (i >= 0) {
    if (call) {
      // if we already have a call, everything else goes to the stack
      stack.unshift(parts[i])
    } else {
      // Otherwise we look to see if the current part is a valid call

      // But first, we look for multiple calls and pick the last
      allCalls = parts[i].split(',').filter(x => x)
      call = allCalls[allCalls?.length - 1]

      const parsedCall = parseCallsign(call)

      // if not valid, add it to the stack and keep trying with the next part
      if (!parsedCall.baseCall && !(call?.indexOf('?') >= 0)) {
        call = null
        allCalls = null
        stack.unshift(parts[i])
      }
    }
    i--
  }

  return { call: call || '', allCalls: allCalls || [], callStack: stack.join('//') }
}

export function expandRSTValues (text, mode) {
  text = text?.trim() || ''
  if (text.length === 0) {
    if (mode === 'CW' || mode === 'RTTY') return '599'
    if (mode === 'FT8' || mode === 'FT4') return '+0'
    return '59'
  } else if (text.length === 1) {
    let readability = '5'
    const strength = text
    const tone = '9'
    if (strength === '1' || strength === '2' || strength === '3') {
      readability = '3'
    } else if (strength === '4') {
      readability = '4'
    }

    if (mode === 'CW' || mode === 'RTTY') {
      text = `${readability}${strength}${tone}`
    } else {
      text = `${readability}${strength}`
    }
  } else if (text.length === 2 && mode === 'CW') {
    text = `${text}9`
  }

  return text
}
