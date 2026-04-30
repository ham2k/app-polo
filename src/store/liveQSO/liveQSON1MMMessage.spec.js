/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GLOBAL from '../../GLOBAL'
import {
  buildN1MMContactDeleteXMLForQSO,
  buildN1MMContactInfoValuesForQSO,
  buildN1MMContactInfoXMLForQSO
} from './liveQSON1MMMessage'

jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => '87654321-4321-4321-4321-ba0987654321')
}))

jest.mock('@ham2k/lib-operation-data', () => ({
  adifModeAndSubmodeForMode: jest.fn((mode) => [mode === 'USB' ? 'SSB' : mode, mode === 'USB' ? 'USB' : undefined]),
  frequencyForBand: jest.fn(() => 14069)
}))

jest.mock('./liveQSOUDPNative', () => ({
  sendUDPMessage: jest.fn()
}))

describe('liveQSON1MMMessage', () => {
  const operation = {
    stationCall: 'YO3GND'
  }

  const qso = {
    uuid: '12345678-1234-5678-9abc-def012345678',
    startAtMillis: new Date('2026-04-29T12:34:56+03:00').getTime(),
    band: '20m',
    freq: 14069,
    mode: 'CW',
    power: '5',
    notes: 'Worked from the park',
    their: {
      call: 'N0CALL',
      sent: '579',
      exchange: '123',
      cqZone: '4',
      grid: 'EM29',
      city: 'Tulsa',
      name: 'Pat',
      entityPrefix: 'K',
      continent: 'NA'
    },
    our: {
      call: 'YO3GND',
      operatorCall: 'YO3GND',
      sent: '599',
      exchange: '001'
    }
  }

  const previousQSO = {
    ...qso,
    startAtMillis: new Date('2026-04-29T10:11:12+03:00').getTime(),
    their: {
      ...qso.their,
      call: 'K1OLD'
    }
  }

  beforeEach(() => {
    GLOBAL.deviceName = 'Samsung Note 7'
  })

  describe('buildN1MMContactInfoValuesForQSO', () => {
    it('uses UTC timestamps, DX contest mode, device name and a stable ID', () => {
      const values = buildN1MMContactInfoValuesForQSO({ qso, operation, previousQSO })

      expect(values.contestname).toEqual('DX')
      expect(values.timestamp).toEqual('2026-04-29 09:34:56')
      expect(values.oldtimestamp).toEqual('2026-04-29 07:11:12')
      expect(values.ID).toEqual('12345678123456789ABCDEF012345678')
      expect(values.StationName).toEqual('Samsung Note 7')
      expect(values.oldcall).toEqual('K1OLD')
      expect(values.comment).toBeUndefined()
      expect(values.misctext).toBeUndefined()
    })
  })

  describe('buildN1MMContactInfoXMLForQSO', () => {
    it('skips empty tags by default and keeps them when requested', () => {
      const minimalQSO = {
        uuid: qso.uuid,
        startAtMillis: qso.startAtMillis,
        band: '20m',
        freq: 14069,
        mode: 'CW',
        their: {
          call: 'N0CALL',
          sent: '599'
        },
        our: {
          call: 'YO3GND',
          operatorCall: 'YO3GND',
          sent: '599'
        }
      }

      const compactXML = buildN1MMContactInfoXMLForQSO({ qso: minimalQSO, operation })
      const fullXML = buildN1MMContactInfoXMLForQSO({ qso: minimalQSO, operation, skipEmptyFields: false })

      expect(compactXML).toContain('<contestname>DX</contestname>')
      expect(compactXML).not.toContain('<section></section>')
      expect(fullXML).toContain('<section></section>')
    })
  })

  describe('buildN1MMContactDeleteXMLForQSO', () => {
    it('uses the previous QSO identity for delete packets', () => {
      const xml = buildN1MMContactDeleteXMLForQSO({ qso, operation, previousQSO })

      expect(xml).toContain('<timestamp>2026-04-29 07:11:12</timestamp>')
      expect(xml).toContain('<call>K1OLD</call>')
      expect(xml).toContain('<ID>12345678123456789ABCDEF012345678</ID>')
      expect(xml).not.toContain('<call>N0CALL</call>')
    })
  })
})
