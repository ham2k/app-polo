/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtFreqInMHz, partsForFreqInMHz, parseFreqInMHz } from './frequencyFormats'

describe('fmtFreqInMHz', () => {
  it('should convert MHz to a nice formatting', () => {
    expect(fmtFreqInMHz(7125)).toEqual('7.125')
    expect(fmtFreqInMHz(7125, { mode: 'compact' })).toEqual('7.125 ')
    expect(fmtFreqInMHz(7125, { mode: 'full' })).toEqual('7.125.000')
    expect(fmtFreqInMHz(7125.100)).toEqual('7.125.100')
    expect(fmtFreqInMHz(7125.100, { mode: 'compact' })).toEqual('7.125.')
    expect(fmtFreqInMHz(7125.100, { mode: 'full' })).toEqual('7.125.100')
    expect(fmtFreqInMHz(146520.125)).toEqual('146.520.125')
    expect(fmtFreqInMHz(146520.125, { mode: 'compact' })).toEqual('146.520.')
    expect(fmtFreqInMHz(146520.125, { mode: 'full' })).toEqual('146.520.125')
  })
})

describe('partsForFreqInMHz', () => {
  it('should convert MHz to a nice formatting', () => {
    expect(partsForFreqInMHz(7125)).toEqual(['7', '125', '000'])
    expect(partsForFreqInMHz(7125.100)).toEqual(['7', '125', '100'])
    expect(partsForFreqInMHz(146520.125)).toEqual(['146', '520', '125'])
  })
})

describe('parseFreqInMHz', () => {
  it('should convert strings to MHz', () => {
    expect(parseFreqInMHz('7125')).toEqual(7125)
    expect(parseFreqInMHz('7.125')).toEqual(7125)
    expect(parseFreqInMHz('7,125')).toEqual(7125)
    expect(parseFreqInMHz('7125.500')).toEqual(7125.500)
    expect(parseFreqInMHz('7125,500')).toEqual(7125.500)
    expect(parseFreqInMHz('7.125.500')).toEqual(7125.500)
    expect(parseFreqInMHz('146.520.500')).toEqual(146520.500)
  })
})
