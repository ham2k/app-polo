import { addEventListener } from '@react-native-community/netinfo'
import { actions } from '../systemSlice'

let unsubscribe

export const setupOnlineStatusMonitoring = () => (dispatch) => {
  unsubscribe = addEventListener(state => {
    console.log('Online Status', state)
    if (state.isConnected) {
      dispatch(actions.setOnline(state.isInternetReachable === null ? true : state.isInternetReachable))
      console.log('Online?', state.isInternetReachable === null ? true : state.isInternetReachable)
    } else {
      console.log('Offline!')
      dispatch(actions.setOnline(false))
    }
  })
}

export const shutdownOnlineStatusMonitoring = () => (dispatch) => {
  if (unsubscribe) {
    unsubscribe()
  }
}
