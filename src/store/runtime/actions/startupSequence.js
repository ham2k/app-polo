import packageJson from '../../../../package.json'

import { loadAllDataFiles } from '../../dataFiles/actions/dataFileFS'
import { getOperations } from '../../operations'
import { addRuntimeMessage, resetRuntimeMessages } from '../runtimeSlice'
import { setupOnlineStatusMonitoring } from './onlineStatus'

const MESSAGES = [
  'Reticulating splines',
  'Tuning the antenna',
  'Checking the tubes',
  'Warming up the tubes',
  'Unfolding the map',
  'Charging the flux capacitor'
]

export const startupSequence = (onReady) => (dispatch) => {
  setTimeout(async () => {
    dispatch(resetRuntimeMessages())
    dispatch(addRuntimeMessage(`**Version ${packageJson.version}**`))

    const steps = [
      async () => new Promise(resolve => setTimeout(() => { resolve() }, 500)),
      async () => await dispatch(addRuntimeMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])),
      async () => await dispatch(setupOnlineStatusMonitoring()),
      async () => await dispatch(loadAllDataFiles()),
      async () => await dispatch(getOperations()),
      async () => await dispatch(addRuntimeMessage('QRV!')),
      async () => new Promise(resolve => setTimeout(() => { onReady && onReady(); resolve() }, 500))
    ]

    for (const step of steps) {
      await step()
    }
  }, 0)
}
