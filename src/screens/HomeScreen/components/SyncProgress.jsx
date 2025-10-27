/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { View } from 'react-native'
import { Icon } from 'react-native-paper'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSyncCounts } from '../../../store/operations'
import { useSelector } from 'react-redux'
import { selectFiveSecondsTick } from '../../../store/time'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { selectLocalData } from '../../../store/local'
import { selectSettings } from '../../../store/settings'
import KeepAwake from '@sayem314/react-native-keep-awake'

const DEBUG = 0

export default function SyncProgress () {
  const settings = useSelector(selectSettings)
  const styles = useThemedStyles()
  const localData = useSelector(selectLocalData)

  const [syncCounts, setSyncCounts] = useState()

  const fiveSecondTick = useSelector(selectFiveSecondsTick)
  useEffect(() => {
    setImmediate(async () => {
      const counts = await getSyncCounts()
      setSyncCounts(counts)
    })
  }, [fiveSecondTick, localData?.sync?.cutoffDate])

  const percentage = useMemo(() => {
    if (DEBUG) console.log('🏃‍♂️ SyncProgress', localData?.sync)
    if (DEBUG) console.log('-- local counts', { pending: syncCounts?.qsos?.pending, synced: syncCounts?.qsos?.synced })
    if (DEBUG) console.log('-- server counts', { totalQSOs: localData?.sync?.serverTotalQSOs, remainingQSOs: localData?.sync?.serverRemainingQSOs, totalOperations: localData?.sync?.serverTotalOperations, remainingOperations: localData?.sync?.serverRemainingOperations })

    const _total = (localData?.sync?.serverTotalQSOs || 0) + (syncCounts?.qsos?.synced || 0) + (syncCounts?.qsos?.pending || 0)
    const _pending = (localData?.sync?.serverRemainingQSOs || 0) + (syncCounts?.qsos?.pending || 0)
    const _percentage = _total > 0 ? (_total - _pending) / _total : 1

    if (DEBUG) console.log('-- percentage', { pending: _pending, total: _total, percentage: _percentage })
    return Math.max(0, Math.min(_percentage, 1))
  }, [
    syncCounts?.qsos?.pending, syncCounts?.qsos?.synced,
    localData?.sync
  ])

  const [visible, setVisible] = useState(false)

  // Animated values for smooth height and opacity transitions
  const animationProgress = useSharedValue(0)
  const animationHeight = useSharedValue(0)

  useEffect(() => {
    if (percentage < 0.999 > 0 && !visible) {
      setVisible(true)
      animationProgress.value = withTiming(1, { duration: 500 })
    } else if (percentage >= 0.999 && visible) {
      animationProgress.value = withTiming(0, { duration: 500 })
      setTimeout(() => {
        setVisible(false)
      }, 500)
    }
  }, [visible, animationProgress, percentage])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: animationProgress.value * animationHeight.value,
      opacity: animationProgress.value
    }
  })

  const handleLayout = useCallback((event) => {
    const { height: layoutHeight } = event.nativeEvent.layout
    animationHeight.value = layoutHeight
  }, [animationHeight])

  return (
    <Animated.View
      style={[styles.root, animatedStyle]}
    >
      {settings.keepDeviceAwake && <KeepAwake />}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          height: styles.oneSpace * 2,
          marginHorizontal: styles.oneSpace * 2
        }}
        onLayout={handleLayout}
      >
        <Icon source="cloud" size={styles.oneSpace * 2} color="white" />
        <View
          style={{
            marginLeft: styles.oneSpace,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            flex: 1,
            borderWidth: 0,
            borderRadius: styles.oneSpace,
            overflow: 'hidden',
            backgroundColor: 'rgba(128, 128, 128, 0.5)'
          }}
        >
          <View style={{ flex: percentage, height: styles.oneSpace / 2, backgroundColor: 'white' }} />
        </View>
      </View>
    </Animated.View>
  )
}
