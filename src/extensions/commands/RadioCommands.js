/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Info = {
  key: 'commands-radio',
  name: 'Shortcuts to change frequency, band and mode'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: ModeCommandHook })
    registerHook('command', { priority: 100, hook: BandCommandHook })
    registerHook('command', { priority: 99, hook: FrequencyCommandHook })
    registerHook('command', { priority: 98, hook: PowerCommandHook })
  }
}

export default Extension

const BandCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-band',
  match: /^(2|6|10|12|15|17|20|30|40|60|80|160)M{0,1}$/i,
  describeCommand: (match) => {
    if (match[0].length < 2) return ''
    return `Change band to ${match[1]}m?`
  },
  invokeCommand: (match, { handleFieldChange }) => {
    handleFieldChange({ fieldId: 'band', value: match[1] + 'm' })
    return `Band set to ${match[1]}m`
  }
}

const FrequencyCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-frequency',
  match: /^([\d.]{1,})$/,
  describeCommand: (match, { qso }) => {
    if (match[1].length < 3) return
    if (match[1].startsWith('..') && qso.freq) {
      return `Change frequency to ${Math.round(qso.freq)}${match[1].substring(1)}?`
    } else if (match[1].startsWith('.') && qso.freq) {
      return `Change frequency to ${Math.floor(qso.freq / 1000)}${match[1]}?`
    } else {
      return `Change frequency to ${match[1]}?`
    }
  },
  invokeCommand: (match, { qso, handleFieldChange }) => {
    if (match[1].startsWith('..') && qso.freq) {
      handleFieldChange({ fieldId: 'freq', value: `${Math.round(qso.freq)}${match[1].substring(1)}` })
      return `Frequency set to ${Math.round(qso.freq)}${match[1].substring(1)}`
    } else if (match[1].startsWith('.') && qso.freq) {
      handleFieldChange({ fieldId: 'freq', value: `${Math.floor(qso.freq / 1000)}${match[1]}` })
      return `Frequency set to ${Math.floor(qso.freq / 1000)}${match[1]}`
    } else {
      handleFieldChange({ fieldId: 'freq', value: match[1] })
      return `Frequency set to ${match[1]}`
    }
  }
}

const PowerCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-power',
  match: /^([\d.]{1,})[wW]$/,
  describeCommand: (match, { qso }) => {
    return `Change power to ${match[1]}W?`
  },
  invokeCommand: (match, { qso, handleFieldChange }) => {
    handleFieldChange({ fieldId: 'power', value: match[1] })
    return `Power set to ${match[1]}W`
  }
}

const ModeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-mode',
  match: /^(CW|SSB|USB|LSB|FM|AM|FT8|FT4|RTTY|LSB|USB)$/i,
  describeCommand: (match, { qso }) => {
    return `Change mode to ${match[1]}?`
  },
  invokeCommand: (match, { handleFieldChange }) => {
    handleFieldChange({ fieldId: 'mode', value: match[1] })
    return `Mode set to ${match[1]}`
  }
}
