/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prepareTimeValue, fmtShortTimeZulu, fmtTimeZulu, fmtDateZulu, fmtDateTimeZuluDynamic, fmtADIFTime, fmtCabrilloTime } from './timeFormats'

describe('prepareTimeValue', () => {
  it('should work', () => {
    expect(prepareTimeValue('2021-01-01T12:34:56Z')).toEqual(new Date('2021-01-01T12:34:56Z'))
    expect(prepareTimeValue('2021-01-01T08:34:56-0400')).toEqual(new Date('2021-01-01T12:34:56Z'))
  })
})

describe('fmtShortTimeZulu', () => {
  it('should work', () => {
    expect(fmtShortTimeZulu('2021-01-01T12:34:56.789Z')).toEqual('12:34z')
    expect(fmtShortTimeZulu('2021-01-01T08:34:56-0400')).toEqual('12:34z')
    expect(fmtShortTimeZulu('2021-01-01T12:34:56.789Z', { showZ: false })).toEqual('12:34')
  })
})

describe('fmtTimeZulu', () => {
  it('should work', () => {
    expect(fmtTimeZulu('2021-01-01T12:34:56.789Z')).toEqual('12:34:56z')
    expect(fmtTimeZulu('2021-01-01T08:34:56-0400')).toEqual('12:34:56z')
    expect(fmtTimeZulu('2021-01-01T12:34:56.789Z', { showZ: false })).toEqual('12:34:56')
  })
})

describe('fmtDateZulu', () => {
  it('should work', () => {
    expect(fmtDateZulu('2021-01-01T12:34:56.789Z')).toEqual('2021-01-01')
    expect(fmtDateZulu('2021-01-01T08:34:56-0400')).toEqual('2021-01-01')
  })
})

describe('fmtDateTimeZuluDynamic', () => {
  it('should work', () => {
    const now = new Date('2024-03-12T08:00:00-0400')

    expect(fmtDateTimeZuluDynamic('2024-03-12T07:00:00-0400', { now })).toEqual('Mar 12 11:00z')
    expect(fmtDateTimeZuluDynamic('2024-03-11T23:15:00Z', { now })).toEqual('Mar 11 23:15z')
    expect(fmtDateTimeZuluDynamic('2024-03-10T23:15:00-0400', { now })).toEqual('Mar 11 03:15z')
    expect(fmtDateTimeZuluDynamic('2024-03-10T23:15:00Z', { now })).toEqual('Mar 10 23:15z')
    expect(fmtDateTimeZuluDynamic('2023-05-10T23:15:00Z', { now })).toEqual('May 10, 2023')
    expect(fmtDateTimeZuluDynamic('2023-02-01T23:15:00Z', { now })).toEqual('Feb 1, 2023')

    expect(fmtDateTimeZuluDynamic('2024-03-12T07:00:00-0400', { now, compact: true })).toEqual('11:00z')
    expect(fmtDateTimeZuluDynamic('2024-03-11T23:15:00Z', { now, compact: true })).toEqual('23:15z')
    expect(fmtDateTimeZuluDynamic('2024-03-10T23:15:00-0400', { now, compact: true })).toEqual('Mar 11')
    expect(fmtDateTimeZuluDynamic('2024-03-10T23:15:00Z', { now, compact: true })).toEqual('Mar 10')
    expect(fmtDateTimeZuluDynamic('2023-05-10T23:15:00Z', { now, compact: true })).toEqual('May 10')
    expect(fmtDateTimeZuluDynamic('2023-02-10T23:15:00Z', { now, compact: true })).toEqual('Feb 2023')
  })
})

describe('fmtADIFTime', () => {
  it('should work', () => {
    const now = new Date('2024-03-12T12:34:56-0000')

    expect(fmtADIFTime(now.getTime())).toEqual('123456')
  })
})

describe('fmtCabrilloTime', () => {
  it('should work', () => {
    const now = new Date('2024-03-12T12:34:56-0000')

    expect(fmtCabrilloTime(now.getTime())).toEqual('1234')
  })
})
