// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { expandRSTValues } from './callsignTools'

describe('expandRSTValues', () => {
  let mode = ''

  it('defaults to 59', () => {
    expect(expandRSTValues('', mode)).toEqual('59')
  })

  describe('when mode is CW', () => {
    beforeAll(() => {
      mode = 'CW'
    })

    it('defaults to 599', () => {
      expect(expandRSTValues('', mode)).toEqual('599')
    })

    it('adds default tone for CW reports', () => {
      expect(expandRSTValues('59', mode)).toEqual('599')
      expect(expandRSTValues('57', mode)).toEqual('579')
      expect(expandRSTValues('55', mode)).toEqual('559')
      expect(expandRSTValues('44', mode)).toEqual('449')
      expect(expandRSTValues('34', mode)).toEqual('349')
      expect(expandRSTValues('22', mode)).toEqual('229')
      expect(expandRSTValues('11', mode)).toEqual('119')
    })

    it('can handle Aurora signal reports', () => {
      expect(expandRSTValues('A', mode)).toEqual('59A')
      expect(expandRSTValues('3A', mode)).toEqual('33A')
      expect(expandRSTValues('4A', mode)).toEqual('44A')
      expect(expandRSTValues('34A', mode)).toEqual('34A')
    })
  })
})
