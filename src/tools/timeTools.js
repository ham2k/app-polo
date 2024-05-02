/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prepareTimeValue } from './timeFormats'

export function startOfDayInMillis (t) {
  if (t) t = prepareTimeValue(t)
  else t = new Date()
  t.setHours(0, 0, 0, 0)
  return t.getTime()
}

const ONE_DAY = 24 * 60 * 60 * 1000

export function yesterdayInMillis () {
  const now = Date.now()
  return startOfDayInMillis(now - ONE_DAY)
}
