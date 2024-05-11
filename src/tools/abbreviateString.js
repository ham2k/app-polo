/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const ABBREVIATIONS = [
  ['National Park', 'NP'],
  ['State Park', 'SP'],
  [/National(?=\s|$)/g, 'Ntl.'],
  [/(Historical|Historic)(?=\s|$)/g, 'Hist.'],
  [/Preserve(?=\s|$)/g, 'Prsv.'],
  [/Reserve(?=\s|$)/g, 'Rsv.'],
  [/Monument(?=\s|$)/g, 'Mon.'],
  [/Conservation(?=\s|$)/g, 'Cons.'],
  [/Management(?=\s|$)/g, 'Mgmt.'],
  [/Recreational(?=\s|$)/g, 'Rec.'],
  [/Recreation(?=\s|$)/g, 'Rec.']
]

export function abbreviateString (str) {
  for (const [long, short] of ABBREVIATIONS) {
    str = str?.replace(long, short)
  }
  return str
}
