/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
  describeCommand: (match, { operation, settings, t }) => {
    if (!operation) { return false }
    if (!settings?.devMode) { return false }

    return t?.('extensions.commands-operation.start', 'Start the operation?') || 'Start the operation?'
  },
  invokeCommand: (match, { operation, qsos, dispatch, settings, t }) => {
    if (!operation) { return }
    if (!settings?.devMode) { return false }

    markOperationStart({ operation, qsos, dispatch })

    return t?.('extensions.commands-operation.startConfirm', 'Operation started!') || 'Operation started!'
  }
}

const BreakOperationCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-operation-break',
  match: /^(BREAK)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation, settings, t }) => {
    if (!operation) { return false }
    if (!settings?.devMode) { return false }

    return t?.('extensions.commands-operation.break', 'Add a break?') || 'Add a break?'
  },
  invokeCommand: (match, { operation, qsos, dispatch, settings, t }) => {
    if (!operation) { return }
    if (!settings?.devMode) { return false }

    markOperationBreak({ operation, qsos, dispatch })

    return t?.('extensions.commands-operation.breakConfirm', 'Added an operation break!') || 'Added an operation break!'
  }
}

const StopOperationCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-operation-stop',
  match: /^(STOP|END)$/i,
  allowSpaces: true,
  describeCommand: (match, { operation, settings, t }) => {
    if (!operation) { return false }
    if (!settings?.devMode) { return false }

    return t?.('extensions.commands-operation.stop', 'Stop the operation?') || 'Stop the operation?'
  },
  invokeCommand: (match, { operation, qsos, dispatch, settings }) => {
    if (!operation) { return }
    if (!settings?.devMode) { return false }

    markOperationStop({ operation, qsos, dispatch })

    return t?.('extensions.commands-operation.stopConfirm', 'Operation stopped!') || 'Operation stopped!'
  }
}
