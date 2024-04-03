import { reportError } from '../../App'
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
        match = value.match(hook.match)
        return !!match
      } else {
        return false
      }
    } catch (e) {
      reportError(`Error in checkAndProcessCommands matching for '${hook.key}'`, e)

      return false
    }
  })

  if (matchingCommand && matchingCommand.invokeCommand) {
    const { handleFieldChange, qso, setQSO } = extraParams
    let callWasCleared = false
    // We need special wrappers for `handleFieldChange` and `setQSO` in order to also reset the call if a command was processed
    // If `qso` changed, then our subsequent call to `setQSO` to change it will not reflect any updates
    // because the `qso` we have access here is the one from the time of the initial call to `checkAndProcessCommands`
    // not the one with updates from the command processing.
    const handleFieldChangeWrapper = (event) => {
      handleFieldChange({ ...event, alsoClearTheirCall: true })
      callWasCleared = true
    }
    const setQSOWrapper = (args) => {
      setQSOWrapper({ ...qso, their: { ...qso.their, call: args.their.call || '' } })
      callWasCleared = true
    }

    try {
      const result = matchingCommand.invokeCommand && matchingCommand.invokeCommand(match, { ...extraParams, handleFieldChange: handleFieldChangeWrapper, setQSO: setQSOWrapper })
      if (!callWasCleared) {
        setQSO({ ...qso, their: { ...qso.their, call: '' } })
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
