/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * and Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { ScrollView, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import ScreenContainer from '../../components/ScreenContainer'
import { H2kListSection } from '../../../ui'

export default function LiveQSON1MMSettingsScreen ({ splitView }) {
  const { t } = useTranslation()
  const safeAreaInsets = useSafeAreaInsets()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <Text variant="bodyMedium" style={{ margin: 16 }}>
            {t('screens.liveQSON1MMSettings.placeholder', 'N1MM style broadcast is planned, but this build only wires the HTTP endpoint transport.')}
          </Text>
        </H2kListSection>
        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>
    </ScreenContainer>
  )
}
