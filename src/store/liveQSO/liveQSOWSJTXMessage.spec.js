/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { WSJTXLoggedADIFMessage } from './liveQSOWSJTXMessage'

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
})
