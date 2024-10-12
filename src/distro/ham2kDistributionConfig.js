/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import React, { useEffect, useState } from 'react'
import CodePush from 'react-native-code-push'
import { firebase as firebaseAnalytics } from '@react-native-firebase/analytics'
import { firebase as firebaseCrashlytics } from '@react-native-firebase/crashlytics'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'

import packageJson from '../../package.json'
import GLOBAL from '../GLOBAL'
import { UPDATE_TRACK_KEYS, UPDATE_TRACK_LABELS } from '../screens/SettingsScreens/screens/VersionSettingsScreen'
import { hashCode } from '../tools/hashCode'
import { addNotice, dismissNotice } from '../store/system'
import { addRuntimeMessage } from '../store/runtime'

if (process.env.NODE_ENV !== 'development') {
  GLOBAL.codePushOptions = {
    installMode: CodePush.InstallMode.ON_NEXT_RESUME
  }
}

export function reportError (...params) {
  if (GLOBAL?.consentAppData) {
    let message, error
    if (typeof params[0] === 'string') {
      message = params[0]
      if (params[1]?.stack) error = params[1]
    } else if (params[0] && params[0].stack) {
      error = params[0]
    }

    if (message) {
      console.log('Reporting Error', message)
      firebaseCrashlytics?.crashlytics()?.log(message)
    }
    if (error) {
      console.log('-- ', error.message)
      firebaseCrashlytics?.crashlytics()?.recordError(error)
    }
  }
}

export function reportData (payload) {
  // console.log('DATA', payload)
  payload.version = packageJson.version

  setTimeout(async () => {
    try {
      await fetch('https://yuc4guhvf9.execute-api.us-east-1.amazonaws.com/Prod/polo/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
        },
        body: JSON.stringify(payload)
      })
      // console.log('Data reported')
    } catch (error) {
      console.log('Error reporting data:', error)
    }
  }, 0)
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

export function trackNavigation ({ currentRouteName, previousRouteName }) {
  if (GLOBAL.consentAppData) {
    firebaseAnalytics?.analytics()?.logScreenView({
      screen_name: currentRouteName,
      screen_class: currentRouteName
    })
  }
}

export function trackEvent (event, data) {
  if (GLOBAL.consentAppData) {
    // console.log('EVENT', event, data)
    firebaseAnalytics?.analytics()?.logEvent(`polo_${event}`, data)
  }
}

export function AppWrappedForDistribution ({ children }) {
  return (
    <>
      {children}
    </>
  )
}

export function useConfigForDistribution ({ settings }) {
  // Keep track of consent
  useEffect(() => {
    GLOBAL.consentAppData = settings?.consentAppData
  }, [settings?.consentAppData])

  // Enable/disable Firebase Analytics & Crashlytics
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  useEffect(() => {
    setImmediate(async () => {
      if (settings?.consentAppData && !analyticsEnabled) {
        await firebaseCrashlytics?.crashlytics()?.setCrashlyticsCollectionEnabled(true)

        await firebaseAnalytics?.analytics()?.setAnalyticsCollectionEnabled(true)
        await firebaseAnalytics?.analytics()?.setConsent({
          analytics_storage: true,
          ad_storage: false,
          ad_user_data: false,
          ad_personalization: false
        })
        setAnalyticsEnabled(true)
      } else if (!settings?.consentAppData && analyticsEnabled) {
        await firebaseCrashlytics?.crashlytics()?.setCrashlyticsCollectionEnabled(false)

        await firebaseAnalytics?.analytics()?.setAnalyticsCollectionEnabled(false)
        await firebaseAnalytics?.analytics()?.setConsent({
          analytics_storage: false,
          ad_storage: false,
          ad_user_data: false,
          ad_personalization: false
        })

        setAnalyticsEnabled(false)
      }
    })
  }, [analyticsEnabled, settings?.consentAppData])

  // Set Firebase Analytics & Crashlytics user properties
  useEffect(() => {
    if (settings?.consentAppData) {
      firebaseCrashlytics?.crashlytics()?.setUserId(settings?.operatorCall)
      firebaseCrashlytics?.crashlytics()?.setAttributes({
        packageVersion: packageJson.version
      })

      let info = parseCallsign(settings?.operatorCall)
      if (info.baseCall) {
        info = annotateFromCountryFile(info)
      }
      firebaseAnalytics?.analytics()?.setUserId(info.baseCall)
      firebaseAnalytics?.analytics()?.setUserProperties({
        entity_prefix: info.entityPrefix,
        entity_name: info.entityName,
        base_call: info.baseCall,
        call: settings?.operatorCall
      })
    }
  }, [settings?.operatorCall, settings?.consentAppData])
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
