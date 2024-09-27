/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const THOUSANDS_DELIMITER_REGEX = /^(\d+)(\d\d\d)([.,]\d+|)$/
const TRAILING_DIGITS_REGEX = /([.,])(\d+)$/

export function fmtFreqInMHz (freq, { mode } = { mode: 'trim' }) {
  if (freq && freq.toFixed) {
    const withDecimals = freq.toFixed(3)
    const withSeparator = withDecimals.replace(THOUSANDS_DELIMITER_REGEX, '$1.$2$3')
    if (mode === 'full') {
      return withSeparator
    } else if (mode === 'compact') { // Remove decimals, but show separator or space for alignment
      return withSeparator.replace(TRAILING_DIGITS_REGEX, (match, p1, p2) => p2 === '000' ? ' ' : p1)
    } else { // Remove trailing zeroes
      return withSeparator.replace(TRAILING_DIGITS_REGEX, (match, p1, p2) => p2 === '000' ? '' : p1 + p2)
    }
  } else {
    return ''
  }
}

export function partsForFreqInMHz (freq) {
  const parts = fmtFreqInMHz(freq, { compact: false }).split(/[,.]/)
  parts[1] = parts[1] ?? '000'
  parts[2] = parts[2] ?? '000'
  return parts
}

const REMOVE_NON_DIGITS_REGEX = /[^0-9.,]/g
const MORE_THAN_ONE_PERIOD_REGEX = /(\.)(\d+)(\.)/g

export function parseFreqInMHz (freq) {
  if (typeof freq === 'number') return freq

  if (freq) {
    freq = freq.replace(REMOVE_NON_DIGITS_REGEX, '')
    freq = freq.replace(',', '.')
    freq = freq.replace(MORE_THAN_ONE_PERIOD_REGEX, '$2$3')

    let numericFreq = parseFloat(freq)
    if (numericFreq < 1000) {
      numericFreq *= 1000
    }
    return numericFreq
  } else {
    return null
  }
}
