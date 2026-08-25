// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import { partsForFreq } from '@ham2k/lib-format-tools'

import { findBestHook } from '../../../../../extensions/registry'
import { H2kIcon, H2kPressable } from '../../../../../ui'
import { radioValuesFor } from '../LoggingPanel/loggingFunctions'

const QSOItem = React.memo(function QSOItem ({
  qso, ourInfo, onPress, styles, selected, isOtherOperator, settings, timeFormatFunction, refHandlers
}) {
  const { t } = useTranslation()

  const theirInfo = { ...qso?.their?.guess, ...qso?.their }

  // Neither the band a QSO was on nor the mode it used can be recovered later,
  // so a QSO missing either one gets flagged in the list.
  const { freqParts, bandMissing, modeMissing } = useMemo(() => {
    const { band, freq, mode } = radioValuesFor({ qso })

    let parts
    if (freq) parts = partsForFreq(freq)
    else if (band) parts = [null, band, null]
    else if (qso?.deleted) parts = [null, null, null]
    else parts = [null, '???', null]

    return {
      freqParts: parts,
      bandMissing: !qso?.deleted && !(band || freq),
      modeMissing: !qso?.deleted && !mode
    }
  }, [qso])

  const radioInfoMissing = bandMissing || modeMissing

  const extraInfo = useMemo(() => {
    let info = []
    try {
      (refHandlers || []).forEach(handler => {
        const x = handler.relevantInfoForQSOItem({ qso })
        if (x) info = info.concat(x)
      })
    } catch (e) {
    }
    return info.filter(x => x).map(x => x.trim()).join(' ')
  }, [qso, refHandlers])

  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

  const accessibilityLabel = useMemo(() => {
    const parts = [qso.their?.call ?? 'no call']
    if (qso.deleted) parts.push('deleted')
    if (qso?.their?.name ?? qso?.their?.guess?.name) parts.push(qso?.their?.name ?? qso?.their?.guess?.name)
    if (qso.startAtMillis) parts.push(timeFormatFunction(qso.startAtMillis))
    if (freqParts[0]) {
      parts.push(`${freqParts[0]}.${freqParts[1]} MHz`)
    } else if (bandMissing) {
      parts.push(t('screens.opLoggingTab.bandMissing', 'Band???'))
    } else if (freqParts[1]) {
      parts.push(freqParts[1])
    }
    if (modeMissing) parts.push(t('screens.opLoggingTab.modeMissing', 'Mode???'))
    if (extraInfo) parts.push(extraInfo)
    return parts.join(', ')
  }, [qso, freqParts, bandMissing, modeMissing, extraInfo, timeFormatFunction, t])

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

  // Each of the frequency styles sets its own color, so they all have to be overriden
  const freqStyles = useMemo(() => {
    if (!radioInfoMissing) return fieldsStyle
    const color = styles.colors.error
    return {
      freq: { ...fieldsStyle.freq, color },
      freqMHz: { ...fieldsStyle.freqMHz, color },
      freqKHz: { ...fieldsStyle.freqKHz, color },
      freqHz: { ...fieldsStyle.freqHz, color }
    }
  }, [radioInfoMissing, fieldsStyle, styles.colors.error])

  // Mode has no column of its own, so it only takes up room when it is missing
  const missingModeStyle = useMemo(() => ({
    ...fieldsStyle.freqKHz,
    color: styles.colors.error,
    flex: 0,
    marginLeft: styles.oneSpace * styles.sized({ xs: 1, lg: 2 })
  }), [fieldsStyle.freqKHz, styles.colors.error, styles.oneSpace, styles.sized])

  const refIcons = useMemo(() => {
    return (qso.refs || []).filter(ref => ref.type).map(ref => ({ ref, handler: findBestHook(`ref:${ref.type}`) })).filter(x => x.handler?.iconForQSO).map(({ ref, handler }, i) => (
      <H2kIcon key={i} name={handler?.iconForQSO} color={fieldsStyle.icon.color} size={styles.normalFontSize * 0.9} />
    ))
  }, [qso.refs, fieldsStyle.icon, styles.normalFontSize])

  return (
    <H2kPressable
      onPress={pressHandler}
      style={rowStyle}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.rowInner}>
        <Text style={fieldsStyle.time}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text style={freqStyles.freq}>
          {freqParts[0] && <Text style={freqStyles.freqMHz}>{freqParts[0]}.</Text>}
          {freqParts[1] && <Text style={freqStyles.freqKHz}>{freqParts[1]}</Text>}
          {freqParts[2] && styles.hasFrequencyDecimals && <Text style={freqStyles.freqHz}>
            {styles.sized({ xs: false, lg: true }) ? `.${freqParts[2]}` : `.${freqParts[2].substring(0, 1)}`}
          </Text>}
        </Text>
        {modeMissing && <Text style={missingModeStyle}>???</Text>}
        <Text style={fieldsStyle.call}>
          {qso.their?.call ?? '?'}
        </Text>
        <Text style={fieldsStyle.location} numberOfLines={1}>
          {theirInfo?.entityPrefix && (settings.dxFlags === 'all' || (settings.dxFlags !== 'none' && theirInfo.entityPrefix !== ourInfo?.entityPrefix)) && (
            ' ' + DXCC_BY_PREFIX[theirInfo.entityPrefix]?.flag
          )}
          {(!!settings.showStateField && theirInfo?.state)}
        </Text>
        <Text style={fieldsStyle.name} numberOfLines={1}>
          {theirInfo?.emoji && (
            theirInfo?.emoji + ' '
          )}
          {styles.smOrLarger && theirInfo?.name}
        </Text>
        {(qso.notes || confirmedBySpot || bustedBySpot || refIcons.length > 0) && (
          <Text style={fieldsStyle.icons}>
            {qso.notes && (
              <H2kIcon source="file-document-outline" style={fieldsStyle.icon} />
            )}
            {(confirmedBySpot || bustedBySpot) && (
              <H2kIcon name={`${confirmedBySpot ? 'check' : 'help'}-circle`} style={fieldsStyle.icon} />
            )}
            {refIcons}
          </Text>
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
