/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { partsForFreqInMHz } from '../../../../../tools/frequencyFormats'
import { findBestHook } from '../../../../../extensions/registry'
import { H2kIcon, H2kPressable } from '../../../../../ui'

const QSOItem = React.memo(function QSOItem ({
  qso, ourInfo, onPress, styles, selected, isOtherOperator, settings, timeFormatFunction, refHandlers
}) {
  const theirInfo = { ...qso?.their?.guess, ...qso?.their }

  const freqParts = useMemo(() => {
    if (qso?.freq) {
      return partsForFreqInMHz(qso.freq)
    } else {
      return [null, qso?.band, null]
    }
  }, [qso])

  const extraInfo = useMemo(() => {
    let info = []
    try {
      (refHandlers || []).forEach(handler => {
        const x = handler.relevantInfoForQSOItem({ qso })
        if (x) info = info.concat(x)
      })
    } catch (e) {
      console.error('Error in QSOItem', e)
    }
    return info.filter(x => x).map(x => x.trim()).join(' ')
  }, [qso, refHandlers])

  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

  const confirmedBySpot = useMemo(() => Object.values(qso?.qsl ?? {}).some(spot => spot?.isGuess === false), [qso.qsl])
  const bustedBySpot = useMemo(() => Object.values(qso?.qsl ?? {}).some(spot => spot?.isGuess === true), [qso.qsl])

  const rowStyle = useMemo(() => {
    return {
      ...styles.row,
      ...(isOtherOperator ? styles.otherOperatorRow : {}),
      ...(selected ? styles.selectedRow : {}),
      ...(qso.deleted ? styles.deletedRow : {})
    }
  }, [isOtherOperator, qso.deleted, selected, styles.deletedRow, styles.otherOperatorRow, styles.row, styles.selectedRow])

  const fieldsStyle = useMemo(() => {
    if (qso.deleted) {
      return styles.deletedFields
    } else if (isOtherOperator) {
      return styles.otherOperatorFields
    } else {
      return styles.fields
    }
  }, [qso.deleted, isOtherOperator, styles.deletedFields, styles.otherOperatorFields, styles.fields])

  const refIcons = useMemo(() => {
    return (qso.refs || []).map(ref => ({ ref, handler: findBestHook(`ref:${ref.type}`) })).filter(x => x.handler?.iconForQSO).map(({ ref, handler }, i) => (
      <View key={i} style={fieldsStyle.icon}><H2kIcon key={i} name={handler?.iconForQSO} size={styles.normalFontSize} color={fieldsStyle.icon.color} /></View>
    ))
  }, [qso.refs, styles.normalFontSize, fieldsStyle.icon])

  return (
    <H2kPressable onPress={pressHandler} style={rowStyle}>
      <View style={styles.rowInner}>
        <Text style={fieldsStyle.time}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text style={fieldsStyle.freq}>
          {freqParts[0] && <Text style={fieldsStyle.freqMHz}>{freqParts[0]}.</Text>}
          {freqParts[1] && <Text style={fieldsStyle.freqKHz}>{freqParts[1]}</Text>}
          {freqParts[2] && <Text style={fieldsStyle.freqHz}>
            {styles.mdOrLarger ? `.${freqParts[2]}` : `.${freqParts[2].substring(0, 1)}`}
          </Text>}
        </Text>
        <Text style={fieldsStyle.call}>
          {qso.their?.call ?? '?'}
          {styles.narrowWidth && theirInfo?.emoji && (
            ' ' + theirInfo?.emoji
          )}
        </Text>
        <Text style={fieldsStyle.location} numberOfLines={1}>
          {theirInfo?.entityPrefix && (settings.dxFlags === 'all' || (settings.dxFlags !== 'none' && theirInfo.entityPrefix !== ourInfo?.entityPrefix)) && (
            ' ' + DXCC_BY_PREFIX[theirInfo.entityPrefix]?.flag
          )}
          {(!!settings.showStateField && theirInfo?.state)}
        </Text>
        <Text style={fieldsStyle.name} numberOfLines={1}>
          {!styles.narrowWidth && theirInfo?.emoji && (
            theirInfo?.emoji + ' '
          )}
          {styles.smOrLarger && theirInfo?.name}
        </Text>
        {(qso.notes || confirmedBySpot || bustedBySpot || refIcons.length > 0) && (
          <View style={fieldsStyle.icons}>
            {qso.notes && (
              <H2kIcon source="note-outline" size={styles.normalFontSize} style={fieldsStyle.icon} />
            )}
            {(confirmedBySpot || bustedBySpot) && (
              <View style={fieldsStyle.icon}><H2kIcon name={`${confirmedBySpot ? 'check' : 'help'}-circle`} size={styles.normalFontSize} style={fieldsStyle.icon} /></View>
            )}
            {refIcons}
          </View>
        )}
        {extraInfo ? (
          <>
            {styles.mdOrLarger && (settings.showRSTFields !== false) && (
              <Text style={fieldsStyle.signal}>{settings.switchSentRcvd ? qso?.their?.sent : qso?.our?.sent}{' '}{settings.switchSentRcvd ? qso?.our?.sent : qso?.their?.sent}</Text>
            )}
            <Text style={fieldsStyle.exchange} numberOfLines={1}>{extraInfo}</Text>
          </>
        ) : (
          (settings.showRSTFields !== false) && (
            <Text style={fieldsStyle.signal}>{settings.switchSentRcvd ? qso?.their?.sent : qso?.our?.sent}{' '}{settings.switchSentRcvd ? qso?.our?.sent : qso?.their?.sent}</Text>
          )
        )}
      </View>
    </H2kPressable>
  )
})

export default QSOItem
