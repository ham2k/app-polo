// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { qsonToReg1test } from './qsonToReg1test'

const settings = { operatorCall: 'K1OP' }

function baseArgs (operation) {
  return {
    operation: { stationCall: 'W1CLUB', grid: 'FN31', refs: [], ...operation },
    settings,
    qsos: [],
    handler: { key: 'test' },
    combineSegmentRefs: false
  }
}

describe('qsonToReg1test responsible operator', () => {
  // The operator entered on the Station Info screen is stored in operation.local,
  // so reading only operation.operatorCall silently reported the wrong person as
  // responsible for the station.
  it('reports the operator entered for the operation', () => {
    const reg1test = qsonToReg1test(baseArgs({ local: { operatorCall: 'K1GUEST' } }))

    expect(reg1test).toMatch(/^RCall=K1GUEST$/m)
    expect(reg1test).toMatch(/^PCall=W1CLUB$/m)
  })

  // RCall is required by the format, so unlike ADIF's OPERATOR it still falls back
  // rather than being left out.
  it('falls back to the station call when no operator is set', () => {
    const reg1test = qsonToReg1test(baseArgs())

    expect(reg1test).toMatch(/^RCall=W1CLUB$/m)
  })
})
