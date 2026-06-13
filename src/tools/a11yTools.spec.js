// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { tweakStringForVoiceOver } from './a11yTools'

describe('tweakStringForVoiceOver', () => {
  it('should spell callsigns', () => {
    expect(tweakStringForVoiceOver('KI2D')).toEqual('K.I.2.D.')
    expect(tweakStringForVoiceOver('KI2D settings')).toEqual('K.I.2.D. settings')
    expect(tweakStringForVoiceOver('Station KI2D')).toEqual('Station K.I.2.D.')
    expect(tweakStringForVoiceOver('Station call KI2D settings')).toEqual('Station call K.I.2.D. settings')
  })
})
