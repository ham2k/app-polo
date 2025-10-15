/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const MIXED_CASE_REGEX = /[A-Z][a-z]/g
const ALL_UPPER_CASE_REGEX = /^[A-Z]+$/g
const WORD_OR_HYPENED_SEPARATOR_REGEX = /([^\s-.]+?)([\s"“”‘’'-.]+|\s*$)/g
const LETTERS_ONLY_REGEX = /^[a-z]+$/
const PERIOD_REGEX = /\./g

const CAPTITALIZATION_EXCEPTIONS = {
  am: 'AM',
  cw: 'CW',
  iaru: 'IARU',
  ii: 'II',
  iii: 'III',
  iv: 'IV',
  ios: 'iOS',
  iota: 'IOTA',
  iphone: 'iPhone',
  ipad: 'iPad',
  arrl: 'ARRL',
  ares: 'ARES',
  clublog: 'ClubLog',
  fcc: 'FCC',
  fm: 'FM',
  ft4: 'FT4',
  ft8: 'FT8',
  flexradio: 'FlexRadio',
  gridtracker: 'GridTracker',
  ham2k: 'Ham2K',
  nasa: 'NASA',
  pota: 'POTA',
  sota: 'SOTA',
  qrm: 'QRM',
  qrn: 'QRN',
  qro: 'QRO',
  qrv: 'QRV',
  qrt: 'QRT',
  qrp: 'QRP',
  qrz: 'QRZ',
  qsb: 'QSB',
  qsl: 'QSL',
  qso: 'QSO',
  qsy: 'QSY',
  qth: 'QTH',
  rtty: 'RTTY',
  youtube: 'YouTube'
}

const MODAL_CAPITALIZATION_EXCEPTIONS = {
  address: {
    nsw: 'NSW',
    vic: 'VIC',
    qld: 'QLD',
    tas: 'TAS',
    act: 'ACT',
    pei: 'PEI',
    nwt: 'NWT'
  }
}

export function capitalizeString (str, options = {}) {
  let { content = 'text', force = true } = options

  if (!str) return ''

  str = `${str}`.trim()

  // If we're not forcing capitalization, only do it if the string is already mixed case
  if (!force && !str.match(MIXED_CASE_REGEX)) {
    force = true
  }

  return str.replace(WORD_OR_HYPENED_SEPARATOR_REGEX, (match, word, separator) => {
    if (force) {
      word = word.toLowerCase()
      if (CAPTITALIZATION_EXCEPTIONS[word]) {
        return CAPTITALIZATION_EXCEPTIONS[word] + separator
      } else if (MODAL_CAPITALIZATION_EXCEPTIONS[content] && MODAL_CAPITALIZATION_EXCEPTIONS[content][word]) {
        return MODAL_CAPITALIZATION_EXCEPTIONS[content][word] + separator
      } else if (word.length === 1 && content === 'name' && word.match(LETTERS_ONLY_REGEX)) {
        // Initials
        return word.toUpperCase() + (separator.match(PERIOD_REGEX) ? '' : '.') + separator
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1) + separator
      }
    } else {
      if (word.length === 1 && content === 'name' && word.match(ALL_UPPER_CASE_REGEX)) {
        // When respecting existing case, only add periods to initials if they are already capitalized
        return word.toUpperCase() + (separator.match(PERIOD_REGEX) ? '' : '.') + separator
      } else {
        return word + separator
      }
    }
  })
}
