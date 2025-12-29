/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

const SpotHeader = React.memo(function SpotHeader ({ section, styles }) {
  const { t } = useTranslation()

  const headerA11yLabel = useMemo(() => {
    return t(`general.bands.names.${section?.label?.replace('.', '-')}-a11y`, section?.label) || ''
  }, [section.label, t])

  return (
    <View style={styles.headerRow}>
      <Text style={[styles.fields.header, styles.text.bold]} accessibilityRole="header" accessibilityLabel={headerA11yLabel}>
        {section.label}
      </Text>
    </View>
  )
})
export default SpotHeader
