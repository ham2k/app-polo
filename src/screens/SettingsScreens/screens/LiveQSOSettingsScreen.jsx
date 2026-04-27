/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { useSelector } from 'react-redux'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import ScreenContainer from '../../components/ScreenContainer'
import { selectSettings } from '../../../store/settings'
import { liveQSOUDPMessageFormatOption, selectLiveQSOHTTPSettings, selectLiveQSOUDPSettings, summarizeLiveQSOURL } from '../../../store/liveQSO'
import { H2kListItem, H2kListSection } from '../../../ui'

export default function LiveQSOSettingsScreen ({ navigation, splitView }) {
  const { t } = useTranslation()

  const safeAreaInsets = useSafeAreaInsets()
  const settings = useSelector(selectSettings)

  const httpSettings = selectLiveQSOHTTPSettings(settings)
  const udpSettings = selectLiveQSOUDPSettings(settings)
  const udpFormatOption = liveQSOUDPMessageFormatOption(udpSettings.messageFormat)
  const httpDescription = httpSettings.enabled
    ? t('screens.liveQSOSettings.httpEnabledDescription', 'Enabled • {{url}}', { url: summarizeLiveQSOURL(httpSettings.url, { maxLength: 34 }) })
    : t('screens.liveQSOSettings.httpDisabledDescription', 'Disabled • {{url}}', { url: summarizeLiveQSOURL(httpSettings.url, { maxLength: 34 }) })
  const udpDescription = settings?.liveQSO?.udp?.messageFormat
    ? t('screens.liveQSOSettings.udpSelectedDescription', '{{format}} • {{programs}}', { format: udpFormatOption.title, programs: udpFormatOption.description })
    : t('screens.liveQSOSettings.udpDefaultDescription', 'Live logging with Log4OM, DXKeeper, MacLoggerDX, HRD and more')

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.liveQSOSettings.httpEndpoint.title', 'HTTP Endpoint')}
            description={httpDescription}
            leftIcon="protocol"
            onPress={() => navigation.navigate('LiveQSOHTTPSettings')}
          />
          <H2kListItem
            title={t('screens.liveQSOSettings.udpAdif.title', 'UDP ADIF')}
            description={udpDescription}
            leftIcon="lan"
            onPress={() => navigation.navigate('LiveQSOSocketSettings')}
          />
        </H2kListSection>

        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>
    </ScreenContainer>
  )
}
