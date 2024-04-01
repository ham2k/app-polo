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
  }
}

export default Extension

const BandCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-band',
  matchRegex: /^(2|6|10|12|15|17|20|30|40|60|80|160)M{0,1}$/i,
  invokeCommand: (match, { handleFieldChange }) => {
    handleFieldChange({ fieldId: 'band', value: match[1] + 'm' })
  }
}

const FrequencyCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-frequency',
  matchRegex: /^([\d.]{1,})$/,
  invokeCommand: (match, { qso, handleFieldChange }) => {
    if (match[1].startsWith('..') && qso.freq) {
      handleFieldChange({ fieldId: 'freq', value: `${Math.round(qso.freq)}${match[1].substring(1)}` })
    } else if (match[1].startsWith('.') && qso.freq) {
      handleFieldChange({ fieldId: 'freq', value: `${Math.round(qso.freq / 1000)}${match[1]}` })
    } else {
      handleFieldChange({ fieldId: 'freq', value: match[1] })
    }
  }
}

const ModeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-mode',
  matchRegex: /^(CW|SSB|USB|LSB|FM|AM|FT8|FT4|RTTY)$/i,
  invokeCommand: (match, { handleFieldChange }) => {
    handleFieldChange({ fieldId: 'mode', value: match[1] })
  }
}
