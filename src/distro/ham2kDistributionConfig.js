/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import React, { useEffect } from 'react'
import { Client } from 'rollbar-react-native'
import { Provider as RollbarProvider, ErrorBoundary } from '@rollbar/react'
import Config from 'react-native-config'
import codePush from 'react-native-code-push'

import { hashCode } from '../tools/hashCode'

import GLOBAL from '../GLOBAL'

import packageJson from '../../package.json'

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
  console.log('DATA', payload)
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
      console.log('Data reported')
    } catch (error) {
      console.error('Error reporting data:', error)
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
}
