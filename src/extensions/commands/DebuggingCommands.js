/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { DevSettings } from 'react-native'

import { persistor } from '../../store'
import { addQSOs } from '../../store/qsos'
import { resetSyncedStatus } from '../../store/operations'
import { dbExecute, dbSelectAll, resetDatabase } from '../../store/db/db'
import { setLocalData } from '../../store/local'
import { setSettings } from '../../store/settings'
import { clearAllOperationData, loadOperations } from '../../store/operations/actions/operationsDB'
import { addNotice, clearNoticesDismissed, clearMatchingNotices, setSystemFlag } from '../../store/system'
import { poissonRandom } from '../../tools/randomTools'
import { logTimer } from '../../tools/perfTools'
import { annotateQSO } from '../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'
import { getAllCallsFromNotes } from '../data/call-notes/CallNotesExtension'
import { refreshCrowdInTranslations } from '../../i18n/i18n'

const Info = {
  key: 'commands-debug',
  name: 'Commands that assist in debugging problems'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: ErrorCommandHook })
    registerHook('command', { priority: 100, hook: NoticeCommandHook })
    registerHook('command', { priority: 100, hook: ResetNoticesCommandHook })
    registerHook('command', { priority: 100, hook: SeedCommandHook })
    registerHook('command', { priority: 100, hook: OnboardCommandHook })
    registerHook('command', { priority: 100, hook: ResyncLocalDataCommandHook })
    registerHook('command', { priority: 100, hook: WipeOperationsCommandHook })
    registerHook('command', { priority: 100, hook: WipeDBCommandHook })
    registerHook('command', { priority: 100, hook: FactoryResetCommandHook })
    registerHook('command', { priority: 100, hook: RefreshCrowdInTranslationsCommandHook })
    registerHook('command', { priority: 100, hook: SwitchLanguageCommandHook })
    registerHook('command', { priority: 100, hook: RecoverBackupCommandHook })
  }
}

export default Extension

const ErrorCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-error',
  match: /^ERROR!/i,
  describeCommand: (match) => {
    return 'Throw a test error?'
  },
  invokeCommand: (match, { handleFieldChange }) => {
    throw new Error('Test error triggered!')
  }
}

const NoticeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-notice',
  match: /^(NOTICELONG|NOTICE)/i,
  describeCommand: (match) => {
    if (match[1] === 'NOTICELONG') {
      return 'Show a long notice?'
    } else {
      return 'Show a notice?'
    }
  },
  invokeCommand: (match, { dispatch }) => {
    console.log('NoticeCommandHook', match)
    let text = 'This is a sample notice. With **some text** using ~~Markdown~~.'
    let dialogText = 'This is a sample dialog text. With **some text** using ~~Markdown~~. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    if (match[1] === 'NOTICELONG') {
      text = 'This is a longer sample notice. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
      dialogText = `This is a longer sample dialog text.

One Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Two Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Three Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Four Lorem ipsum dolor sit amet, consectetur adipiscing elit.Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Five Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
    }

    dispatch(addNotice({
      key: `debug-notice-${Date.now()}`,
      title: `Sample Notice ${Math.floor(Math.random() * 100)}`,
      text,
      actionLabel: 'Do it!',
      action: 'dialog',
      actionArgs: {
        dialogTitle: 'Sample Notice Dialog',
        dialogText: dialogText,
        dialogActions: [
          { label: 'Change', action: 'navigate', args: ['Settings', { screen: 'DataSettings' }] },
          { label: 'RTFM', action: 'link', args: { url: 'https://polo.ham2k.com/docs' } },
        ]
      }
    }))
    return 'Notice shown'
  }
}

const ResetNoticesCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-reset-notices',
  match: /^RESETNOTICES/i,
  describeCommand: (match) => {
    return 'Reset notices seen?'
  },
  invokeCommand: (match, { dispatch }) => {
    dispatch(clearNoticesDismissed())
    return 'Notices seen reset'
  }
}

const OnboardCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-onboard',
  match: /^ONBOARD/i,
  describeCommand: (match, { t }) => {
    return t?.('extensions.commands-debug.onboard', 'Reset the onboarding process?') || 'Reset the onboarding process?'
  },
  invokeCommand: (match, { dispatch, t }) => {
    dispatch(setSystemFlag('onboardedOn', undefined))
    dispatch(setSettings({ operatorCall: undefined }))
    setTimeout(() => DevSettings.reload(), 500)
    return t?.('extensions.commands-debug.onboardConfirm', 'Onboarding process resetted') || 'Onboarding process resetted'
  }
}

const WipeOperationsCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-wipeoperations',
  match: /^(WIPE!|SYNCALL)/i,
  describeCommand: (match, { t }) => {
    return t?.('extensions.commands-debug.syncall', 'Delete all operations and reset synced status?') || 'Delete all operations and reset synced status?'
  },
  invokeCommand: (match, { dispatch, t }) => {
    setImmediate(async () => {
      await dispatch(setLocalData({ sync: { lastestOperationSyncedAtMillis: 0, completedFullSync: false } }))
      dispatch(clearMatchingNotices({ uniquePrefix: 'sync:' }))
      await dispatch(clearAllOperationData())
    })
    return t?.('extensions.commands-debug.syncallConfirm', 'Wiping data and resyncing all…') || 'Wiping data and resyncing all…'
  }
}

const ResyncLocalDataCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-resynclocaldata',
  match: /^(SYNCUP)/i,
  describeCommand: (match, { t }) => {
    return t?.('extensions.commands-debug.syncup', 'Re-send local data to sync service?') || 'Re-send local data to sync service?'
  },
  invokeCommand: (match, { dispatch, t }) => {
    setImmediate(async () => {
      await dispatch(resetSyncedStatus())
    })
    return t?.('extensions.commands-debug.syncupConfirm', 'Re-sending…') || 'Re-sending…'
  }
}

const WipeDBCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-wipedb',
  match: /^WIPEDB!/i,
  describeCommand: (match, { t }) => {
    return t?.('extensions.commands-debug.wipedb', 'Delete entire database (but keep settings)?') || 'Delete entire database (but keep settings)?'
  },
  invokeCommand: (match, { dispatch, t }) => {
    dispatch(setLocalData({ sync: { lastestOperationSyncedAtMillis: 0, completedFullSync: false } }))
    setTimeout(async () => {
      await resetDatabase()
    }, 1000)
    return t?.('extensions.commands-debug.wipedbConfirm', 'Wiping Database…') || 'Wiping Database…'
  }
}

const FactoryResetCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-factory',
  match: /^FACTORY!/i,
  describeCommand: (match, { t }) => {
    return t?.('extensions.commands-debug.factory', 'Delete all data and settings?') || 'Delete all data and settings?'
  },
  invokeCommand: (match, { dispatch, settings }) => {
    setTimeout(async () => {
      await persistor.purge()
      await resetDatabase()
    }, 1000)
    return t?.('extensions.commands-debug.factoryConfirm', 'Factoy Reset in progress…') || 'Factoy Reset in progress…'
  }
}

const SeedCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-seed',
  match: /^SEED(\d+)$/i,
  describeCommand: (match, { operation }) => {
    if (!operation) return

    const count = parseInt(match[1], 10)
    return `Seed the log with ${count} QSOs?`
  },
  invokeCommand: (match, { handleFieldChange, handleSubmit, updateLoggingState, dispatch, qso, vfo, operation, settings, online, ourInfo }) => {
    if (!operation) return

    let count = parseInt(match[1], 10)
    setTimeout(async () => {
      try {
        let startAtMillis = Date.now()

        const times = []
        for (let i = 0; i < count; i++) {
          const t = poissonRandom(120) * 1000 // mean of 120 seconds per QSO
          times.push(t)
          startAtMillis -= t
        }
        const calls = getAllCallsFromNotes().filter(x => x)
        if (calls.length === 0) calls.concat(['KI2D', 'M1SDH', 'EI5IYB', 'M0LZN', 'WV3H', 'LB4FH', 'VK1AO'])

        logTimer('seeding', 'Start', { reset: true })
        const qsos = []
        while (count > 0) {
          const index = Math.floor(Math.random() * calls.length)
          let call = calls[index] || GLOBAL?.t?.('general.misc.placeholderCallsign', 'N0CALL') || 'N0CALL'

          if (Math.random() > 0.20) { // On 80% of the calls, replace the digit with something random
            call = call.replace(/(?<=\w)(\d)/, (m, p1) => {
              return (parseInt(p1, 10) + Math.floor(Math.random() * 10)) % 10
            })
          }

          calls.splice(index, 1)

          let oneQSO = {
            mode: qso?.mode ?? vfo?.mode ?? 'SSB',
            band: qso?.band ?? vfo?.band ?? '20m',
            freq: qso?.freq ?? vfo?.freq,
            startAtMillis,
            startAt: new Date(startAtMillis).toISOString()
          }
          oneQSO.their = { call, sent: randomRST(oneQSO.mode) }
          oneQSO.our = { call: ourInfo.call, operatorCall: ourInfo.operatorCall || operation.local?.operatorCall, sent: randomRST(oneQSO.mode) }
          console.log('annotating', oneQSO)
          oneQSO = await annotateQSO({ qso: oneQSO, online: false, settings, dispatch })

          qsos.push(oneQSO)
          console.log('qsos ongoing', qsos)

          count--
          startAtMillis = startAtMillis + times.pop()
          logTimer('seeding', 'Seeded one', { sinceLast: true })
        }
        console.log('adding', qsos)
        await dispatch(addQSOs({ uuid: operation.uuid, qsos }))
        updateLoggingState({ selectedUUID: undefined, lastUUID: qsos[qsos.length - 1]?.uuid })

        logTimer('seeding', 'Done seeding')
      } catch (e) {
        console.error('Error while seeding', e)
      }
    }, 0)
    return `Seeding the log with ${count} QSOs`
  }
}

const RefreshCrowdInTranslationsCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-refresh-crowdin-translations',
  match: /^(CROWDINALL|CROWDIN)/i,
  describeCommand: (match, { i18n, t }) => {
    if (match[1] === 'CROWDINALL') {
      return 'Refresh ALL CrowdIn translations?'
    } else {
      return `Refresh [${i18n.language}] CrowdIn translations?`
    }
    return 'Refresh CrowdIn translations?'
  },
  invokeCommand: (match, { dispatch, settings, i18n, t }) => {
    const all = match[1] === 'CROWDINALL'
    setImmediate(async () => {
      await refreshCrowdInTranslations({ all, i18n, settings, dispatch, token: settings.crowdInPersonalToken })
    })
    if (all) {
      return 'Refreshing ALL CrowdIn translations…'
    } else {
      return `Refreshing [${i18n.language}] CrowdIn translations…`
    }
    return 'Refreshing CrowdIn translations…'
  }
}

const SwitchLanguageCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-switch-language',
  match: /^(LANG)(|[ /.]|.+)$/i,
  allowSpaces: true,
  describeCommand: (match, { i18n, settings, t }) => {
    let lang = match[2]?.substring(1) || ''

    if (lang) {
      const parts = lang.split('-')
      lang = [parts[0]?.toLowerCase(), parts[1]?.toUpperCase()].filter(Boolean).join('-')

      return t(
        'extensions.commands-debug.switchLanguage',
        'Switch language to `{{lang}}` {{name}}?',
        { lang, name: t(`general.languages.names.${lang}`, '') }
      ).trim()
    } else {
      lang = settings.language || 'default'
      return t(
        'extensions.commands-debug.switchLanguagePrompt',
        'Language `{{lang}}` {{name}}',
        { lang, name: t(`general.languages.names.${lang}`, '') }
      ).trim()
    }
  },
  invokeCommand: (match, { dispatch, settings, t }) => {
    let lang = match[2]?.substring(1) || ''
    if (lang) {
      const parts = lang.split('-')
      lang = [parts[0]?.toLowerCase(), parts[1]?.toUpperCase()].filter(Boolean).join('-')
      if (lang === 'default') lang = undefined
      dispatch(setSettings({ language: lang }))
      return t('extensions.commands-debug.switchLanguageConfirm', 'Switching to `{{lang}}` {{name}}…', { lang, name: t(`general.languages.names.${lang}`, '') }).trim()
    } else {
      return false
    }
  }
}

const RecoverBackupCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-recover-backup',
  match: /^(RECOVER!)$/i,
  allowSpaces: true,
  describeCommand: (match, { i18n, settings, t }) => {
    return "Recover local dabatase backup?"
  },
  invokeCommand: (match, { dispatch, settings, t }) => {
    setImmediate(async () => {
      const tables = await dbSelectAll("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name")
      console.log('tables', tables)
      const backups = tables.map(t => {
        const match = t.name.match(/^bkp_(\d+)_(.*)$/)
        if (match) {
          return {
            backupTable: t.name,
            timestamp: match[1],
            tableName: match[2]
          }
        }
      }).filter(Boolean)
      console.log('backups', backups)
      backups.forEach(async (backup) => {
        console.log('backup', backup)
        console.log(`INSERT OR IGNORE INTO ${backup.tableName} SELECT * FROM ${backup.backupTable}`)
        await dbExecute(`INSERT OR IGNORE INTO ${backup.tableName} SELECT * FROM ${backup.backupTable}`)
      })
      await dispatch(loadOperations())
    })
    return "Recovering local database backup…"
  }
}

function randomRST(mode) {
  const n = Math.min(poissonRandom(7), 9)
  if (mode === 'CW' || mode === 'RTTY') {
    return `${Math.min(n, 5)}${n}${n}`
  } else {
    return `${Math.min(n, 5)}${n}`
  }
}

