/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import CodePush from 'react-native-code-push'
import packageJson from '../../../../package.json'
import loadExtensions from '../../../extensions/loadExtensions'

import { getOperations } from '../../operations'
import { selectSettings } from '../../settings'
import { addRuntimeMessage, resetRuntimeMessages } from '../runtimeSlice'
import { setupOnlineStatusMonitoring } from './onlineStatus'
import { UPDATE_TRACK_KEYS, UPDATE_TRACK_LABELS } from '../../../screens/SettingsScreens/screens/VersionSettingsScreen'
import { addNotice, dismissNotice } from '../../system/systemSlice'

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

export const startupSequence = (onReady) => (dispatch, getState) => {
  const settings = selectSettings(getState()) || {}

  setTimeout(async () => {
    dispatch(resetRuntimeMessages())
    dispatch(addRuntimeMessage(`**Version ${packageJson.version}**`))

    const minimumTimePromise = new Promise(resolve => {
      setTimeout(() => { resolve() }, 1000)
    })

    const steps = [
      async () => await dispatch(addRuntimeMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])),
      async () => {
        if (settings.updateTrack && settings.updateTrack !== 'Development') {
          await dispatch(addRuntimeMessage(`Checking for ${UPDATE_TRACK_LABELS[settings.updateTrack]} updates...`))
        } else {
          await dispatch(addRuntimeMessage('Checking for updates...'))
        }

        setTimeout(async () => {
          await CodePush.sync({
            deploymentKey: UPDATE_TRACK_KEYS[settings?.updateTrack ?? 'Development']
          })
          setTimeout(() => {
            CodePush.getUpdateMetadata(CodePush.UpdateState.PENDING).then((metadata) => {
              if (metadata) {
                if (metadata.description) {
                  dispatch(addNotice({ key: 'update', text: `Version ${metadata?.description.replace('Release ', '')} is available.`, actionLabel: 'Update Now', action: 'update' }))
                } else {
                  dispatch(addNotice({ key: 'update', text: 'A new version of PoLo is available.', actionLabel: 'Update Now', action: 'update' }))
                }
              } else {
                dispatch(dismissNotice({ key: 'update' }))
              }
            })
          }, 100)
        }, 0)
      },
      async () => await dispatch(setupOnlineStatusMonitoring()),
      async () => await dispatch(loadExtensions()),
      async () => await dispatch(getOperations()),
      async () => await minimumTimePromise
    ]

    for (const step of steps) {
      await step()
    }

    onReady && onReady()
  }, 0)
}
