/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import { firebase as firebaseAnalytics } from '@react-native-firebase/analytics'
import { firebase as firebaseCrashlytics } from '@react-native-firebase/crashlytics'

import GLOBAL from '../../GLOBAL'

import { hashCode } from '../../tools/hashCode'
import packageJson from '../../../package.json'

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