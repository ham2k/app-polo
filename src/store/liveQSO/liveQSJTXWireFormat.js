/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Buffer } from 'buffer'

const UNIX_EPOCH_JULIAN_DAY = 2440588
const MILLIS_PER_DAY = 86400000
const UTC_TIME_SPEC = 1

function uint32Buffer (value) {
  const buffer = Buffer.alloc(4)
  const normalized = ((Math.trunc(Number(value)) % 0x100000000) + 0x100000000) % 0x100000000
  buffer.writeUInt32BE(normalized, 0)
  return buffer
}

function int32Buffer (value) {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32BE(Number(value), 0)
  return buffer
}

function int64Buffer (value) {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64BE(BigInt(Math.trunc(Number(value))), 0)
  return buffer
}

function byteBuffer (value) {
  const buffer = Buffer.alloc(1)
  const normalized = ((Math.trunc(Number(value)) % 0x100) + 0x100) % 0x100
  buffer.writeUInt8(normalized, 0)
  return buffer
}

export function encodeWSJTXUTF8 (value) {
  if (value === null || value === undefined) {
    return int32Buffer(-1)
  }

  const bytes = Buffer.from(`${value}`, 'utf8')
  return Buffer.concat([int32Buffer(bytes.length), bytes])
}

export function qDateTimeParts (millis) {
  const wholeMillis = Math.trunc(Number(millis))
  return {
    julianDay: UNIX_EPOCH_JULIAN_DAY + Math.floor(wholeMillis / MILLIS_PER_DAY),
    millisSinceUtcMidnight: ((wholeMillis % MILLIS_PER_DAY) + MILLIS_PER_DAY) % MILLIS_PER_DAY,
    timeSpec: UTC_TIME_SPEC
  }
}

export function encodeWSJTXQDateTime (millis) {
  const parts = qDateTimeParts(millis)
  return Buffer.concat([
    int64Buffer(parts.julianDay),
    int32Buffer(parts.millisSinceUtcMidnight),
    byteBuffer(parts.timeSpec)
  ])
}

export function encodeWSJTXLoggedADIFMessage (message) {
  return Buffer.concat([
    uint32Buffer(message.magicNumber),
    int32Buffer(message.schemaNumber),
    int32Buffer(message.messageType),
    encodeWSJTXUTF8(message.senderId),
    encodeWSJTXUTF8(message.adifText)
  ])
}

export function encodeWSJTXQSOLoggedMessage (message) {
  return Buffer.concat([
    uint32Buffer(message.magicNumber),
    int32Buffer(message.schemaNumber),
    int32Buffer(message.messageType),
    encodeWSJTXUTF8(message.senderId),
    encodeWSJTXQDateTime(message.dateTimeOffMillis),
    encodeWSJTXUTF8(message.dxCall),
    encodeWSJTXUTF8(message.dxGrid),
    int64Buffer(message.txFrequencyHz),
    encodeWSJTXUTF8(message.mode),
    encodeWSJTXUTF8(message.reportSent),
    encodeWSJTXUTF8(message.reportReceived),
    encodeWSJTXUTF8(message.txPower),
    encodeWSJTXUTF8(message.comments),
    encodeWSJTXUTF8(message.name),
    encodeWSJTXQDateTime(message.dateTimeOnMillis),
    encodeWSJTXUTF8(message.operatorCall),
    encodeWSJTXUTF8(message.myCall),
    encodeWSJTXUTF8(message.myGrid),
    encodeWSJTXUTF8(message.exchangeSent),
    encodeWSJTXUTF8(message.exchangeReceived)
  ])
}
