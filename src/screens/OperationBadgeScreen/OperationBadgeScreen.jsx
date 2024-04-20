/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { StatusBar, View } from 'react-native'
import { IconButton, Text } from 'react-native-paper'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import { loadOperation, selectOperation } from '../../store/operations'
import { loadQSOs, selectQSOs } from '../../store/qsos'
import { selectSettings } from '../../store/settings'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { fmtDateTimeNice, fmtTimeBetween } from '../../tools/timeFormats'
import Color from 'color'
import MapWithQSOs from '../OperationScreens/OpMapTab/components/MapWithQSOs'

function prepareStyles (baseTheme, themeColor) {
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
      backgroundColor: baseTheme.isIOS ? Color(baseTheme.colors.primary).alpha(0.3).string() : Color(baseTheme.colors.primary).lighten(1.3).alpha(0.5).string(),
      position: 'absolute',
      padding: baseTheme.oneSpace * 1,
      top: 0,
      left: 0,
      right: 0
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
      color: '#222',
      fontFamily: baseTheme.normalFontFamily,
      lineHeight: 18 * baseTheme.fontScaleAdjustment
    },
    logger: {
      fontSize: 18 * baseTheme.fontScaleAdjustment,
      color: '#222',
      fontFamily: baseTheme.boldTitleFontFamily,
      lineHeight: 18 * baseTheme.fontScaleAdjustment
    }
  }
}

export default function OperationBadgeScreen ({ navigation, route }) {
  const themeColor = 'tertiary'
  const styles = useThemedStyles(prepareStyles, themeColor)

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)

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
    return `${fmtDateTimeNice(operation.startOnMillisMin)}`
  }, [operation])

  const opStats = useMemo(() => {
    return `${qsos.length} ${qsos.length === 1 ? 'QSO' : 'QSOs'} in ${fmtTimeBetween(operation.startOnMillisMin, operation.startOnMillisMax)}`
  }, [qsos, operation])

  return (
    <>
      <StatusBar hidden />
      <MapWithQSOs
        styles={styles}
        operation={operation}
        qth={qth}
        qsos={qsos}
        settings={settings}
      />
      <View style={[styles.titleContainer, { flexDirection: styles.portrait ? 'column' : 'row', justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Text style={styles.title}>
            {operation?.stationCall || settings?.operatorCall} {operation?.title}
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
      <View style={{ flexDirection: 'row', justifyContent: 'center', position: 'absolute', bottom: styles.oneSpace, right: styles.oneSpace * 10, left: styles.oneSpace * 10 }}>
        <Text style={styles.ham2k}>Ham2K </Text>
        <Text style={styles.logger}>Portable Logger</Text>
      </View>
      <View style={{ position: 'absolute', bottom: styles.oneSpace * 5, right: styles.oneSpace * 2 }}>
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
