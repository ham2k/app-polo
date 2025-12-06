/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { setSettings } from "../../store/settings"

const Info = {
  key: 'commands-settings',
  name: 'Settings Commands'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: SetSettingCommandHook })
  }
}

export default Extension

const SetSettingCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-settings-set',
  match: /^(SET)(|[ /]|.+)$$/i,
  allowSpaces: true,
  describeCommand: (match, { settings, t }) => {
    let [name, ...value] = match[2]?.substring(1).split(' ')
    value = value.join(' ')

    const setting = SETTINGS_BY_KEY[name.toUpperCase()]
    console.log('describe setting', name, 'value', value, setting)

    if (!setting || !setting.key) return t?.('extensions.commands-settings.set', 'Setting {{name}}?', { name }) || `Setting ${name}?`

    const isDefault = settings[setting.key] === undefined
    const currentValue = settings[setting.key] || setting.default

    if (value) {
      value = _coerceValue({ setting, value })

      console.log('-- coerced value', value)
      if (value !== currentValue) {
        return t?.('extensions.commands-settings.setChange', 'Change {{label}} to {{value}}?', { label: setting.label, value: _describeValue({ setting, value }) }) || `Change "${setting.label}" to \`${_describeValue({ setting, value })}\`?`
      } else {
        return t?.('extensions.commands-settings.setCurrent', '{{label}}: {{value}}', { label: setting.label, value: _describeValue({ setting, value: currentValue, isDefault }) }) || `${setting.label}: \`${_describeValue({ setting, value: currentValue, isDefault })}\``
      }
    } else {
      return t?.('extensions.commands-settings.setCurrent', '{{label}}: {{value}}', { label: setting.label, value: _describeValue({ setting, value: currentValue, isDefault }) }) || `${setting.label}: \`${_describeValue({ setting, value: currentValue, isDefault })}\``
    }
  },
  invokeCommand: (match, { operation, qsos, dispatch, settings, t }) => {
    console.log('invoke', match)
    let [name, ...value] = match[2]?.substring(1).split(' ')
    value = value.join(' ')

    const setting = SETTINGS_BY_KEY[name.toUpperCase()]

    if (!setting || !setting.key) return ' '

    if (value) {
      value = _coerceValue({ setting, value })
      if (value === settings[setting.key]) return ' '

      console.log('-- changing value', setting.key, value)
      dispatch(setSettings({ [setting.key]: value }))

      return t?.('extensions.commands-settings.setConfirm', '{{label}} set to {{value}}', { label: setting.label, value: _describeValue({ setting, value }) }) || `"${setting.label}" set to \`${_describeValue({ setting, value })}\``
    } else {
      console.log('-- not changing value', setting.key, value)
      return t?.('extensions.commands-settings.setNotChanged', 'Not changed') || 'Not changed'
    }
  }
}

const SETTINGS = {
  'devMode': {
    alias: 'konami',
    label: 'Developer Mode',
    default: false,
    type: 'boolean'
  },
  'showNumbersRow': {
    alias: 'numbersRow',
    label: 'Show Numbers Row',
    default: false,
    type: 'boolean'
  },
  'showDeletedOps': {
    alias: 'deletedOps',
    label: 'Show Deleted Operations',
    default: false,
    type: 'boolean'
  },
  'showDeletedQSOs': {
    alias: 'deletedQSOs',
    label: 'Show Deleted QSOs',
    default: false,
    type: 'boolean'
  },
  'defaultReportCW': {
    alias: 'reportCW',
    label: 'Default Report CW',
    default: '599',
    type: 'string'
  },
  'defaultReportFT8': {
    aliases: ['reportFT8', 'reportFT4', 'defaultReportFT4'],
    label: 'Default Report FT8/FT4',
    default: '+0',
    type: 'string'
  },
  'defaultReport': {
    aliases: ['reportSSB', 'defaultReportSSB', 'reportRTTY', 'defaultReportRTTY'],
    label: 'Default Report',
    default: '59',
    type: 'string'
  },
}
const SETTINGS_BY_KEY = {}

for (const key of Object.keys(SETTINGS)) {
  const setting = SETTINGS[key]
  const upcasedKey = key.toUpperCase()
  SETTINGS_BY_KEY[upcasedKey] = { ...setting, key }

  if (setting.aliases) {
    for (const alias of setting.aliases) {
      SETTINGS_BY_KEY[alias.toUpperCase()] = { ...setting, key }
    }
  } else if (setting.alias) {
    SETTINGS_BY_KEY[setting.alias.toUpperCase()] = { ...setting, key }
  }
}

function _describeValue({ setting, value, isDefault }) {
  console.log('-- describe value', setting.type, value, typeof value)
  let description
  if (setting.type === 'boolean') {
    description = value ? 'YES' : 'NO'
  } else if (setting.type === 'string') {
    description = `"${value}"`
  } else if (setting.type === 'number') {
    description = `${value}`
  } else {
    description = `"${value}"`
  }
  return isDefault ? `${description} *` : description
}

function _coerceValue({ setting, value }) {
  console.log('-- coerce value', setting.type, value, typeof value)
  if (setting.type === 'boolean') {
    value = (value || '').trim().toUpperCase()
    return value === 'Y' || value === '1' || value === 'T' || value === 'ON' || value === 'YES' || value === 'TRUE'
  } else if (setting.type === 'string') {
    value = (value || '').trim()
    return String(value)
  } else if (setting.type === 'number') {
    value = (value || '').trim()
    return Number(value)
  }
  return value
}

