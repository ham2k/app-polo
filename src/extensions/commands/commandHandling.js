/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { reportError } from '../../distro'

import { findHooks } from '../registry'

export function checkAndProcessCommands (value, extraParams) {
  const hooks = findHooks('command')
  let match
  const matchingCommand = hooks.find(hook => {
    try {
      if (typeof hook?.match === 'function') {
        match = hook.match(value)
        return !!match
      } else if (typeof hook?.match === 'string') {
        if (value === hook.match) {
          match = value
          return true
        }
      } else if (typeof hook?.match === 'object' && hook.match.test) {
        match = value && value.match(hook.match)
        return !!match
      }
      return false
    } catch (e) {
      reportError(`Error in checkAndProcessCommands matching for '${hook.key}'`, e)

      return false
    }
  })

  if (matchingCommand && matchingCommand.invokeCommand) {
    const { handleFieldChange, updateQSO, handleSubmit } = extraParams
    let callWasCleared = false
    // We need special wrappers for `handleFieldChange` and `updateQSO` in order to also reset the call if a command was processed
    // If `qso` changed, then our subsequent call to `updateQSO` to change it will not reflect any updates
    // because the `qso` we have access here is the one from the time of the initial call to `checkAndProcessCommands`
    // not the one with updates from the command processing.
    const handleFieldChangeWrapper = (event) => {
      handleFieldChange({ ...event, alsoClearTheirCall: true })
      callWasCleared = true
    }
    const updateQSOWrapper = (args) => {
      updateQSO({ their: { call: args.their?.call || '' } })
      callWasCleared = true
    }
    const handleSubmitWrapper = (args) => {
      handleSubmit(handleSubmit)
      callWasCleared = true
    }

    try {
      const result = matchingCommand.invokeCommand && matchingCommand.invokeCommand(
        match,
        {
          ...extraParams,
          handleFieldChange: handleFieldChangeWrapper,
          updateQSO: updateQSOWrapper,
          handleSubmit: handleSubmitWrapper
        }
      )
      if (!callWasCleared) {
        updateQSO({ their: { call: '' } })
      }

      return result ?? true
    } catch (e) {
      reportError(`Error in checkAndProcessCommands invocation for '${matchingCommand.key}'`, e)
      return false
    }
  } else {
    return false
  }
}
