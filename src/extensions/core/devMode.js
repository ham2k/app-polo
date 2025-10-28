/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { setSettings } from '../../store/settings'

const Info = {
  key: 'core-devMode',
  name: 'Core Developer Mode Handlers',
  category: 'core',
  hidden: true,
  alwaysEnabled: true
}

export const Extension = {
  ...Info,
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('command', { priority: 100, hook: KonamiCommandHook })
    registerHook('export', { hook: ExportHandler })
  }
}
export default Extension

const ExportHandler = {
  ...Info,

  suggestExportOptions: ({ operation, qsos, ref, settings }) => {
    if (settings.devMode) {
      return ([{
        priority: -100,
        icon: 'briefcase-upload',
        format: 'qson',
        exportType: 'devmode-qson',
        nameTemplate: '{{op.date}}.{{log.station}}.{{first8 op.uuid}}',
        titleTemplate: '{{log.station}}: {{log.title}} on {{op.date}}',
        exportName: 'Developer Mode: QSON Export',
        devMode: true,
        selectedByDefault: false
      }])
    }
  }
}

const KonamiCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-devmode-konami',
  match: /^(KONAMI|DEVMODE)$/i,
  describeCommand: (match, { settings }) => {
    if (settings.devMode) {
      return 'Deactivate developer mode?'
    } else {
      return 'Activate developer mode?'
    }
  },
  invokeCommand: (match, { dispatch, settings, handleFieldChange }) => {
    dispatch(setSettings({ devMode: !settings.devMode }))
    // handleFieldChange({ fieldId: 'theirCall', value: 'KONAMI!' })
    // animateCall([
    //   'KONAMI!',
    //   'KONAMI',
    //   'KONAM',
    //   'KONA',
    //   'KON',
    //   'KO',
    //   'K',
    //   '',
    //   'D',
    //   'DE',
    //   'DEV',
    //   'DEV ',
    //   'DEV M',
    //   'DEV MO',
    //   'DEV MOD',
    //   'DEV MODE',
    //   `dEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DeV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEv MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MODe ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEv MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DeV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `dEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `dEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DeV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEv MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   `DEV MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
    //   ''
    // ],
    // handleFieldChange, { time: 80 })
    if (settings.devMode) {
      return 'Developer Mode: OFF'
    } else {
      return 'Developer Mode: ON!!!'
    }
  }
}

// eslint-disable-next-line no-unused-vars
function animateCall(cells, handleFieldChange, options = {}) {
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
