/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui'

import { Ham2kListSection } from '../../screens/components/Ham2kListSection'
import { Ham2kListSubheader } from '../../screens/components/Ham2kListSubheader'
import { selectFeatureFlag, setSystemFlag } from '../../store/system'
import { TouchableRipple } from 'react-native-paper'
import Purchases from 'react-native-purchases'
import { selectLocalExtensionData } from '../../store/local'

const CONTRIBUTE_NOW = require('./badges/contribute-now.png')
const CONTRIBUTE_MORE = require('./badges/contribute-more.png')

const BADGE_2024 = require('./badges/2024-supporter.png')
const BADGE_2025 = require('./badges/2025-supporter.png')

const BADGES = {
  supporter_2024: BADGE_2024,
  supporter_2025: BADGE_2025
}

export function MainSettingsForDistribution ({ settings, styles }) {
  const dispatch = useDispatch()

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  const badgeFlags = useSelector(state => selectFeatureFlag(state, 'badges'))

  const [entitlementFlags, setEntitlementFlags] = useState({})

  useEffect(() => {
    setImmediate(async () => {
      const customerInfo = await Purchases.getCustomerInfo()

      // Access entitlements
      const entitlements = customerInfo.entitlements
      const newFlags = {}
      Object.keys(entitlements.active).forEach(key => {
        newFlags[key] = true
      })
      setEntitlementFlags(newFlags)
    })
  }, [])

  const badges = useMemo(() => {
    return Object.keys(BADGES).filter(badge => entitlementFlags?.[badge] || badgeFlags?.[badge])
  }, [entitlementFlags, badgeFlags])

  const presentPaywall = useCallback(async () => {
    Purchases.setAttributes({
      callsign: settings?.operatorCall,
      $displayName: settings?.operatorCall,
      $email: `${settings?.operatorCall?.toLowerCase()}@call.ham`,
      ham2k_lofi_account: lofiData?.account?.uuid,
      ham2k_lofi_callsign: lofiData?.account?.call,
      ham2k_lofi_email: lofiData?.account?.email,
      ham2k_lofi_device: lofiData?.client?.uuid
    })

    const paywallResult = await RevenueCatUI.presentPaywall()

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
        console.log('Paywall not presented', paywallResult)
        return false
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        dispatch(setSystemFlag('lastPaywallOn', Date.now()))
        dispatch(setSystemFlag('lastPurchasedOn', Date.now()))
        break // continue below
      default:
        console.log('Paywall default', paywallResult)
        dispatch(setSystemFlag('lastPaywallOn', Date.now()))
        return false
    }

    const customerInfo = await Purchases.getCustomerInfo()
    const entitlements = customerInfo.entitlements
    const newFlags = {}
    Object.keys(entitlements.active).forEach(key => {
      newFlags[key] = true
    })
    setEntitlementFlags(newFlags)

    return true
  }, [dispatch, lofiData?.account?.call, lofiData?.account?.email, lofiData?.account?.uuid, lofiData?.client?.uuid, settings?.operatorCall])

  return (
    <Ham2kListSection>
      <Ham2kListSubheader>
        {settings.operatorCall}
        {badges.length === 0 ? ' could be ' : ' is '}
        a Supporter of Ham2K
      </Ham2kListSubheader>
      <View style={{ marginHorizontal: styles.oneSpace * 2, flexDirection: 'row' }}>
        {badges.map(badge => (
          <Image
            source={BADGES[badge]}
            key={badge}
            style={{
              resizeMode: 'cover',
              height: styles.oneSpace * 15,
              width: styles.oneSpace * 15,
              margin: 0
            }}
          />
        ))}
        <TouchableRipple onPress={presentPaywall}>
          <Image source={badges.length === 0 ? CONTRIBUTE_NOW : CONTRIBUTE_MORE}
            style={{
              resizeMode: 'cover',
              height: styles.oneSpace * 15,
              width: styles.oneSpace * 15,
              margin: 0
            }}
          />
        </TouchableRipple>
      </View>
    </Ham2kListSection>
  )
}
