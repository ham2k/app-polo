/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { modeForFrequency } from '@ham2k/lib-operation-data'
import { fmtFreqInMHz, parseFreqInMHz } from '../../tools/frequencyFormats'

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
  describeCommand: (match, { qso, t }) => {
    if (!qso) return

    if (match[0].length < 2) return ''
    return t?.('extensions.commands-radio.band', 'Change band to {{band}}?', { band: match[1] }) || `Change band to ${match[1]}m?`
  },
  invokeCommand: (match, { handleFieldChange, qso, t }) => {
    if (!qso) return

    handleFieldChange({ fieldId: 'band', value: match[1] + 'm' })
    return t?.('extensions.commands-radio.bandConfirm', 'Band set to {{band}}', { band: match[1] }) || `Band set to ${match[1]}m`
  }
}

const FrequencyCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-frequency',
  match: /^([\d.,]{1,})$/,
  describeCommand: (match, { qso, vfo, ourInfo, t }) => {
    if (!qso) return

    let freq
    if (match[1].length < 3) return
    if (match[1].startsWith('..') && qso.freq) {
      freq = parseFreqInMHz(`${Math.round(qso.freq)}${match[1].substring(1)}`)
    } else if (match[1].startsWith('.') && qso.freq) {
      freq = parseFreqInMHz(`${Math.floor(qso.freq / 1000)}${match[1]}`)
    } else if (match[1].startsWith(',') && qso.freq) {
      freq = parseFreqInMHz(`${Math.floor(qso.freq / 1000)}${match[1]}`)
    } else {
      freq = parseFreqInMHz(match[1])
    }
    if (freq) {
      const mode = modeForFrequency(freq, ourInfo) ?? vfo.mode ?? 'SSB'
      if (mode && mode !== vfo?.mode) {
        return t?.('extensions.commands-radio.frequencyAndMode', 'Change frequency to {{freq}} MHz ({{mode}})?', { freq: fmtFreqInMHz(freq), mode }) || `Change frequency to ${fmtFreqInMHz(freq)} MHz (${mode})?`
      } else {
        return t?.('extensions.commands-radio.frequency', 'Change frequency to {{freq}} MHz?', { freq: fmtFreqInMHz(freq) }) || `Change frequency to ${fmtFreqInMHz(freq)} MHz?`
      }
    }
  },
  invokeCommand: (match, { qso, handleFieldChange, vfo, ourInfo, t }) => {
    if (!qso) return

    let freq
    if (match[1].startsWith('..') && qso.freq) {
      freq = parseFreqInMHz(`${Math.round(qso.freq)}${match[1].substring(1)} `)
    } else if (match[1].startsWith('.') && qso.freq) {
      freq = parseFreqInMHz(`${Math.floor(qso.freq / 1000)}${match[1]} `)
    } else {
      freq = parseFreqInMHz(match[1])
    }

    if (freq) {
      const mode = modeForFrequency(freq, ourInfo) ?? vfo.mode ?? 'SSB'
      handleFieldChange({ fieldId: 'freq', value: freq })
      if (mode && mode !== vfo?.mode) {
        return t?.('extensions.commands-radio.frequencyAndModeConfirm', 'Frequency set to {{freq}} MHz ({{mode}})', { freq: fmtFreqInMHz(freq), mode }) || `Frequency set to ${fmtFreqInMHz(freq)} MHz (${mode})`
      } else {
        return t?.('extensions.commands-radio.frequencyConfirm', 'Frequency set to {{freq}} MHz', { freq: fmtFreqInMHz(freq) }) || `Frequency set to ${fmtFreqInMHz(freq)} MHz`
      }
    }
  }
}

const PowerCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-power',
  match: /^([\d.]{1,})[wW]$/,
  describeCommand: (match, { qso, t }) => {
    if (!qso) return

    return t?.('extensions.commands-radio.power', 'Change power to {{power}}W?', { power: match[1] }) || `Change power to ${match[1]} W ? `
  },
  invokeCommand: (match, { qso, handleFieldChange, t }) => {
    if (!qso) return

    handleFieldChange({ fieldId: 'power', value: match[1] })
    return t?.('extensions.commands-radio.powerConfirm', 'Power set to {{power}}W', { power: match[1] }) || `Power set to ${match[1]} W`
  }
}

const ModeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-mode',
  match: /^(CW|SSB|USB|LSB|FM|AM|FT8|FT4|RTTY|LSB|USB)$/i,
  describeCommand: (match, { qso, t }) => {
    if (!qso) return

    return t?.('extensions.commands-radio.mode', 'Change mode to {{mode}}?', { mode: match[1] }) || `Change mode to ${match[1]}?`
  },
  invokeCommand: (match, { handleFieldChange, qso, t }) => {
    if (!qso) return

    handleFieldChange({ fieldId: 'mode', value: match[1] })
    return t?.('extensions.commands-radio.modeConfirm', 'Mode set to {{mode}}', { mode: match[1] }) || `Mode set to ${match[1]} `
  }
}
