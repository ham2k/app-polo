import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { selectOperationInfo } from '../../../store/operations'

export default function OpStatsTab ({ navigation, route }) {
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      panel: {
        backgroundColor: baseStyles.theme.colors.secondaryContainer,
        borderBottomColor: baseStyles.theme.colors.secondaryLight,
        borderBottomWidth: 1
      },
      container: {
        paddingHorizontal: baseStyles.oneSpace,
        paddingTop: baseStyles.oneSpace,
        paddingBottom: baseStyles.oneSpace,
        gap: baseStyles.halfSpace
      }
    }
  })

  const dispatch = useDispatch()
  const operation = useSelector(selectOperationInfo(route.params.operation.uuid))

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column' }, styles.panel]}>

      <View style={[{ flex: 0, flexDirection: 'column' }, styles.container]}>
        <Text>Stats</Text>

      </View>
    </View>
  )
}
