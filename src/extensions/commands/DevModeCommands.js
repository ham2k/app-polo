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
  matchRegex: /^KONAMI$/i,
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
      'M',
      'MO',
      'MOD',
      'MODE',
      `MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MODe ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MODe ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `mODE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MoDE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MOdE ${!settings.devMode ? 'ON' : 'OFF'}`,
      `MODe ${!settings.devMode ? 'ON' : 'OFF'}`,
      ''
    ],
    handleFieldChange, { time: 50 })
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

function animateCallIn (str, handleFieldChange, options = {}) {
  const { delay = 100, step = 1 } = options
  let i = 0
  const interval = setInterval(() => {
    if (i < str.length) {
      handleFieldChange({ fieldId: 'theirCall', value: str.substring(0, i + 1) })
      i += step
    } else {
      clearInterval(interval)
    }
  }, delay)
}

function animateCallOut (str, handleFieldChange, options = {}) {
  const { delay = 100, step = 1 } = options
  let i = 0
  const interval = setInterval(() => {
    if (i <= str.length) {
      handleFieldChange({ fieldId: 'theirCall', value: str.substring(0, str.length - i) })
      i += step
    } else {
      clearInterval(interval)
    }
  }, delay)
}
