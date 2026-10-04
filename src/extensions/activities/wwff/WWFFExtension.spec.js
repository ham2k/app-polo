// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('../../../ui/index.js', () => ({}))
jest.mock('../../../store/dataFiles/actions/dataFileFS', () => ({}))
jest.mock('../../../store/apis/apiWWFF', () => ({}))
jest.mock('./WWFFDataFile', () => ({}))
jest.mock('./WWFFActivityOptions', () => ({}))
jest.mock('./WWFFLoggingControl', () => ({}))
jest.mock('./WWFFPostSelfSpot', () => ({}))
jest.mock('./WWFFPostOtherSpot', () => ({}))

import { ReferenceHandler } from './WWFFExtension'

const operation = { refs: [{ type: 'wwffActivation', ref: 'KFF-1234' }] }

function operatorFor ({ qso = { our: {} }, common, exportType = 'wwff' }) {
  const fields = ReferenceHandler.adifFieldsForOneQSO({ qso, operation, common, exportType })
  return fields.filter(field => 'OPERATOR' in field).map(field => field.OPERATOR)
}

describe('WWFF ADIF OPERATOR', () => {
  // WWFF log processing needs to know who operated each QSO, so WWFF exports always
  // carry an OPERATOR. Without one entered, the station call stands in, minus any
  // portable prefixes or suffixes, since OPERATOR must be a person's own callsign.
  it('falls back to the base station call when no operator was entered', () => {
    expect(operatorFor({ common: { stationCall: 'EA8/KI2D/P' } })).toEqual(['KI2D'])
  })

  it('prefers the per-QSO station call over the operation one', () => {
    expect(operatorFor({ qso: { our: { call: 'W1AW/4' } }, common: { stationCall: 'KI2D' } })).toEqual(['W1AW'])
  })

  // The general ADIF fields already emit an entered operator; adding another
  // OPERATOR would duplicate or contradict it.
  it('leaves an entered operation operator alone', () => {
    expect(operatorFor({ common: { stationCall: 'W1CLUB', operatorCall: 'KI2D' } })).toEqual([])
  })

  it('leaves an entered QSO operator alone', () => {
    expect(operatorFor({ qso: { our: { operatorCall: 'KI2D' } }, common: { stationCall: 'W1CLUB' } })).toEqual([])
  })

  // Other exports that merely include WWFF refs keep the general rule of omitting
  // OPERATOR when the user never entered one.
  it('does not add an operator to non-WWFF exports', () => {
    expect(operatorFor({ common: { stationCall: 'KI2D' }, exportType: 'full-adif' })).toEqual([])
  })
})
