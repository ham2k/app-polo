/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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

const { adifBodiesForRequest, splitADIFBody } = require('./liveQSO')

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
})
