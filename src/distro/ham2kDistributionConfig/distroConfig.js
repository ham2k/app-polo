/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import { useEffect, useState } from 'react'

import { firebase as firebaseAnalytics } from '@react-native-firebase/analytics'
import { firebase as firebaseCrashlytics } from '@react-native-firebase/crashlytics'

import GLOBAL from '../../GLOBAL'

import packageJson from '../../../package.json'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'

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
      let info = parseCallsign(settings?.operatorCall)

      if (settings?.operatorCall?.length > 2) {
        firebaseCrashlytics?.crashlytics()?.setUserId(settings?.operatorCall)
      }

      firebaseCrashlytics?.crashlytics()?.setAttributes({
        packageVersion: packageJson.version,
        baseCall: info.baseCall ?? '-',
        call: settings?.operatorCall ?? '-'
      })

      if (info.baseCall) {
        info = annotateFromCountryFile(info)

        firebaseAnalytics?.analytics()?.setUserId(info.baseCall)
        firebaseAnalytics?.analytics()?.setUserProperties({
          entity_prefix: info.entityPrefix,
          entity_name: info.entityName,
          base_call: info.baseCall,
          call: settings?.operatorCall
        })
      }
    }
  }, [settings?.operatorCall, settings?.consentAppData])
}
