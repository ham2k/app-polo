/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { qsoKey } from '@ham2k/lib-qson-tools'
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
  invokeCommand: (match, { dispatch, operation, handleFieldChange }) => {
    const operatorCall = match[2].toUpperCase()
    if (operatorCall) {
      dispatch(setOperationData({ uuid: operation.uuid, operatorCall }))
      handleFieldChange({ fieldId: 'theirCall', value: `OP SET TO ${operatorCall}` })
      setTimeout(() => handleFieldChange({ fieldId: 'theirCall', value: '' }), 1000)
    }
  }
}
