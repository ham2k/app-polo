/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  encodeWSJTXLoggedADIFMessage,
  encodeWSJTXQDateTime,
  encodeWSJTXQSOLoggedMessage,
  qDateTimeParts
} from './liveQSJTXWireFormat'

describe('liveQSJTXWireFormat', () => {
  it('encodes Qt UTC datetimes with Julian day and millis since midnight', () => {
    const date = new Date('2026-04-30T00:30:15.000Z')
    const parts = qDateTimeParts(date.getTime())
    const encoded = encodeWSJTXQDateTime(date.getTime())

    expect(parts).toEqual({
      julianDay: 2461161,
      millisSinceUtcMidnight: 1815000,
      timeSpec: 1
    })
    expect(encoded.readBigInt64BE(0)).toEqual(BigInt(2461161))
    expect(encoded.readInt32BE(8)).toEqual(1815000)
    expect(encoded.readUInt8(12)).toEqual(1)
  })

  it('encodes WSJT-X logged ADIF packets with big-endian header fields', () => {
    const buffer = encodeWSJTXLoggedADIFMessage({
      magicNumber: 0xadbccbda,
      schemaNumber: 3,
      messageType: 12,
      senderId: 'Ham2K-PoLo/26.2.9',
      adifText: '<CALL:6>N0CALL <EOR>\n'
    })

    expect(buffer.readUInt32BE(0)).toEqual(0xadbccbda)
    expect(buffer.readInt32BE(4)).toEqual(3)
    expect(buffer.readInt32BE(8)).toEqual(12)

    const senderIdLength = buffer.readInt32BE(12)
    expect(buffer.toString('utf8', 16, 16 + senderIdLength)).toEqual('Ham2K-PoLo/26.2.9')
  })

  it('encodes WSJT-X QSO logged packets with frequency and exchanges', () => {
    const buffer = encodeWSJTXQSOLoggedMessage({
      magicNumber: 0xadbccbda,
      schemaNumber: 3,
      messageType: 5,
      senderId: 'Ham2K-PoLo/26.2.9',
      dateTimeOffMillis: new Date('2026-04-30T00:30:15.000Z').getTime(),
      dxCall: 'N0CALL',
      dxGrid: 'EM29',
      txFrequencyHz: 14069000,
      mode: 'CW',
      reportSent: '599',
      reportReceived: '599',
      txPower: '5',
      comments: 'Test',
      name: 'Pat',
      dateTimeOnMillis: new Date('2026-04-30T00:30:15.000Z').getTime(),
      operatorCall: 'YO3GND',
      myCall: 'YO3GND',
      myGrid: 'KN34',
      exchangeSent: '001',
      exchangeReceived: ''
    })

    expect(buffer.readUInt32BE(0)).toEqual(0xadbccbda)
    expect(buffer.readInt32BE(4)).toEqual(3)
    expect(buffer.readInt32BE(8)).toEqual(5)
    expect(buffer.includes(Buffer.from('N0CALL', 'utf8'))).toEqual(true)
    expect(buffer.includes(Buffer.from('YO3GND', 'utf8'))).toEqual(true)
    expect(buffer.includes(Buffer.from('001', 'utf8'))).toEqual(true)
  })
})
