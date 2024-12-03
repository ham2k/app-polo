/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { setOperationLocalData } from '../../store/operations'
import { fmtDateTimeZuluDynamic } from '../../tools/timeFormats'

const Info = {
  key: 'commands-time',
  name: 'Shortcuts to change time and date'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: DirectTimeCommandHook })
    registerHook('command', { priority: 100, hook: DeltaTimeCommandHook })
    registerHook('command', { priority: 100, hook: NowTimeCommandHook })
  }
}

export default Extension

const DirectTimeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-time-direct',
  match: /^(\d{1,2}[-/]\d{2,2}|\d{1,2}:\d{2,2}|\d{1,2}:\d{2,2}:\d{2,2})$/i,
  describeCommand: (match) => {
    if (match[1].indexOf(':') > -1) {
      return `Set time to ${match[1]}?`
    } else {
      return `Set date to ${match[1]}?`
    }
  },
  invokeCommand: (match, { qso, handleFieldChange }) => {
    const baseTime = qso.startAtMillis ? new Date(qso.startAtMillis) : new Date()
    if (match[1].indexOf(':') > -1) {
      let time = match[1].padStart(5, '0')
      if (time.length === 5) time = time + ':00'
      const newValue = Date.parse(`${baseTime.toISOString().split('T')[0]}T${time}Z`)
      handleFieldChange({ fieldId: 'time', value: newValue.valueOf() })
      return `Time set to ${fmtDateTimeZuluDynamic(newValue.valueOf())}`
    } else {
      const date = match[1].padStart(5, '0').replace('/', '-')
      const newValue = Date.parse(`${baseTime.getFullYear()}-${date}T${baseTime.toISOString().split('T')[1]}`)
      handleFieldChange({ fieldId: 'time', value: newValue.valueOf() })
      return `Date set to ${fmtDateTimeZuluDynamic(newValue.valueOf())}`
    }
  }
}

const DeltaTimeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-time-delta',
  match: /^([-+]\d+)([hmsdw])$/i,
  describeCommand: (match) => {
    if (match) {
      const delta = parseInt(match[1], 10)
      const units = match[2].toUpperCase()
      if (units === 'H') return `Change time by ${delta} hours?`
      else if (units === 'M') return `Change time by ${delta} minutes?`
      else if (units === 'S') return `Change time by ${delta} seconds?`
      else if (units === 'D') return `Change time by ${delta} days?`
      else if (units === 'W') return `Change time by ${delta} weeks?`
      else return ''
    }
  },
  invokeCommand: (match, { qso, handleFieldChange }) => {
    const baseTime = qso.startAtMillis ? new Date(qso.startAtMillis) : new Date()

    if (match) {
      let delta = parseInt(match[1], 10)
      const units = match[2].toUpperCase()
      if (units === 'H') delta = delta * 1000 * 60 * 60
      else if (units === 'M') delta = delta * 1000 * 60
      else if (units === 'S') delta = delta * 1000
      else if (units === 'D') delta = delta * 1000 * 60 * 60 * 24
      else if (units === 'W') delta = delta * 1000 * 60 * 60 * 24 * 7

      const newValue = baseTime.valueOf() + delta
      handleFieldChange({ fieldId: 'time', value: newValue })
      return `Time set to ${fmtDateTimeZuluDynamic(newValue.valueOf())}`
    }
  }
}

const NowTimeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-time-now',
  match: /^(NOW|TODAY|YESTERDAY)$/i,
  describeCommand: (match) => {
    if (match[1] === 'NOW') {
      return 'Change time to now?'
    } else if (match[1] === 'TODAY') {
      return 'Change time to today?'
    } else if (match[1] === 'YESTERDAY') {
      return 'Change time to yesterday?'
    }
  },
  invokeCommand: (match, { qso, handleFieldChange, dispatch, operation }) => {
    if (match[1] === 'NOW') {
      handleFieldChange({ fieldId: 'time', value: new Date().valueOf() })
      dispatch(setOperationLocalData({ uuid: operation.uuid, _manualTime: false }))
      return 'Time set to now'
    } else if (match[1] === 'TODAY') {
      handleFieldChange({ fieldId: 'time', value: new Date().valueOf() })
      dispatch(setOperationLocalData({ uuid: operation.uuid, _manualTime: true }))
      return 'Time set to today'
    } else if (match[1] === 'YESTERDAY') {
      handleFieldChange({ fieldId: 'time', value: new Date().valueOf() - 1000 * 60 * 60 * 24 })
      dispatch(setOperationLocalData({ uuid: operation.uuid, _manualTime: true }))
      return 'Time set to yesterday'
    }
  }
}
