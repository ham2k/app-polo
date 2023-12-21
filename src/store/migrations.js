export const migrations = {
  1: (state) => {
    // settings.call is now settings.operatorCall, and operation.call is now operation.stationCall
    const newState = {
      ...state,
      settings: {
        operatorCall: state?.settings?.call
      }
    }
    Object.keys(newState?.operations?.info || {}).forEach(uuid => {
      newState.operations.info[uuid].stationCall = newState.operations.info[uuid].call
    })
  },

  0: (state) => {
    return state
  }
}

export const LATEST_VERSION = 1
