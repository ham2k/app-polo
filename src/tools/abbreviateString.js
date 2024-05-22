/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const ABBREVIATIONS = [
  ['National Park', 'NP'],
  ['State Park', 'SP'],
  ['Area of Outstanding Natural Beauty', 'AONB'],
  [/Site of (?:Special|Significant) Scientific Interest/, 'SSSI'], // Significant commonly misused
  [/National(?=\s|$)/g, 'Ntl.'],
  [/(Historical|Historic)(?=\s|$)/g, 'Hist.'],
  [/Preserve(?=\s|$)/g, 'Prsv.'],
  [/Reserve(?=\s|$)/g, 'Rsv.'],
  [/Monument(?=\s|$)/g, 'Mon.'],
  [/Conservation(?=\s|$)/g, 'Cons.'],
  [/Management(?=\s|$)/g, 'Mgmt.'],
  [/(Recreational|Recreation)(?=\s|$)/g, 'Rec.'],
  [/Regional(?=\s|$)/g, 'Reg.'],
  [/Landscape(?=\s|$)/g, 'Lndscp.'],
  [/Protected(?=\s|$)/g, 'Prot.']
]

export function abbreviateString (str) {
  for (const [long, short] of ABBREVIATIONS) {
    str = str?.replace(long, short)
  }
  return str
}
