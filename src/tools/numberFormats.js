/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtOneDecimal } from '@ham2k/lib-format-tools'

export function fmtMegabytes (bytes) {
  return fmtOneDecimal(bytes / (1024 * 1024)) + ' MB'
}

export function fmtGigabytes (bytes) {
  return fmtOneDecimal(bytes / (1024 * 1024 * 1024)) + ' GB'
}
