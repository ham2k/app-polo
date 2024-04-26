/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { setSettings } from '../../store/settings'

const Info = {
  key: 'commands-devmode',
  name: 'Shortcuts to activat a special developer mode'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: KonamiCommandHook })
  }
}

export default Extension

const KonamiCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-devmode-konami',
  match: /^KONAMI$/i,
  invokeCommand: (match, { dispatch, settings, handleFieldChange }) => {
    dispatch(setSettings({ devMode: !settings.devMode }))
    handleFieldChange({ fieldId: 'theirCall', value: 'KONAMI!' })
    animateCall([
      'KONAMI!',
      'KONAMI',
      'KONAM',
      'KONA',
      'KON',
      'KO',
      'K',
      '',
      'd',
      'De',
      'DEv',
      'DEV ',
      'DEV M',
      'DEV MO',
      'DEV MOD',
      'DEV MODE',
      `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MODe ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MODe ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `DEV MODe ${!settings.devMode ? 'ON' : 'OFF'}`,
      ''
    ],
    handleFieldChange, { time: 100 })
  }
}

function animateCall (cells, handleFieldChange, options = {}) {
  const { time = 100 } = options
  let i = 0
  const interval = setInterval(() => {
    if (i < cells.length) {
      handleFieldChange({ fieldId: 'theirCall', value: cells[i] })
      i += 1
    } else {
      clearInterval(interval)
    }
  }, time)
}
