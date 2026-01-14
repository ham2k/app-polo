/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Linking } from 'react-native'
import { postSpots, retrieveHooksWithSpotting } from '../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/SecondaryExchangePanel/SpotterControl'
import { fmtFreqInMHz } from '../../tools/frequencyFormats'

const Info = {
  key: 'commands-misc',
  name: 'Miscelaneous Commands'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: RTFMCommandHook })
    registerHook('command', { priority: 100, hook: SpotCommandHook })
  }
}

export default Extension

const RTFMCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-misc-rtfm',
  match: /RTFM/i,
  describeCommand: (match, { t }) => {
    return t?.('extensions.commands-misc.rtfm', 'Read the fine manual?') || 'Read the fine manual?'
  },
  invokeCommand: (match, { handleFieldChange }) => {
    Linking.openURL('https://polo.ham2k.com/docs/')
    return t?.('extensions.commands-misc.rtfmConfirm', 'Opening the fine manual') || 'Opening the fine manual'
  }
}

const SpotCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-misc-spot',
  match: /^(SPOT|SPOTME|SPME|SELFSPOT|QRV|QRT|QSY)(|[ /][\s\w\d!,.-_]*)$/i,
  allowSpaces: true,
  describeCommand: (match, { t, vfo, operation }) => {
    console.log('spot command hook', match, vfo, operation)
    if (!vfo || !operation) return

    let comments = match[2]?.substring(1) || ''

    if (!vfo.freq) return t?.('extensions.commands-misc.spot.cannotSelfSpotWithoutFrequency', 'Cannot self-spot without frequency') || 'Cannot self-spot without frequency'

    if (['QRV', 'QRT', 'QSY'].indexOf(match[1]) >= 0) {
      comments = [match[1], comments].filter(x => x).join(' ')
      if (!comments.match(/QRT/i) && operation?.stationCallPlusArray?.length > 0) {
        comments += ` (${operation?.stationCallPlusArray?.length + 1} ops)`
      }
    }

    if (comments) {
      comments = comments.trim()
      return t?.('extensions.commands-misc.spot.selfSpotWithComments', 'Self-spot with ‘{{comments}}’?', { comments }) || `Self-spot with ‘${comments}’?`
    } else {
      return t?.('extensions.commands-misc.spot.selfSpotPrompt', 'Self-spot?') || 'Self-spot?'
    }
  },
  invokeCommand: (match, { t, operation, vfo, dispatch, settings }) => {
    if (!vfo || !operation) return

    let comments = match[2]?.substring(1) || ''

    if (!vfo.freq) return t?.('extensions.commands-misc.spot.cannotSelfSpotWithoutFrequency', 'Cannot self-spot without frequency') || 'Cannot self-spot without frequency'

    if (['QRV', 'QRT', 'QSY'].indexOf(match[1]) >= 0) {
      comments = [match[1], comments].filter(x => x).join(' ')
      if (match[2]) comments += ` ${match[2].substring(1)}`

      if (operation?.stationCallPlusArray?.length > 0) comments += ` ${operation?.stationCallPlusArray?.length + 1} ops`
    }

    if (comments) {
      comments = comments.trim()
    }

    const hooksWithSpotting = retrieveHooksWithSpotting({ isSelfSpotting: true, operation, settings })
    postSpots({ t, isSelfSpotting: true, operation, vfo, comments, hooksWithSpotting, dispatch })
    if (comments) {
      return t?.('extensions.commands-misc.spot.selfSpottingWithComments', 'Self-spotting at {{freq}} with ‘{{comments}}’', { freq: fmtFreqInMHz(vfo.freq), comments }) || `Self-spotting at ${fmtFreqInMHz(vfo.freq)} with ‘${comments}’`
    } else {
      return t?.('extensions.commands-misc.spot.selfSpotting', 'Self-spotting at {{freq}}', { freq: fmtFreqInMHz(vfo.freq) }) || `Self-spotting at ${fmtFreqInMHz(vfo.freq)}`
    }
  }
}
