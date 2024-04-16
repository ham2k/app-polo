/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const timerLast = {}
const timerStart = {}

export function logTimer (timer, msg, { reset } = {}) {
  const now = Date.now()
  if (reset || !timerStart[timer]) {
    timerStart[timer] = now
    timerLast[timer] = now
  }
  console.info(`[${timer}] ${now - timerLast[timer]} ms - ${msg}`)
  timerLast[timer] = now
}
