// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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
