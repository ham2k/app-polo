/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const packageJson = require('../../../package.json')

const mockQsonToADIF = jest.fn()
const mockDataExportOptions = jest.fn()
const mockSelectOperation = jest.fn()
const mockSelectOperationCallInfo = jest.fn()
const mockSelectSettings = jest.fn()
const mockBuildN1MMContactDeleteXMLForQSO = jest.fn()
const mockBuildN1MMContactInfoXMLForQSO = jest.fn()
const mockBuildN1MMContactReplaceXMLForQSO = jest.fn()
const mockSendLiveQSON1MMPacket = jest.fn()
const mockSendUDPMessage = jest.fn()
const mockSendWSJTXLoggedADIFMessage = jest.fn()

jest.mock('../../tools/qsonToADIF', () => ({
  qsonToADIF: (...args) => mockQsonToADIF(...args)
}))

jest.mock('../operations', () => ({
  dataExportOptions: (...args) => mockDataExportOptions(...args),
  selectOperation: (...args) => mockSelectOperation(...args),
  selectOperationCallInfo: (...args) => mockSelectOperationCallInfo(...args)
}))

jest.mock('../settings', () => ({
  selectSettings: (...args) => mockSelectSettings(...args)
}))

jest.mock('./liveQSON1MMMessage', () => ({
  buildN1MMContactDeleteXMLForQSO: (...args) => mockBuildN1MMContactDeleteXMLForQSO(...args),
  buildN1MMContactInfoXMLForQSO: (...args) => mockBuildN1MMContactInfoXMLForQSO(...args),
  buildN1MMContactReplaceXMLForQSO: (...args) => mockBuildN1MMContactReplaceXMLForQSO(...args),
  sendLiveQSON1MMPacket: (...args) => mockSendLiveQSON1MMPacket(...args)
}))

jest.mock('./liveQSOUDPNative', () => ({
  sendUDPMessage: (...args) => mockSendUDPMessage(...args),
  sendWSJTXLoggedADIFMessage: (...args) => mockSendWSJTXLoggedADIFMessage(...args)
}))

const { adifBodiesForRequest, adifDatagramsForExport, buildLiveQSOTestADIF, splitADIFBody } = require('./liveQSO')
const { LIVE_QSO_UDP_MESSAGE_FORMATS } = require('./liveQSOSettings')

describe('liveQSO', () => {
  const multiRecordADIF = [
    'ADIF test from Ham2K PoLo',
    '<EOH>',
    '<CALL:6>N0CALL <EOR>',
    '<CALL:3>A1A <EOR>'
  ].join('\n')

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('ADIF request splitting', () => {
    it('splits multi-record ADIF bodies and respects HTTP request options', () => {
      expect(splitADIFBody(multiRecordADIF)).toEqual({
        header: 'ADIF test from Ham2K PoLo\n<EOH>\n',
        records: [
          '<CALL:6>N0CALL <EOR>',
          '<CALL:3>A1A <EOR>'
        ]
      })

      expect(adifBodiesForRequest(multiRecordADIF, {
        individualRequests: false,
        sendADIFHeader: true
      })).toEqual([multiRecordADIF])

      expect(adifBodiesForRequest(multiRecordADIF, {
        individualRequests: false,
        sendADIFHeader: false
      })).toEqual([
        '<CALL:6>N0CALL <EOR>\n<CALL:3>A1A <EOR>\n'
      ])

      expect(adifBodiesForRequest(multiRecordADIF, {
        individualRequests: true,
        sendADIFHeader: true
      })).toEqual([
        'ADIF test from Ham2K PoLo\n<EOH>\n<CALL:6>N0CALL <EOR>\n',
        'ADIF test from Ham2K PoLo\n<EOH>\n<CALL:3>A1A <EOR>\n'
      ])

      expect(adifBodiesForRequest(multiRecordADIF, {
        individualRequests: true,
        sendADIFHeader: false
      })).toEqual([
        '<CALL:6>N0CALL <EOR>\n',
        '<CALL:3>A1A <EOR>\n'
      ])
    })
  })

  describe('UDP datagram shaping', () => {
    it('emits raw datagrams or WSJT-X wrapped messages per ADIF record', () => {
      const entry = {
        exportType: 'full-adif',
        body: multiRecordADIF
      }

      expect(adifDatagramsForExport(entry, {
        messageFormat: LIVE_QSO_UDP_MESSAGE_FORMATS.rawADIF
      })).toEqual([
        { payload: 'ADIF test from Ham2K PoLo\n<EOH>\n<CALL:6>N0CALL <EOR>\n' },
        { payload: 'ADIF test from Ham2K PoLo\n<EOH>\n<CALL:3>A1A <EOR>\n' }
      ])

      const wsjtDatagrams = adifDatagramsForExport(entry, {
        messageFormat: LIVE_QSO_UDP_MESSAGE_FORMATS.wsjtxCompatible
      })

      expect(wsjtDatagrams).toHaveLength(2)
      expect(wsjtDatagrams[0].wsjtxMessage).toMatchObject({
        magicNumber: 0xadbccbda,
        schemaNumber: 3,
        messageType: 12,
        senderId: `Ham2K-PoLo/${packageJson.version}`,
        adifText: 'ADIF test from Ham2K PoLo\n<EOH>\n<CALL:6>N0CALL <EOR>\n'
      })
      expect(wsjtDatagrams[1].wsjtxMessage).toMatchObject({
        magicNumber: 0xadbccbda,
        schemaNumber: 3,
        messageType: 12,
        senderId: `Ham2K-PoLo/${packageJson.version}`,
        adifText: 'ADIF test from Ham2K PoLo\n<EOH>\n<CALL:3>A1A <EOR>\n'
      })

      const repeatedDatagrams = adifDatagramsForExport(entry, {
        messageFormat: LIVE_QSO_UDP_MESSAGE_FORMATS.wsjtxCompatible
      })

      expect(wsjtDatagrams[0].wsjtxMessage.senderId).toEqual(repeatedDatagrams[0].wsjtxMessage.senderId)
      expect(wsjtDatagrams[1].wsjtxMessage.senderId).toEqual(repeatedDatagrams[1].wsjtxMessage.senderId)
    })
  })

  describe('test ADIF generation', () => {
    it('uses the standard sample QSO fields and UTC date/time', () => {
      const adif = buildLiveQSOTestADIF(new Date('2026-04-30T00:30:15+03:00'))

      expect(adif).toContain('ADIF test from Ham2K PoLo')
      expect(adif).toContain('<CALL:6>N0CALL')
      expect(adif).toContain('<MODE:2>CW')
      expect(adif).toContain('<BAND:3>20m')
      expect(adif).toContain('<FREQ:9>14.069000')
      expect(adif).toContain('<QSO_DATE:8>20260429')
      expect(adif).toContain('<TIME_ON:6>213015')
    })
  })
})
