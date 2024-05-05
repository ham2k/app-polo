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
