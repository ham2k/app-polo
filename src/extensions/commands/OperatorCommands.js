// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { setOperationLocalData } from '../../store/operations'

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
  describeCommand: (match, { operation, t }) => {
    if (!operation) return

    if (match[2].length < 3) return ''
    return t?.('extensions.commands-operator.change', 'Change operator to {{operator}}?', { operator: match[2] }) || `Change operator to ${match[2]}?`
  },
  invokeCommand: (match, { dispatch, operation, handleFieldChange, t }) => {
    if (!operation) return

    if (match[2].length < 3) return ''
    const operatorCall = match[2].toUpperCase()
    if (operatorCall) {
      dispatch(setOperationLocalData({ uuid: operation.uuid, operatorCall }))
      return t?.('extensions.commands-operator.changeConfirm', 'Operator set to {{operator}}', { operator: operatorCall }) || `Operator set to ${operatorCall}`
    }
  }
}
