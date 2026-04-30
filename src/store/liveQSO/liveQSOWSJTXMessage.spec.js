/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { WSJTXLoggedADIFMessage, WSJTXQSOLoggedMessage } from './liveQSOWSJTXMessage'

describe('liveQSOWSJTXMessage', () => {
  describe('WSJTXLoggedADIFMessage', () => {
    it('stores the provided message fields', () => {
      const message = new WSJTXLoggedADIFMessage({
        magicNumber: 0xadbccbda,
        schemaNumber: 3,
        messageType: 12,
        senderId: 'WSJT-X',
        adifText: '<CALL:6>N0CALL <EOR>'
      })

      expect(message).toEqual({
        magicNumber: 0xadbccbda,
        schemaNumber: 3,
        messageType: 12,
        senderId: 'WSJT-X',
        adifText: '<CALL:6>N0CALL <EOR>'
      })
    })
  })

  describe('WSJTXQSOLoggedMessage', () => {
    it('stores the provided structured QSO fields', () => {
      const message = new WSJTXQSOLoggedMessage({
        magicNumber: 0xadbccbda,
        schemaNumber: 3,
        messageType: 5,
        senderId: 'WSJT-X',
        dateTimeOffMillis: 1714400000000,
        dxCall: 'N0CALL',
        dxGrid: 'EM29',
        txFrequencyHz: 14069000,
        mode: 'CW',
        reportSent: '599',
        reportReceived: '579',
        txPower: '5',
        comments: 'Test contact',
        name: 'Pat',
        dateTimeOnMillis: 1714399990000,
        operatorCall: 'YO3GND',
        myCall: 'YO3GND',
        myGrid: 'KN34',
        exchangeSent: '001',
        exchangeReceived: '123'
      })

      expect(message).toEqual({
        magicNumber: 0xadbccbda,
        schemaNumber: 3,
        messageType: 5,
        senderId: 'WSJT-X',
        dateTimeOffMillis: 1714400000000,
        dxCall: 'N0CALL',
        dxGrid: 'EM29',
        txFrequencyHz: 14069000,
        mode: 'CW',
        reportSent: '599',
        reportReceived: '579',
        txPower: '5',
        comments: 'Test contact',
        name: 'Pat',
        dateTimeOnMillis: 1714399990000,
        operatorCall: 'YO3GND',
        myCall: 'YO3GND',
        myGrid: 'KN34',
        exchangeSent: '001',
        exchangeReceived: '123'
      })
    })
  })
})
