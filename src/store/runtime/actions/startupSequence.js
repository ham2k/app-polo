import { miniSerializeError } from '@reduxjs/toolkit'
import packageJson from '../../../../package.json'
import loadExtensions from '../../../extensions/loadExtensions'

import { getOperations } from '../../operations'
import { addRuntimeMessage, resetRuntimeMessages } from '../runtimeSlice'
import { setupOnlineStatusMonitoring } from './onlineStatus'

const MESSAGES = [
  'Reticulating splines',
  'Tuning the antenna',
  'Checking the tubes',
  'Warming up the tubes',
  'Unfolding the map',
  'Charging the flux capacitor',
  'Purging the dilithium chamber', // M1SDH
  'Activating the turbo encabulator', // M1SDH
  'Engaging the warp drive' // K4HNT
]

export const startupSequence = (onReady) => (dispatch) => {
  setTimeout(async () => {
    dispatch(resetRuntimeMessages())
    dispatch(addRuntimeMessage(`**Version ${packageJson.version}**`))

    const minimumTimePromise = new Promise(resolve => {
      setTimeout(() => { resolve() }, 1500)
    })

    const steps = [
      async () => await dispatch(addRuntimeMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])),
      async () => await dispatch(loadExtensions()),
      async () => await dispatch(setupOnlineStatusMonitoring()),
      async () => await dispatch(getOperations()),
      async () => await minimumTimePromise
    ]

    for (const step of steps) {
      await step()
    }

    onReady && onReady()
  }, 0)
}
