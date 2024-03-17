import { addEventListener } from '@react-native-community/netinfo'
import { actions } from '../runtimeSlice'

let unsubscribe

export const setupOnlineStatusMonitoring = () => (dispatch) => {
  unsubscribe = addEventListener(state => {
    if (state.isConnected) {
      dispatch(actions.setOnline(state.isInternetReachable === null ? true : state.isInternetReachable))
    } else {
      dispatch(actions.setOnline(false))
    }
  })
}

export const shutdownOnlineStatusMonitoring = () => (dispatch) => {
  if (unsubscribe) {
    unsubscribe()
  }
}
