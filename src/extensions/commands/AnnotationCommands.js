/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert, Linking } from 'react-native'
import { XMLParser } from 'fast-xml-parser'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import { postSpots, retrieveHooksWithSpotting } from '../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/SecondaryExchangePanel/SpotterControl'
import { fmtFreqInMHz } from '../../tools/frequencyFormats'
import { newEventQSO, addQSO } from '../../store/qsos'
import { fetchWithTimeout } from '../../tools/fetchWithTimeout'
import Geolocation from '@react-native-community/geolocation'

const Info = {
  key: 'commands-annotation',
  name: 'Annotation Commands'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: NotesCommandHook })
    registerHook('command', { priority: 100, hook: EarthWeatherCommandHook })
    registerHook('command', { priority: 100, hook: SolarWeatherCommandHook })
  }
}

export default Extension

const NotesCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-misc-spot',
  match: /^(NOTES|NOTE)(|[ /.]|[\s\w\d!,.-_]*)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation }) => {
    if (!operation) { return false }

    let note = match[2]?.substring(1) || ''

    if (note) {
      note = note.trim()
      return `Add note: ‘${note}’?`
    } else {
      return 'Add a note? keep typing…'
    }
  },
  invokeCommand: (match, { operation, dispatch, settings }) => {
    if (!operation) { return }

    let note = match[2]?.substring(1) || ''

    if (note) {
      note = note.trim()
      const event = {
        event: 'note',
        command: `NOTE ${note}`,
        note
      }
      dispatch(newEventQSO({ uuid: operation.uuid, event }))

      return `Note added!`
    }
  }
}

const EarthWeatherCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-misc-weather',
  match: /^(WEATHER|WEATHER!)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation }) => {
    if (match[1].includes('!') && operation) {
      return `Fetch current weather and annotate operation?`
    } else if (operation) {
      return `Fetch current weather? (add '!' to annotate)`
    } else {
      return `Fetch current weather?`
    }
  },
  invokeCommand: (match, { operation, dispatch, settings, setCommandInfo }) => {
    setTimeout(async () => {
      console.log('weather!')
      const weatherData = await _getWeatherData({ operation, settings })

      const current = WEATHER_CODES[weatherData.current.weather_code]
      const currentEmoji = weatherData.current.is_day ? (current?.dayEmoji ?? current?.emoji) : (current?.nightEmoji ?? current?.emoji) || '🌤️'
      const currentDescription = weatherData.current.is_day ? (current?.dayDescription ?? current?.description) : (current?.nightDescription ?? current?.description)

      const message = `${currentEmoji} `
        + `${weatherData.current.temperature_2m}${weatherData.current_units.temperature_2m} `
        + `${currentDescription} `
        + `💧 ${weatherData.current.relative_humidity_2m}%, `
        + `💨 ${weatherData.current.wind_speed_10m}${weatherData.current_units.wind_speed_10m}`

      console.log(message, weatherData)
      if (match[1].includes('!') && operation) {
        dispatch(newEventQSO({
          uuid: operation.uuid, event: {
            event: 'weather',
            weatherData,
            icon: 'weather-sunny',
            description: message
          }
        }))
      }
      setCommandInfo && setCommandInfo({ message, match: true, timeout: 6000 })
    }, 500)
    return `Fetching current weather…`
  }
}

const SolarWeatherCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-misc-solar',
  match: /^(SOLAR|SOLAR!)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation }) => {
    if (match[1].includes('!') && operation) {
      return `Fetch solar weather and annotate operation?`
    } else if (operation) {
      return `Fetch solar weather? (add '!' to annotate)`
    } else {
      return `Fetch solar weather?`
    }
  },
  invokeCommand: (match, { operation, dispatch, settings, setCommandInfo }) => {
    setTimeout(async () => {
      const solarData = await _getSolarData({ operation, settings })
      console.log('☀️ Solar Data', solarData)

      const message = `${_emojiForSFI(solarData.solarflux)}SFI ${solarData.solarflux} `
        + `• ${_emojiForAIndex(solarData.aindex)}A ${solarData.aindex} `
        + `• ${_emojiForKIndex(solarData.kindex)}K ${solarData.kindex} `
        + `• ${_emojiForSN(solarData.sunspots)}SN ${solarData.sunspots}`

      if (match[1].includes('!') && operation) {
        dispatch(newEventQSO({
          uuid: operation.uuid, event: {
            event: 'solar',
            solarData,
            icon: 'sun-wireless',
            description: message
          }
        }))
      }
      setCommandInfo && setCommandInfo({ message, match: true, timeout: 6000 })
    }, 500)
    return `Fetching solar weather…`
  }
}

async function _getSolarData() {
  try {
    const response = await fetchWithTimeout('https://www.hamqsl.com/solarxml.php')
    const body = await response.text()
    const parser = new XMLParser()
    const xml = parser.parse(body)
    const solarData = { ...xml?.solar?.solardata }
    return solarData
  } catch (error) {
    Alert.alert('Error fetching solar weather', error.message)
    console.error('Error fetching solar weather:', error)
    return {}
  }
}

async function _getWeatherData({ operation, settings }) {
  let latitude, longitude

  if (operation?.grid) {
    const location = gridToLocation(operation.grid)
    latitude = location[0]
    longitude = location[1]
  } else {
    await new Promise(async (resolve, reject) => {
      const info = await Geolocation.getCurrentPosition(
        info => {
          latitude = info.coords.latitude
          longitude = info.coords.longitude
          resolve()
        },
        error => {
          reject(error)
        }, {
        enableHighAccuracy: false,
        timeout: 1000 * 5 /* 5 seconds */,
        maximumAge: 1000 * 5 * 60 /* 5 minutes */
      }
      )
    })
  }

  try {
    console.log('weather?', latitude, longitude)

    const params = {
      latitude,
      longitude,
      temperature_unit: settings.distanceUnits === 'miles' ? 'fahrenheit' : 'celsius',
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,wind_direction_10m,wind_gusts_10m,is_day',
      daily: 'sunrise,sunset',
    }
    const response = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${new URLSearchParams(params).toString()}`)
    const data = await response.json()

    return data
  } catch (error) {
    Alert.alert('Error fetching weather', error.message)
    console.error('Error fetching weather:', error)
    return {}
  }
}

function _emojiForSFI(sfi) {
  if (sfi < 100) {
    return '🔴'
  } else if (sfi < 150) {
    return '🟡'
  } else if (sfi < 200) {
    return '🔵'
  } else {
    return '🟢'
  }
}

function _emojiForAIndex(aindex) {
  if (aindex < 20) {
    return '🟢'
  } else if (aindex < 30) {
    return '🟡'
  } else if (aindex < 50) {
    return '🔴'
  } else if (aindex < 100) {
    return '🟤'
  } else {
    return '🟣'
  }
}

function _emojiForKIndex(kindex) {
  if (kindex <= 3) {
    return '🟢'
  } else if (kindex < 5) {
    return '🟡'
  } else if (kindex < 7) {
    return '🔴'
  } else if (kindex >= 7) {
    return '🟣'
  }
}

function _emojiForSN(sn) {
  return '😎'
}

export const WEATHER_CODES = {
  0: {
    description: "Sunny",
    emoji: "☀️",
    nightDescription: "Clear",
    nightEmoji: "🌙",
  },
  1: {
    description: "Mainly Sunny",
    emoji: "☀️",
    nightDescription: "Mainly Clear",
    nightEmoji: "🌙",
  },
  2: {
    description: "Partly Cloudy",
    emoji: "🌤️",
  },
  3: {
    description: "Cloudy",
    emoji: "🌥️",
  },
  45: {
    description: "Foggy",
    emoji: "🌫️",
  },
  48: {
    description: "Rime Fog",
    emoji: "🌫️",
  },
  51: {
    description: "Light Drizzle",
    emoji: "🌧️",
  },
  53: {
    description: "Drizzle",
    emoji: "🌧️",
  },
  55: {
    description: "Heavy Drizzle",
    emoji: "🌧️",
  },
  56: {
    description: "Light Freezing Drizzle",
    emoji: "🌧️",
  },
  57: {
    description: "Freezing Drizzle",
    emoji: "🌧️",
  },
  61: {
    description: "Light Rain",
    emoji: "🌧️",
  },
  63: {
    description: "Rain",
    emoji: "🌧️",
  },
  "65": {
    description: "Heavy Rain",
    emoji: "🌧️",
  },
  66: {
    description: "Light Freezing Rain",
    emoji: "🌧️",
  },
  67: {
    description: "Freezing Rain",
    emoji: "🌧️",
  },
  71: {
    description: "Light Snow",
    emoji: "🌨️",
  },
  73: {
    description: "Snow",
    emoji: "🌨️",
  },
  75: {
    description: "Heavy Snow",
    emoji: "🌨️",
  },
  77: {
    description: "Snow Grains",
    emoji: "🌨️",
  },
  80: {
    description: "Light Showers",
    emoji: "🌧️",
  },
  81: {
    description: "Showers",
    emoji: "🌧️",
  },
  82: {
    description: "Heavy Showers",
    emoji: "🌧️",
  },
  85: {
    description: "Light Snow Showers",
    emoji: "🌨️",
  },
  86: {
    description: "Snow Showers",
    emoji: "🌨️",
  },
  95: {
    description: "Thunderstorm",
    emoji: "⛈️",
  },
  96: {
    description: "Light Thunderstorms With Hail",
    emoji: "⛈️",
  },
  99: {
    description: "Thunderstorm With Hail",
    emoji: "⛈️",
  },
}
