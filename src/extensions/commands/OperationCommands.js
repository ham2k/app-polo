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
import { fetchWithTimeout } from '../../tools/fetchWithTimeout'
import Geolocation from '@react-native-community/geolocation'
import { findHooks } from '../registry'
import { markOperationBreak, markOperationStart, markOperationStop } from '../../store/operations'

const Info = {
  key: 'commands-operation',
  name: 'Operation Commands'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: StartOperationCommandHook })
    registerHook('command', { priority: 100, hook: BreakOperationCommandHook })
    registerHook('command', { priority: 100, hook: StopOperationCommandHook })
  }
}

export default Extension

const StartOperationCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-operation-start',
  match: /^(START)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation }) => {
    if (!operation) { return false }

    return 'Start the operation?'
  },
  invokeCommand: (match, { operation, qsos, dispatch, settings }) => {
    if (!operation) { return }

    markOperationStart({ operation, qsos, dispatch })

    return `Operation started!`
  }
}

const BreakOperationCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-operation-break',
  match: /^(BREAK)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation }) => {
    if (!operation) { return false }

    return 'Add a break?'
  },
  invokeCommand: (match, { operation, qsos, dispatch, settings }) => {
    if (!operation) { return }

    markOperationBreak({ operation, qsos, dispatch })

    return `Operation broke!`
  }
}

const StopOperationCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-operation-stop',
  match: /^(STOP|END)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation }) => {
    if (!operation) { return false }

    return 'Stop the operation?'
  },
  invokeCommand: (match, { operation, qsos, dispatch, settings }) => {
    if (!operation) { return }

    markOperationStop({ operation, qsos, dispatch })

    return `Operation stopped!`
  }
}
