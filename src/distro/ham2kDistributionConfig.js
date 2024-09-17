/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import React, { useEffect, useState } from 'react'
import { Client } from 'rollbar-react-native'
import { Provider as RollbarProvider, ErrorBoundary } from '@rollbar/react'
import Config from 'react-native-config'
import codePush from 'react-native-code-push'

import { hashCode } from '../tools/hashCode'

import GLOBAL from '../GLOBAL'

import packageJson from '../../package.json'
import { firebase } from '@react-native-firebase/analytics'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'

if (process.env.NODE_ENV !== 'development') {
  GLOBAL.rollbarNative = new Client({
    accessToken: Config.ROLLBAR_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true
  })

  GLOBAL.codePushOptions = {
    installMode: codePush.InstallMode.ON_NEXT_RESUME
  }
}

export function reportError (error, ...extra) {
  if (GLOBAL?.consentAppData && GLOBAL?.rollbarNative?.rollbar) {
    GLOBAL.rollbarNative.rollbar.error(error, ...extra)
  }
  console.error(error, ...extra)
  if (extra && extra[0]?.stack) console.error(extra[0].stack)
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
    firebase?.analytics()?.logScreenView({
      screen_name: currentRouteName,
      screen_class: currentRouteName
    })
  }
}

export function trackEvent (event, data) {
  if (GLOBAL.consentAppData) {
    // console.log('EVENT', event, data)
    firebase?.analytics()?.logEvent(`polo_${event}`, data)
  }
}

export function AppWrappedForDistribution ({ children }) {
  if (GLOBAL?.rollbarNative?.rollbar) {
    return (
      <RollbarProvider instance={GLOBAL.rollbarNative?.rollbar}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </RollbarProvider>
    )
  } else {
    return (
      <>
        {children}
      </>
    )
  }
}

export function useConfigForDistribution ({ settings }) {
  useEffect(() => {
    if (GLOBAL.rollbarNative?.rollbar) {
      GLOBAL.rollbarNative.rollbar.configure({
        payload: {
          person: { id: settings?.operatorCall },
          packageVersion: packageJson.version
        }
      })
    }
  }, [settings?.operatorCall])

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  useEffect(() => {
    setImmediate(async () => {
      GLOBAL.consentAppData = settings?.consentAppData
      if (settings?.consentAppData && !analyticsEnabled) {
        await firebase?.analytics()?.setAnalyticsCollectionEnabled(true)
        await firebase?.analytics()?.setConsent({
          analytics_storage: true,
          ad_storage: false,
          ad_user_data: false,
          ad_personalization: false
        })
        setAnalyticsEnabled(true)
      } else if (!settings?.consentAppData && analyticsEnabled) {
        await firebase?.analytics()?.setConsent({
          analytics_storage: false,
          ad_storage: false,
          ad_user_data: false,
          ad_personalization: false
        })
        await firebase?.analytics()?.setAnalyticsCollectionEnabled(false)
        setAnalyticsEnabled(false)
      }
    })
  }, [analyticsEnabled, settings?.consentAppData])

  useEffect(() => {
    if (settings?.consentAppData) {
      let info = parseCallsign(settings?.operatorCall)
      if (info.baseCall) {
        info = annotateFromCountryFile(info)
      }
      firebase?.analytics()?.setUserId(info.baseCall)
      firebase?.analytics()?.setUserProperties({
        entity_prefix: info.entityPrefix,
        entity_name: info.entityName,
        base_call: info.baseCall,
        call: settings?.operatorCall
      })
    }
  }, [settings?.operatorCall, settings?.consentAppData])
}
