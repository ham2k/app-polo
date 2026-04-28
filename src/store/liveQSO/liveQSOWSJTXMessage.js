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
