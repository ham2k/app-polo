/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export class WSJTXLoggedADIFMessage {
  constructor ({
    magicNumber,
    schemaNumber,
    messageType,
    senderId,
    adifText
  }) {
    this.magicNumber = magicNumber
    this.schemaNumber = schemaNumber
    this.messageType = messageType
    this.senderId = senderId
    this.adifText = adifText
  }
}

export class WSJTXQSOLoggedMessage {
  constructor ({
    magicNumber,
    schemaNumber,
    messageType,
    senderId,
    dateTimeOffMillis,
    dxCall,
    dxGrid,
    txFrequencyHz,
    mode,
    reportSent,
    reportReceived,
    txPower,
    comments,
    name,
    dateTimeOnMillis,
    operatorCall,
    myCall,
    myGrid,
    exchangeSent,
    exchangeReceived
  }) {
    this.magicNumber = magicNumber
    this.schemaNumber = schemaNumber
    this.messageType = messageType
    this.senderId = senderId
    this.dateTimeOffMillis = dateTimeOffMillis
    this.dxCall = dxCall
    this.dxGrid = dxGrid
    this.txFrequencyHz = txFrequencyHz
    this.mode = mode
    this.reportSent = reportSent
    this.reportReceived = reportReceived
    this.txPower = txPower
    this.comments = comments
    this.name = name
    this.dateTimeOnMillis = dateTimeOnMillis
    this.operatorCall = operatorCall
    this.myCall = myCall
    this.myGrid = myGrid
    this.exchangeSent = exchangeSent
    this.exchangeReceived = exchangeReceived
  }
}
