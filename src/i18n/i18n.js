/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import i18n from 'i18next'
import { getLocales, findBestLanguageTag } from 'react-native-localize'
import { initReactI18next } from 'react-i18next'
import Config from 'react-native-config'
import { Alert } from 'react-native'

import GLOBAL from '../GLOBAL'

import { setGlobalDialog } from '../store/ui'

import packageJson from '../../package.json'

const BUNDLED_LANGUAGES = ['en', 'es', 'ja', 'de', 'fr', 'nl', 'sk', 'nb', 'cs']

function readBundledJSON(language, namespace) {
  // Using `require` allows us to only load one language at a time
  // yet still include the files in the build, which allows OTA updates.
  // But `require` in native apps requires explicit paths; it cannot use variable interpolation.
  switch (`${language}/${namespace}`) {
    case 'en/translation':
      return {
        ...require('./resources/en/general.json'),
        ...require('./resources/en/polo.json'),
        ...require('./resources/en/extensions.json')
      }
    case 'qro/translation':
      return {
        ...require('./resources/qro/general.json'),
        ...require('./resources/qro/polo.json'),
        ...require('./resources/qro/extensions.json')
      }
    case 'qrp/translation':
      return {
        ...require('./resources/qrp/general.json'),
        ...require('./resources/qrp/polo.json'),
        ...require('./resources/qrp/extensions.json')
      }
    case 'cw/translation':
      return {
        ...require('./resources/cw/general.json'),
        ...require('./resources/cw/polo.json'),
        ...require('./resources/cw/extensions.json')
      }
    case 'cs/translation':
      return {
        ...require('./crowdin/cs/general.json'),
        ...require('./crowdin/cs/polo.json'),
        ...require('./crowdin/cs/extensions.json')
      }
    case 'es/translation':
      return {
        ...require('./crowdin/es/general.json'),
        ...require('./crowdin/es/polo.json'),
        ...require('./crowdin/es/extensions.json')
      }
    case 'de/translation':
      return {
        ...require('./crowdin/de/general.json'),
        ...require('./crowdin/de/polo.json'),
        ...require('./crowdin/de/extensions.json')
      }
    case 'fr/translation':
      return {
        ...require('./crowdin/fr/general.json'),
        ...require('./crowdin/fr/polo.json'),
        ...require('./crowdin/fr/extensions.json')
      }
    case 'ja/translation':
      return {
        ...require('./crowdin/ja/general.json'),
        ...require('./crowdin/ja/polo.json'),
        ...require('./crowdin/ja/extensions.json')
      }
    case 'nb/translation':
      return {
        ...require('./crowdin/nb/general.json'),
        ...require('./crowdin/nb/polo.json'),
        ...require('./crowdin/nb/extensions.json')
      }
    case 'nl/translation':
      return {
        ...require('./crowdin/nl/general.json'),
        ...require('./crowdin/nl/polo.json'),
        ...require('./crowdin/nl/extensions.json')
      }
    case 'no/translation': // Alias for nb
      return {
        ...require('./crowdin/nb/general.json'),
        ...require('./crowdin/nb/polo.json'),
        ...require('./crowdin/nb/extensions.json')
      }
    case 'sk/translation':
      return {
        ...require('./crowdin/sk/general.json'),
        ...require('./crowdin/sk/polo.json'),
        ...require('./crowdin/sk/extensions.json')
      }
  }
}

const BundledJSONBackend = {
  type: 'backend',
  read: (language, namespace, callback) => {
    try {
      const data = readBundledJSON(language, namespace)
      callback(null, data)
    } catch (error) {
      console.error('🔴🔴 BundledJSONBackend read error', language, namespace, error)
      callback(error, null)
    }
  }
}

export const preferredLanguage = () => {
  const locales = getLocales()
  return locales[0].languageCode
}

export const bestLanguageMatch = () => {
  const languages = [...supportedLanguages(), 'no']
  const bestMatch = findBestLanguageTag(supportedLanguages())

  if (bestMatch?.languageTag === 'no') {
    return 'nb'
  }

  return bestMatch?.languageTag
}

export const supportedLanguages = () => {
  return I18N_EXTRA_INFO.languages
}

const NativeLanguageDetector = {
  type: 'languageDetector',
  async: false,
  detect: () => {
    return bestLanguageMatch() || 'en'
  },
}

const I18N_EXTRA_INFO = {
  languages: BUNDLED_LANGUAGES
}

export const initializeI18Next = (language) => {
  console.log('🌎🌎🌎 initializeI18Next', language)
  return i18n
    .use(BundledJSONBackend)
    .use(NativeLanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      lng: language === 'default' ? undefined : language,
      debug: false,
      nonExplicitSupportedLngs: true,
      interpolation: {
        escapeValue: false
      },
    })
}

/** == CROWDIN API INTEGRATION ================================================ */

/**
Currently, this loads resources for one language and resets `i18next` with
that language hardcoded as `resources`, which overrides the provided Backend.
Perhaps there's a better way to do this by combining backends?

We also load the list of supported languages, and store it in `I18N_EXTRA_INFO`
so that our LanguageDialog can display an extended list of languages.
 */

const crowdinApiFetch = async (endpoint, { method = 'GET', token, body }) => {
  if (typeof body === 'object') {
    body = JSON.stringify(body)
  }

  const response = await fetch(`https://api.crowdin.com/api/v2/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': `Ham2K-PoLo/${packageJson.version}`
    },
    method,
    body
  })
  return response.json()
}

const CROWDIN_NAMESPACES = ['general', 'polo', 'extensions']

// These should match the "Language Mappings" at the bottom of https://crowdin.com/project/ham2k-polo/settings#languages
// for languages where the code we use is not the two-letter code
const CROWDIN_LANGUAGE_OVERRIDES = {
  'pt-BR': 'pt-BR',
  'en-PL': 'en-PL',
  'en-PT': 'en-PT',
}
export const refreshCrowdInTranslations = async ({ all = true, i18n, settings, dispatch, token }) => {
  try {
    dispatch(setGlobalDialog({
      uncancelable: true,
      title: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.title', 'Refreshing translations…'),
      content: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.starting', 'Please wait while we refresh the translations...')
    }))

    const projectResponse = await crowdinApiFetch(`projects/${Config.CROWDIN_PROJECT_ID}`, { token })
    console.log('projectResponse', projectResponse)
    let languages = projectResponse.data.targetLanguages.map(language => ({
      id: language.id,
      name: language.name,
      crowdInTwoLettersCode: language.twoLettersCode,
      twoLettersCode: CROWDIN_LANGUAGE_OVERRIDES[language.id] || language.twoLettersCode
    }))

    const filesResponse = await crowdinApiFetch(`projects/${Config.CROWDIN_PROJECT_ID}/files`, { token })
    const files = filesResponse.data.map(file => ({ id: file.data.id, name: file.data.name, namespace: file.data.name.replace('.json', '') }))

    console.log('languages', languages)
    I18N_EXTRA_INFO.languages = ['en', ...languages.map(language => language.twoLettersCode)]

    if (!all) {
      languages = languages.filter(language => language.id === i18n.language)
    }

    const total = languages.length * files.length
    let i = 0

    const resources = {}
    for (const language of languages) {
      resources[language.id] = { translation: {} }
      for (const file of files) {
        i++
        dispatch(setGlobalDialog({
          title: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.title', 'Refreshing translations…'),
          content: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.progress', '{{current}} / {{total}}: {{language}} - {{file}}', { current: i, total, language: language.name, file: file.name })
        }))

        if (CROWDIN_NAMESPACES.includes(file.namespace)) {
          // console.log('file', file)
          const fileResponse = await crowdinApiFetch(
            `projects/${Config.CROWDIN_PROJECT_ID}/translations/builds/files/${file.id}`, {
            token,
            method: 'POST',
            body: {
              targetLanguageId: language.id,
              exportApprovedOnly: false,
              skipUntranslatedStrings: false,
              skipUntranslatedFiles: false,
            }
          })
          const downloadUrl = fileResponse.data.url
          const downloadResponse = await fetch(downloadUrl)
          const json = await downloadResponse.json()
          console.log(`json for ${language.twoLettersCode} ${file.namespace}`, json)
          resources[language.twoLettersCode].translation = {
            ...resources[language.twoLettersCode].translation,
            ...json
          }
        }
      }
    }
    // initializeI18Next(i18n.language, resources)
    for (const language of languages) {
      i18n.addResourceBundle(language.twoLettersCode, 'translation', resources[language.twoLettersCode].translation)
    }

    dispatch(setGlobalDialog({
      uncancelable: false,
      title: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.title', 'Refreshing translations…'),
      content: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.completed', 'Refresh completed!')
    }))
  } catch (error) {
    console.error('Error refreshing CrowdIn translations', error)
    dispatch(setGlobalDialog({
      uncancelable: false,
      title: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.errorTitle', 'Error refreshing translations'),
      content: GLOBAL?.t?.('screens.devModeSettings.internationalization.refreshCrowdInTranslations.error', 'Error refreshing CrowdIn translations: {{error}}', { error: error.message })
    }))
  }
}

/**
 * Some statistics (perhaps hallucinated, but close enough to be useful):
 * - English (en)    ~960,000
 * - Japanese (ja)   ~382,000
 * - Mandarin (zh)   ~240,000
 * - Spanish (es)     ~75,600
 * - Thai (th)       ~101,800
 * - German (de)      ~63,100
 * - Korean (ko)      ~42,600
 * - Russian (ru)     ~38,000
 * - Portuguese (pt)  ~32,100
 * - Turkish (tr)     ~32,000
 * - Italian (it)     ~30,000
 * - Indonesian (id)  ~27,800
 * - Ukrainian (uk)   ~17,300
 * - Polish (pl)      ~15,800
 * - Hindi (hi)       ~15,700
 * - French (fr)      ~13,500
 */
