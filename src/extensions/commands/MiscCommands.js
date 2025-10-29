/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Linking } from 'react-native'
import { postSpots, retrieveHooksWithSpotting } from '../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/SecondaryExchangePanel/SpotterControl'

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
  describeCommand: (match) => {
    return 'Read the fine manual?'
  },
  invokeCommand: (match, { handleFieldChange }) => {
    Linking.openURL('https://polo.ham2k.com/docs/')
    return 'Opening the fine manual'
  }
}

const SpotCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-misc-spot',
  match: /^(SPOT|SPOTME|SPME|SELFSPOT|QRV|QRT|QSY)(|[ /][\s\w\d!,.-_]*)$/i,
  allowSpaces: true,
  describeCommand: (match, { vfo, operation }) => {
    console.log('spot command hook', match, vfo, operation)
    if (!vfo || !operation) return

    let comments = match[2]?.substring(1) || ''

    if (!vfo.freq) return 'Cannot self-spot without frequency'

    if (['QRV', 'QRT', 'QSY'].indexOf(match[1]) >= 0) {
      comments = [match[1], comments].filter(x => x).join(' ')
      if (operation?.stationCallPlusArray?.length > 0) comments += ` ${operation?.stationCallPlusArray?.length + 1} ops`
    }

    if (comments) {
      comments = comments.trim()
      return `Self-spot with ‘${comments}’?`
    } else {
      return 'Self-spot?'
    }
  },
  invokeCommand: (match, { operation, vfo, dispatch, settings }) => {
    if (!vfo || !operation) return

    let comments = match[2]?.substring(1) || ''

    if (!vfo.freq) return 'Cannot self-spot without frequency'

    if (['QRV', 'QRT', 'QSY'].indexOf(match[1]) >= 0) {
      comments = [match[1], comments].filter(x => x).join(' ')
      if (match[2]) comments += ` ${match[2].substring(1)}`

      if (operation?.stationCallPlusArray?.length > 0) comments += ` ${operation?.stationCallPlusArray?.length + 1} ops`
    }

    if (comments) {
      comments = comments.trim()
    }

    const hooksWithSpotting = retrieveHooksWithSpotting({ isSelfSpotting: true, operation, settings })
    postSpots({ isSelfSpotting: true, operation, vfo, comments, hooksWithSpotting, dispatch })
    if (comments) {
      return `Self-spotting at ${fmtFreqInMHz(vfo.freq)} with ‘${comments}’`
    } else {
      return `Self-spotting at ${fmtFreqInMHz(vfo.freq)}`
    }
  }
}
