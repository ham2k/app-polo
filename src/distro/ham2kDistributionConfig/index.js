/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import React from 'react'
import CodePush from 'react-native-code-push'

import GLOBAL from '../../GLOBAL'
import { UPDATE_TRACK_KEYS, UPDATE_TRACK_LABELS } from './VersionSettingsForDistribution'
import { addNotice, dismissNotice } from '../../store/system'
import { addRuntimeMessage } from '../../store/runtime'

import { UpdateTracksDialog } from './UpdateTracksDialog'

export * from './distroTracking'
export * from './distroConfig'
export * from './DevModeSettingsForDistribution'
export * from './VersionSettingsForDistribution'

if (process.env.NODE_ENV !== 'development') {
  GLOBAL.codePushOptions = {
    installMode: CodePush.InstallMode.ON_NEXT_RESUME
  }
}

export function AppWrappedForDistribution ({ children }) {
  return (
    <>
      {children}
    </>
  )
}

export function startupStepsForDistribution ({ settings, dispatch }) {
  return [
    async () => {
      if (settings.updateTrack && settings.updateTrack !== 'Production') {
        await dispatch(addRuntimeMessage(`Checking for ${UPDATE_TRACK_LABELS[settings.updateTrack]} updates...`))
      } else {
        await dispatch(addRuntimeMessage('Checking for updates...'))
      }

      setTimeout(async () => {
        await CodePush.sync({
          deploymentKey: UPDATE_TRACK_KEYS[settings?.updateTrack ?? 'Production']
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
    }
  ]
}

export function handleNoticeActionForDistribution ({ notice, dispatch, setOverlayText }) {
  if (notice.action === 'update') {
    CodePush.getUpdateMetadata(CodePush.UpdateState.PENDING).then((metadata) => {
      metadata.install(CodePush.InstallMode.IMMEDIATE)
    })
  }
}

export function enableStartupInterruptionDialogForDistribution ({ settings }) {
  return true // settings.updateTrack && settings.updateTrack !== 'Production'
}

export function StartupInterruptionDialogForDistribution ({ settings, styles, setStartupPhase }) {
  return (
    <UpdateTracksDialog
      settings={settings}
      styles={styles}
      visible={true}
      dismissable={false}
      onDialogDone={() => setStartupPhase('start')}
    />
  )
}