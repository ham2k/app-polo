// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { prepareDateValue } from '@ham2k/lib-format-tools'

export function startOfDayInMillis (t) {
  if (t) t = prepareDateValue(t)
  else t = new Date()
  t.setHours(0, 0, 0, 0)
  return t.getTime()
}

const ONE_DAY = 24 * 60 * 60 * 1000

export function yesterdayInMillis () {
  const now = Date.now()
  return startOfDayInMillis(now - ONE_DAY)
}
