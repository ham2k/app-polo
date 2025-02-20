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

let logSequence = 0

const WATCHED_CALLS = ['KI2D', 'HB9HUP', 'LZ3AW', 'N1BS', 'N4KPT']
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
      if (error?.stack) {
        const stackLines = error.stack.split('\n')
        const fileLines = stackLines.filter(line => line.includes('.js:') || line.includes('.jsx:'))
        if (fileLines.length > 0) {
          console.log(fileLines.slice(0, 10).join('\n'))
        }
      }
      firebaseCrashlytics?.crashlytics()?.recordError(new Error(message), message)
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
