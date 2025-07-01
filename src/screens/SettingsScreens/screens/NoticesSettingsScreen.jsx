/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useNotices } from '../../../store/system'
import { NoticeList } from '../../HomeScreen/components/Notices'
import { Text } from 'react-native-paper'
import { fmtDateDayMonth } from '@ham2k/lib-format-tools'
import { Ham2kListSection } from '../../components/Ham2kListSection'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    listRow: {
      marginLeft: baseStyles.oneSpace * 2,
      marginRight: baseStyles.oneSpace * 2,
      marginBottom: baseStyles.oneSpace
    }
  }
}

const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

export default function NoticesSettingsScreen ({ navigation, splitView }) {
  const styles = useThemedStyles(prepareStyles)
  const safeAreaInsets = useSafeAreaInsets()

  const notices = useNotices({ includeDismissed: true, includeTransient: false })

  const noticesGroupedByDismissedOn = useMemo(() => {
    const groupedNotices = notices.reduce((acc, notice) => {
      const dismissedOn = notice.dismissedOn ? notice.dismissedOn - (notice.dismissedOn % TWENTY_FOUR_HOURS_IN_MILLIS) : 0
      acc[dismissedOn] = acc[dismissedOn] || []
      acc[dismissedOn].push(notice)
      return acc
    }, {})

    const sortedKeys = Object.keys(groupedNotices).sort((a, b) => b - a)

    return sortedKeys.map(key => {
      key = Number(key) // numeric keys get converted to strings in objects
      const label = key ? fmtDateDayMonth(key) : 'Undated'
      const groupNotices = groupedNotices[key]
      return [label, groupNotices]
    })
  }, [notices])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        {noticesGroupedByDismissedOn.length > 0 ? (
          noticesGroupedByDismissedOn.map(([label, groupNotices]) => (
            <Ham2kListSection
              key={label}
              title={label}
            >
              <NoticeList notices={groupNotices} />
            </Ham2kListSection>
          ))
        ) : (
          <Text style={{ margin: styles.oneSpace * 2, textAlign: 'center' }}>No recent notices</Text>
        )}

        <View style={{ height: safeAreaInsets.bottom }} />

      </ScrollView>
    </ScreenContainer>
  )
}
