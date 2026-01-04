/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo } from 'react'
import DeviceInfo from 'react-native-device-info'

import { hashCode } from '../tools/hashCode'
import packageJson from '../../package.json'
import { addRuntimeMessage } from '../store/runtime'
import { H2kListSection, H2kListItem } from '../ui'

import GLOBAL from '../GLOBAL'

export function reportError (error, ...extra) {
  console.error(error, ...extra)
  if (extra && extra[0]?.stack) console.error(extra[0].stack)
}

const WATCHED_CALLS = []
let logSequence = 0
export function logRemotely (payload) {
  try {
    if (GLOBAL.consentAppData) {
      if (WATCHED_CALLS.indexOf(GLOBAL.operatorCall) >= 0) {
        reportData({
          call: GLOBAL.operatorCall,
          time: new Date().toISOString(),
          sequence: logSequence++,
          log: payload
        })
      }
    }
  } catch (error) {
    console.error('Error logging remotely')
  }
}

export function reportData (payload) {
  payload.version = packageJson.version
  // console.info('DATA', payload)
}

export function trackSettings ({ settings, action, actionData }) {
  if (settings.consentAppData) {
    reportData({ call: settings.operatorCall, settings: { ...settings, accounts: undefined }, action, actionData })
  } else {
    reportData({
      call: `ANON-${hashCode(settings.operatorCall)}`,
      settings: { consentAppData: settings.consentAppData, consentOpData: settings.consentOpData }
    })
  }
}

export function trackOperation ({ operation, settings, action, actionData }) {
  if (settings.consentAppData) {
    reportData({ call: settings.operatorCall, operation: { ...operation, consentOpData: settings.consentOpData }, action, actionData })
  }
}

export function trackNavigation () {
  // Do nothing
}

export function trackEvent () {
  // Do nothing
}

export function AppWrappedForDistribution ({ children }) {
  return (
    <>
      {children}
    </>
  )
}

export function useConfigForDistribution ({ settings }) {
  // Do nothing
}

export function startupStepsForDistribution ({ settings, dispatch }) {
  return [
    async () => {
      await dispatch(addRuntimeMessage(GLOBAL.t('screens.start.Development Build', 'Portable Logger Development Build')))
    }
  ]
}

export function reduxEnhancersForDistribution () {
  return []
}

export function onNavigationReadyForDistribution (navigationRef) {
  // Do nothing
}

export function handleNoticeActionForDistribution ({ notice, action, dispatch, navigate, setDialog }) {
  return true
}

export function processNoticeTemplateDataForDistribution (data) {
  // Do nothing
}

export function enableStartupInterruptionDialogForDistribution ({ settings }) {
  return false
}

export function StartupInterruptionDialogForDistribution ({ settings, styles, setStartupPhase }) {
  useEffect(() => setStartupPhase('start'), [setStartupPhase])
  return (
    <></>
  )
}

export function MainSettingsForDistribution ({ settings, styles }) {
  return (
    <></>
  )
}

export function DevModeSettingsForDistribution ({ settings, styles, dispatch, operations }) {
  return (
    <></>
  )
}

export function VersionSettingsForDistribution ({ settings, styles }) {
  const currentVersionLabel = useMemo(() => {
    let version
    if (packageJson.versionName) {
      version = `${packageJson.versionName} Release`
    } else {
      version = `Version ${packageJson.version}`
    }
    return version
  }, [])

  return (
    <H2kListSection>
      <H2kListItem title={currentVersionLabel}
        description={`${packageJson.version} - Build ${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`}
        leftIcon={'information-outline'}
      />
    </H2kListSection>
  )
}

export function syncMetaForDistribution ({ settings }) {
  return {
    app: 'ham2k-polo',
    language: GLOBAL.language,
    locale: GLOBAL.locale
  }
}

export function SyncSettingsForDistribution ({ settings, styles }) {
  return (
    <></>
  )
}
