/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// This regexp is derived from `@ham2k/lib-callsign`
const CALLSIGN_REGEXP =
  /(^|\W)([A-Z0-9]+\/){0,1}(5U[A-Z]*|[0-9][A-Z]{1,2}[0-9]|[ACDEHJLOPQSTUVXYZ][0-9]|[A-Z]{1,2}[0-9])([A-Z0-9]+)(\/[A-Z0-9/]+){0,1}(\W|$)/g

export function tweakStringForVoiceOver(str) {
  str = str.replaceAll(CALLSIGN_REGEXP, (match, p1, p2, p3, p4, p5, p6, p7) => {
    return p1 + [p2, p3, p4, p5].join('').split('').join('.') + '.' + p6
  })
  str = str.replaceAll('QSOs', 'Q sos')
  str = str.replaceAll('QSO', 'Q so')

  return str
}
