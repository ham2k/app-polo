/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { hashCode } from '../tools/hashCode'
import packageJson from '../../package.json'

export function reportError (error, ...extra) {
  console.error(error, ...extra)
  if (extra && extra[0]?.stack) console.error(extra[0].stack)
}

export function reportData (payload) {
  payload.version = packageJson.version
  console.info('DATA', payload)
}

export function trackSettings ({ settings }) {
  if (settings.consentAppData) {
    reportData({ call: settings.operatorCall, settings: { ...settings, accounts: undefined } })
  } else {
    reportData({
      call: `ANON-${hashCode(settings.operatorCall)}`,
      settings: { consentAppData: settings.consentAppData, consentOpData: settings.consentOpData }
    })
  }
}

export function trackOperation ({ operation, settings }) {
  if (settings.consentAppData) {
    reportData({ call: settings.operatorCall, operation })
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
  // Do nothing
}
