/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { tweakStringForVoiceOver } from './a11yTools'

describe('tweakStringForVoiceOver', () => {
  it('should spell callsigns', () => {
    expect(tweakStringForVoiceOver('KI2D')).toEqual('K.I.2.D.')
    expect(tweakStringForVoiceOver('KI2D settings')).toEqual('K.I.2.D. settings')
    expect(tweakStringForVoiceOver('Station KI2D')).toEqual('Station K.I.2.D.')
    expect(tweakStringForVoiceOver('Station call KI2D settings')).toEqual('Station call K.I.2.D. settings')
  })
})
