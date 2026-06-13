// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

const timerLast = {}
const timerStart = {}

export function logTimer (timer, msg, { reset, sinceLast } = { reset: false, sinceLast: false }) {
  const now = Date.now()
  if (reset || !timerStart[timer]) {
    timerStart[timer] = now
    timerLast[timer] = now
  }
  if (sinceLast) {
    console.info(`[${timer}] ${now - timerLast[timer]} ms since last - ${msg}`)
  } else {
    console.info(`[${timer}] ${now - timerStart[timer]} ms total - ${msg}`)
  }
  timerLast[timer] = now
}
