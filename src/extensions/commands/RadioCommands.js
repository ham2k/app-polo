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
  describeCommand: (match, { qso, vfo }) => {
    let freq
    if (match[1].length < 3) return
    if (match[1].startsWith('..') && qso.freq) {
      freq = parseFreqInMHz(`${Math.round(qso.freq)}${match[1].substring(1)}`)
    } else if (match[1].startsWith('.') && qso.freq) {
      freq = parseFreqInMHz(`${Math.floor(qso.freq / 1000)}${match[1]}`)
    } else {
      freq = parseFreqInMHz(match[1])
    }
    if (freq) {
      const mode = modeForFrequency(freq) ?? vfo.mode ?? 'SSB'
      return `Change frequency to ${fmtFreqInMHz(freq)} MHz${mode !== vfo?.mode ? ` (${mode})` : ''}?`
    }
  },
  invokeCommand: (match, { qso, handleFieldChange, vfo }) => {
    let freq
    if (match[1].startsWith('..') && qso.freq) {
      freq = parseFreqInMHz(`${Math.round(qso.freq)}${match[1].substring(1)}`)
    } else if (match[1].startsWith('.') && qso.freq) {
      freq = parseFreqInMHz(`${Math.floor(qso.freq / 1000)}${match[1]}`)
    } else {
      freq = parseFreqInMHz(match[1])
    }

    if (freq) {
      const mode = modeForFrequency(freq) ?? vfo.mode ?? 'SSB'
      handleFieldChange({ fieldId: 'freq', value: freq })
      return `Frequency set to ${fmtFreqInMHz(freq)} MHz (${mode})`
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
