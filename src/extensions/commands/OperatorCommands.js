/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { setOperationData } from '../../store/operations'

const Info = {
  key: 'commands-operator',
  name: 'Commands that assist in changing operators'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: OperatorCommandHook })
  }
}

export default Extension

const OperatorCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-operator-change',
  match: /^(OP\.|OP\/|OPER\.|OPER\/)([\w\d]+)$/i,
  describeCommand: (match) => {
    if (match[2].length < 3) return ''
    return `Change operator to ${match[2]}?`
  },
  invokeCommand: (match, { dispatch, operation, handleFieldChange }) => {
    if (match[2].length < 3) return ''
    const operatorCall = match[2].toUpperCase()
    if (operatorCall) {
      dispatch(setOperationData({ uuid: operation.uuid, operatorCall }))
      return `Operator set to ${operatorCall}`
    }
  }
}
