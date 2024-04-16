/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function mergeQSOs (a, b) {
  if (!a || !b || a.key !== b.key) {
    return [a, b]
  }

  if (a.startOnMillis && b.startOnMillis && a.startOnMillis > b.startOnMillis) {
    a.startOnMillis = b.startOnMillis
    a.startOn = b.startOn
  }

  if (a.endOnMillis && b.endOnMillis && a.endOnMillis < b.endOnMillis) {
    a.endOnMillis = b.endOnMillis
    a.endOn = b.endOn
  }

  if (b.qsl) {
    a.qsl = { ...a.qsl, ...b.qsl }
    a.qsl.received = a.qsl?.received || b.qsl?.received
  }

  if (b.refs) a.refs = { ...a.refs, ...b.refs }

  return [a]
}
