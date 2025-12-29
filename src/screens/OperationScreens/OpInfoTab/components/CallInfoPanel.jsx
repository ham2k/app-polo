/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { Chip, IconButton, Text } from 'react-native-paper'
import { View, Image, Linking } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView } from 'react-native-gesture-handler'
import { useTranslation } from 'react-i18next'

import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import { fmtNumber } from '@ham2k/lib-format-tools'

import { selectSettings, setSettings } from '../../../../store/settings'
import { findHooks } from '../../../../extensions/registry'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { capitalizeString } from '../../../../tools/capitalizeString'
import { fmtDateTimeDynamicZulu } from '../../../../tools/timeFormats'
import { useCallLookup } from '../../OpLoggingTab/components/LoggingPanel/useCallLookup'
import { H2kMarkdown } from '../../../../ui'
import { bearingForQSON, distanceForQSON, fmtDistance } from '../../../../tools/geoTools'
import { selectOperationCallInfo } from '../../../../store/operations'

const HISTORY_QSOS_TO_SHOW = 3

export function CallInfoPanel ({ qso, operation, sections, themeColor, style }) {
  const { t } = useTranslation()

  const styles = useThemedStyles(prepareStyles, themeColor, style)
  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const call = useMemo(() => {
    const calls = qso?.their?.call?.split(',')?.filter(x => x)
    if (calls?.length > 1) {
      return calls[calls.length - 1]
    } else {
      return qso?.their?.call
    }
  }, [qso?.their?.call])

  const { guess, lookup } = useCallLookup(qso)

  const entity = DXCC_BY_PREFIX[guess?.entityPrefix]

  const locationInfo = useMemo(() => {
    const parts = []

    if (guess?.postindicators?.find(ind => ['P', 'M', 'AM', 'MM', 'PM'].indexOf(ind) >= 0)) {
      if (guess.postindicators.indexOf('P') >= 0) parts.push('[Portable]')
      else if (guess.postindicators.indexOf('M') >= 0) parts.push('[Mobile]')
      else if (guess.postindicators.indexOf('MM') >= 0) parts.push('[ 🚢 ]')
      else if (guess.postindicators.indexOf('AM') >= 0) parts.push('[ ✈️ ]')
      else if (guess.postindicators.indexOf('PM') >= 0) parts.push('[ 🪂 ]')
    }

    if (operation?.grid && guess?.grid) {
      const dist = distanceForQSON({ our: { ...ourInfo, grid: operation.grid }, their: { grid: qso?.their?.grid, guess } }, { units: settings.distanceUnits })
      let bearing
      if (settings.showBearing) {
        bearing = bearingForQSON({ our: { ...ourInfo, grid: operation.grid }, their: { grid: qso?.their?.grid, guess } })
      }
      const str = [
        dist && fmtDistance(dist, { units: settings.distanceUnits }),
        bearing && `(${Math.round(bearing)}°)`
      ].filter(x => x).join(' ')
      if (str) parts.push(t('general.formatting.distance.away', '{{distance}} away', { distance: str }))
    }

    if (guess?.locationLabel) parts.push(`at ${guess?.locationLabel}`)

    const locationText = parts.filter(x => x).join(' ')

    return locationText
  }, [guess, operation.grid, ourInfo, qso?.their?.grid, settings.distanceUnits, settings.showBearing, t])

  const [thisOpTitle, thisOpQSOs, historyTitle, historyRecent, historyAndMore] = useMemo(() => {
    const thisQs = (lookup?.history || []).filter(q => operation && q.operation === operation?.uuid)
    const otherOps = (lookup?.history || []).filter(q => q.operation !== operation?.uuid)

    const recent = otherOps?.slice(0, HISTORY_QSOS_TO_SHOW) || []
    let thisTitle
    let title
    let andMore

    if (thisQs?.length > 0) {
      thisTitle = t('screens.callInfo.thisOpCount', '{{count}} QSO in this operation', { count: thisQs.length, fmtCount: fmtNumber(thisQs.length) })
    } else {
      thisTitle = ''
    }

    if (otherOps?.length > 0) {
      title = t('screens.callInfo.otherOpsCount', '{{count}} QSOs in other operations', { count: otherOps.length, fmtCount: fmtNumber(otherOps.length) })
    } else {
      title = ''
    }

    if (otherOps?.length > HISTORY_QSOS_TO_SHOW) {
      andMore = t('screens.callInfo.andMoreCount', '… and {{count}} more', { count: otherOps.length, fmtCount: fmtNumber(otherOps.length) })
    } else {
      andMore = ''
    }

    return [thisTitle, thisQs, title, recent, andMore]
  }, [lookup?.history, operation, t])

  const confirmations = findHooks('confirmation')
    .map(hook => hook?.fetchConfirmation(qso))
    .filter(confirmation => confirmation !== undefined)

  const handleToggleImage = useCallback(() => {
    dispatch(setSettings({ showLookupImages: !settings?.showLookupImages }))
  }, [dispatch, settings?.showLookupImages])

  if (!call) return null

  return (
    <ScrollView style={styles.root}>
      <View style={[styles.section, { flexDirection: 'row' }]}>
        <View style={{ flex: 1, flexDirection: 'column' }}>

          <View style={{ flexDirection: 'row' }}>
            {/* <View>
              <Icon source={'account'} size={styles.oneSpace * 4} />
            </View> */}
            <View>
              <Text variant="headlineSmall" style={styles.text.callsign}>
                {call}
              </Text>
            </View>
          </View>

          <View>
            <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
              {capitalizeString(lookup?.name, { content: 'name', force: false })}
            </Text>
            {lookup?.city && (
              <Text style={{ marginTop: styles.oneSpace * 0.5 }}>
                {[capitalizeString(lookup.city, { content: 'address', force: false }), lookup.state].filter(x => x).join(', ')}
              </Text>
            )}
            {entity && (
              <Text style={{ marginTop: styles.oneSpace * 0.5 }}>{entity.flag} {entity.shortName}</Text>
            )}
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: styles.oneSpace, maxWidth: '50%', alignItems: 'center' }}>
          {lookup?.image && (
            settings?.showLookupImages !== false ? (
              <View style={{ width: '100%', height: styles.oneSpace * 20, marginBottom: styles.oneSpace }}>
                <Image source={{ uri: lookup.image }} style={{ height: '100%', borderWidth: styles.oneSpace * 0.7, borderColor: 'white', marginBottom: styles.oneSpace }} />
                <IconButton
                  theme={styles.chipTheme} textStyle={styles.chipTextStyle}
                  icon="eye-off"
                  mode="contained"
                  onPress={handleToggleImage}
                  style={{ position: 'absolute', right: 0, bottom: 0 }}
                />
              </View>
            ) : (
              <Chip
                theme={styles.chipTheme} textStyle={styles.chipTextStyle}
                icon="eye"
                mode="flat"
                onPress={handleToggleImage}
                style={{ marginBottom: styles.oneSpace }}
              >
                {t('screens.callInfo.showImage', 'Show Image')}
              </Chip>
            )
          )}
          <View flexDirection="row" style={{ gap: styles.oneSpace }}>
            <Chip
              theme={styles.chipTheme} textStyle={styles.chipTextStyle}
              icon="web"
              mode="flat"
              onPress={() => Linking.openURL(`https://qrz.com/db/${call}`)}
            >
              QRZ
            </Chip>
          </View>
        </View>
      </View>

      {locationInfo && (
        <Text style={{ marginTop: styles.oneSpace * 0.5 }}>{locationInfo}</Text>
      )}

      {lookup?.notes && (
        <View style={styles.section}>
          <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: styles.oneSpace * 2 }}>{t('screens.callInfo.notes', 'Notes')}</Text>
          <H2kMarkdown>{lookup.notes.map(note => note?.note).join('\n')}</H2kMarkdown>
        </View>
      )}

      {confirmations.length > 0 &&
        confirmations.map((confirmation, i) => (
          <View key={i} style={styles.section}>
            <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: styles.oneSpace * 2 }}>{confirmation.title}</Text>
            {confirmation.isGuess && <Text style={{ fontWeight: 'bold' }}>{t('screens.callInfo.potentialCall', 'Potential call: {{call}}', { call: confirmation.call })}</Text>}
            <H2kMarkdown>{confirmation?.note}</H2kMarkdown>
          </View>
        ))
      }

      {thisOpTitle && (
        <View style={styles.section}>
          <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: styles.oneSpace * 2 }}>
            {thisOpTitle}
          </Text>
          {thisOpQSOs.map((q, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: styles.oneSpace }}>
              <Text>{q.band}</Text>
              <Text>{q.mode}</Text>
              <Text>{fmtDateTimeDynamicZulu(q.startAtMillis)}</Text>
              {(q.ourCall || q.our?.call) !== operation.stationCall && (
                <Text>{t('screens.callInfo.withCall', 'with {{call}}', { call: (q.ourCall || q.our?.call) })}</Text>
              )}
            </View>
          ))}
        </View>
      )}
      <View style={[styles.section, { marginBottom: style.paddingBottom, gap: styles.oneSpace * 0.75 }]}>
        <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: styles.oneSpace * 2 }}>
          {historyTitle}
        </Text>
        {historyRecent.map((q, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: styles.oneSpace }}>
            <Text style={{}}>{q.band}</Text>
            <Text style={{}}>{q.mode}</Text>
            <Text style={{}}>{fmtDateTimeDynamicZulu(q.startAtMillis)}</Text>
            {(q.ourCall || q.our?.call) !== operation.stationCall && (
              <Text>{t('screens.callInfo.withCall', 'with {{call}}', { call: (q.ourCall || q.our?.call) })}</Text>
            )}
          </View>
        ))}
        {historyAndMore && (
          <Text style={{}}>
            {historyAndMore}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

function prepareStyles (baseStyles, themeColor, style) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  return {
    ...baseStyles,
    root: {
      ...style,
      paddingTop: baseStyles.oneSpace * 2,
      paddingLeft: Math.max(style?.paddingLeft || 0, baseStyles.oneSpace * 2),
      paddingRight: Math.max(style?.paddingRight || 0, baseStyles.oneSpace * 2),
      // paddingBottom is applied instead as a margin on the last section
      flexDirection: 'column',
      gap: baseStyles.oneSpace * 2
    },
    section: {
      flexDirection: 'column'
    },
    history: {
      pill: {
        marginRight: baseStyles.halfSpace,
        borderRadius: 3,
        padding: baseStyles.oneSpace * 0.3,
        paddingHorizontal: baseStyles.oneSpace * 0.5,
        backgroundColor: baseStyles.theme.colors[`${themeColor}Light`]
      },
      text: {
        fontSize: baseStyles.smallFontSize,
        fontWeight: 'normal',
        color: baseStyles.theme.colors[`on${upcasedThemeColor}Container`]
      },
      alert: {
        backgroundColor: 'red',
        color: 'white'
      },
      warning: {
        backgroundColor: 'green',
        color: 'white'
      },
      info: {
      }
    },
    markdown: {
      ...baseStyles.markdown,
      paragraph: { margin: 0, marginTop: baseStyles.halfSpace, marginBottom: 0 }
    },
    chipTheme: {
      colors: {
        primary: baseStyles.theme.colors[`on${upcasedThemeColor}Container`],
        onPrimary: baseStyles.theme.colors[themeColor],
        primaryContainer: baseStyles.theme.colors[`${themeColor}Container`],
        onPrimaryContainer: baseStyles.theme.colors[`on${upcasedThemeColor}Container`],
        secondaryContainer: baseStyles.theme.colors[`${themeColor}Light`],
        onSecondaryContainer: baseStyles.theme.colors[`on${upcasedThemeColor}`]
      }
    },
    chipTextStyle: {
      color: baseStyles.theme.colors[`on${upcasedThemeColor}Container`]
    }
  }
}
