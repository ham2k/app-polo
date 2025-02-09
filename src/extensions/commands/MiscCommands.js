/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
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
  match: /^(SPOT|SPOTME|SPME|SELFSPOT|QRV|QRT|QSY)(|[/.][\w\d]*)$/i,
  describeCommand: (match, { vfo, operation }) => {
    let comments = match[2]?.substring(1) || ''

    if (!vfo.freq) return 'Cannot self-spot without frequency'

    if (['QRV', 'QRT', 'QSY'].indexOf(match[1]) >= 0) {
      comments = match[1]
      console.log(operation)
      if (operation?.stationCallPlusArray?.length > 0) comments += ` ${operation?.stationCallPlusArray?.length + 1} ops`
    }

    if (comments) {
      return `Self-spot with ‘${comments}’?`
    } else {
      return 'Self-spot?'
    }
  },
  invokeCommand: (match, { operation, vfo, dispatch, settings }) => {
    let comments = match[2]?.substring(1) || ''

    if (!vfo.freq) return 'Cannot self-spot without frequency'

    if (['QRV', 'QRT', 'QSY'].indexOf(match[1]) >= 0) {
      comments = match[1]

      if (operation?.stationCallPlusArray?.length > 0) comments += ` ${operation?.stationCallPlusArray?.length + 1} ops`
    }

    const activityHooksWithSpotting = retrieveHooksWithSpotting({ operation, settings })
    postSpots({ operation, vfo, comments, activityHooksWithSpotting, dispatch })
    if (comments) {
      return `Self-spotting at ${fmtFreqInMHz(vfo.freq)} with ‘${comments}’`
    } else {
      return `Self-spotting at ${fmtFreqInMHz(vfo.freq)}`
    }
  }
}
