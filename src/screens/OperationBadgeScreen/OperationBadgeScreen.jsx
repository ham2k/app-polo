/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { StatusBar, View, useColorScheme } from 'react-native'
import { IconButton, Text } from 'react-native-paper'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import { loadOperation, selectOperation } from '../../store/operations'
import { loadQSOs, selectQSOs } from '../../store/qsos'
import { selectSettings } from '../../store/settings'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { fmtDateTimeNice, fmtTimeBetween } from '../../tools/timeFormats'
import Color from 'color'
import MapWithQSOs from '../OperationScreens/OpMapTab/components/MapWithQSOs'
import { slashZeros } from '../../tools/stringTools'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function prepareStyles (baseTheme, themeColor, deviceColorScheme) {
  let titleBackground
  if (baseTheme.isIOS) {
    if (deviceColorScheme === 'dark') {
      titleBackground = Color(baseTheme.colors.primary).lighten(4).alpha(0.6).string()
    } else {
      titleBackground = Color(baseTheme.colors.primary).lighten(4).alpha(0.4).string()
    }
  } else {
    titleBackground = Color(baseTheme.colors.primary).lighten(4).alpha(0.5).string()
  }

  return {
    ...baseTheme,
    root: {
      flexDirection: 'column',
      flex: 1
    },
    panel: {
      backgroundColor: baseTheme.theme.colors[`${themeColor}Container`],
      borderBottomColor: baseTheme.theme.colors[`${themeColor}Light`],
      borderTopColor: baseTheme.theme.colors[`${themeColor}Light`],
      borderBottomWidth: 1,
      padding: baseTheme.oneSpace
    },
    titleContainer: {
      backgroundColor: titleBackground,
      position: 'absolute',
      padding: baseTheme.oneSpace * 1,
      width: '100%',
      top: 0,
      left: 0,
      right: 100
    },
    title: {
      fontSize: 18 * baseTheme.fontScaleAdjustment,
      color: '#222',
      fontFamily: baseTheme.boldTitleFontFamily
    },
    secondaryTitle: {
      fontSize: 18 * baseTheme.fontScaleAdjustment,
      color: '#222',
      fontFamily: baseTheme.boldTitleFontFamily
    },
    subTitle: {
      fontSize: 16 * baseTheme.fontScaleAdjustment,
      color: '#222',
      fontFamily: baseTheme.normalFontFamily
    },
    ham2k: {
      fontSize: 18 * baseTheme.fontScaleAdjustment,
      color: baseTheme.isIOS && deviceColorScheme === 'dark' ? '#CCC' : '#222',
      fontFamily: baseTheme.normalFontFamily,
      lineHeight: 18 * baseTheme.fontScaleAdjustment
    },
    logger: {
      fontSize: 18 * baseTheme.fontScaleAdjustment,
      color: baseTheme.isIOS && deviceColorScheme === 'dark' ? '#CCC' : '#222',
      fontFamily: baseTheme.boldTitleFontFamily,
      lineHeight: 18 * baseTheme.fontScaleAdjustment
    }
  }
}

export default function OperationBadgeScreen ({ navigation, route }) {
  // Maps change with the actual device color scheme, not the user preferences in the app
  const deviceColorScheme = useColorScheme()

  const themeColor = 'tertiary'
  const styles = useThemedStyles(prepareStyles, themeColor, deviceColorScheme)

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)

  const safeArea = useSafeAreaInsets()

  useEffect(() => { // When starting, make sure all operation data is loaded
    dispatch(loadQSOs(route.params.operation.uuid))
    dispatch(loadOperation(route.params.operation.uuid))
  }, [route.params.operation.uuid, dispatch])
  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))

  const qth = useMemo(() => {
    try {
      if (!operation?.grid) return {}
      const [latitude, longitude] = gridToLocation(operation.grid)
      return { latitude, longitude }
    } catch (e) {
      return {}
    }
  }, [operation?.grid])

  const opDate = useMemo(() => {
    return `${fmtDateTimeNice(operation.startAtMillisMin)}`
  }, [operation])

  const opStats = useMemo(() => {
    return `${qsos.length} ${qsos.length === 1 ? 'QSO' : 'QSOs'} in ${fmtTimeBetween(operation.startAtMillisMin, operation.startAtMillisMax)}`
  }, [qsos, operation])

  const [projection, setProjection] = useState('mercator')

  return (
    <>
      <StatusBar hidden />
      <MapWithQSOs
        styles={styles}
        operation={operation}
        qth={qth}
        qsos={qsos}
        settings={settings}
        projection={projection}
      />
      <View style={[styles.titleContainer,
        { width: '100%', maxWidth: '100%', paddingTop: safeArea.top + styles.oneSpace, paddingHorizontal: Math.max(safeArea.left, safeArea.right) + (styles.oneSpace * 2), flexDirection: styles.portrait ? 'column' : 'row', justifyContent: 'space-between' }
      ]}
      >
        <View style={{ flexDirection: 'column', alignItems: 'flex-start', maxWidth: '75%' }}>
          <Text style={styles.title}>
            {slashZeros(operation?.stationCall || settings?.operatorCall)}
            {operation?.stationCallPlusArray && operation.stationCallPlusArray.length > 0 ? ` + ${slashZeros(operation.stationCallPlusArray.join(', '))}` : ''}
            {' '}{operation?.title}
          </Text>
          <Text style={styles.subTitle}>{operation?.subtitle}</Text>
        </View>
        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <Text style={[styles.secondaryTitle, { textAlign: 'right' }]}>
            {opStats}
          </Text>
          <Text style={[styles.subTitle, { textAlign: 'right' }]}>
            {opDate}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', position: 'absolute', bottom: Math.max(safeArea.bottom, styles.oneSpace), right: styles.oneSpace * 10, left: styles.oneSpace * 10 }}>
        <Text style={styles.ham2k}>Ham2K </Text>
        <Text style={styles.logger}>Portable Logger</Text>
      </View>
      <View style={{ position: 'absolute', bottom: safeArea.bottom + styles.oneSpace, right: safeArea.right + styles.oneSpace }}>
        {projection === 'mercator' ? (
          <IconButton
            icon="earth"
            size={styles.oneSpace * 4}
            mode={'contained'}
            style={{ opacity: 0.7 }}
            onPress={() => setProjection('globe')}
          />
        ) : (
          <IconButton
            icon="earth-box"
            size={styles.oneSpace * 4}
            mode={'contained'}
            style={{ opacity: 0.7 }}
            onPress={() => setProjection('mercator')}
          />
        ) }
        <IconButton
          icon="fullscreen-exit"
          size={styles.oneSpace * 4}
          mode={'contained'}
          style={{ opacity: 0.7 }}
          onPress={() => navigation.goBack()}
        />
      </View>
    </>
  )
}
