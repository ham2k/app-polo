/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { useSelector } from 'react-redux'
import { Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import ScreenContainer from '../../components/ScreenContainer'
import { selectSettings } from '../../../store/settings'
import {
  liveQSON1MMNetworkPolicyOption,
  liveQSOUDPMessageFormatOption,
  selectLiveQSOHTTPSettings,
  selectLiveQSON1MMSettings,
  selectLiveQSOUDPSettings,
  summarizeLiveQSOURL
} from '../../../store/liveQSO'
import { H2kListItem, H2kListSection } from '../../../ui'

export default function LiveQSOSettingsScreen ({ navigation, splitView }) {
  const { t } = useTranslation()

  const safeAreaInsets = useSafeAreaInsets()
  const settings = useSelector(selectSettings)

  const httpSettings = selectLiveQSOHTTPSettings(settings)
  const udpSettings = selectLiveQSOUDPSettings(settings)
  const n1mmSettings = selectLiveQSON1MMSettings(settings)
  const udpFormatOption = liveQSOUDPMessageFormatOption(udpSettings.messageFormat)
  const n1mmNetworkPolicyOption = liveQSON1MMNetworkPolicyOption(n1mmSettings.networkPolicy)
  const noURLConfigured = t('screens.liveQSOSettings.noURLConfigured')
  const udpFormatTitle = t(`screens.liveQSOUDPSettings.messageFormat.options.${udpFormatOption.value}.title`)
  const udpFormatDescription = t(`screens.liveQSOUDPSettings.messageFormat.options.${udpFormatOption.value}.description`)
  const n1mmPolicyTitle = t(`screens.liveQSON1MMSettings.networkPolicy.options.${n1mmNetworkPolicyOption.value}.title`)
  const httpDescription = httpSettings.enabled
    ? t('screens.liveQSOSettings.httpEnabledDescription', { url: summarizeLiveQSOURL(httpSettings.url, { maxLength: 34, empty: noURLConfigured }) })
    : t('screens.liveQSOSettings.httpDisabledDescription', { url: summarizeLiveQSOURL(httpSettings.url, { maxLength: 34, empty: noURLConfigured }) })
  const udpDescription = settings?.liveQSO?.udp?.messageFormat
    ? t('screens.liveQSOSettings.udpSelectedDescription', { format: udpFormatTitle, programs: udpFormatDescription })
    : t('screens.liveQSOSettings.udpDefaultDescription')
  const n1mmDescription = n1mmSettings.enabled
    ? t('screens.liveQSOSettings.n1mmEnabledDescription', { policy: n1mmPolicyTitle })
    : t('screens.liveQSOSettings.n1mmDisabledDescription')

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.liveQSOSettings.httpEndpoint.title')}
            description={httpDescription}
            leftIcon="protocol"
            onPress={() => navigation.navigate('LiveQSOHTTPSettings')}
          />
          {Platform.OS === 'android' && (
            <H2kListItem
              title={t('screens.liveQSOSettings.udpAdif.title')}
              description={udpDescription}
              leftIcon="lan"
              onPress={() => navigation.navigate('LiveQSOSocketSettings')}
            />
          )}
          {Platform.OS === 'android' && (
            <H2kListItem
              title={t('screens.liveQSOSettings.n1mmBroadcast.title')}
              description={n1mmDescription}
              leftIcon="broadcast"
              onPress={() => navigation.navigate('LiveQSON1MMSettings')}
            />
          )}
        </H2kListSection>

        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>
    </ScreenContainer>
  )
}
