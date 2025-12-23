/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'
import { Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

import LoggerChip from '../../../../components/LoggerChip'
import { valueOrFunction } from '../../../../../../tools/valueOrFunction'
import { setOperationLocalData } from '../../../../../../store/operations'
import { setSettings } from '../../../../../../store/settings'
import { H2kIcon } from '../../../../../../ui'

export const SecondaryControlManagementSubPanel = ({
  qso, operation, vfo, settings, styles, themeColor, currentSecondaryControl, setCurrentSecondaryControl,
  allControls, enabledControls, moreControls, secondaryControlSettings
}) => {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const toggleSecondaryControlSettings = useCallback((key) => {
    const controls = { ...secondaryControlSettings }
    if (controls[key]) {
      delete controls[key]
    } else {
      controls[key] = true
    }
    dispatch(setOperationLocalData({ uuid: operation.uuid, secondaryControls: controls }))
    dispatch(setSettings({ secondaryControls: controls }))
  }, [dispatch, operation.uuid, secondaryControlSettings])

  return (
    <>
      <View style={styles.secondaryControls.headingContainer}>
        <Text style={styles.secondaryControls.headingText}>
          <Text style={[styles.secondaryControls.headingText, { fontWeight: 'bold' }]}>{t('screens.opLoggingTab.moreControlsLabel', 'More Controls')}</Text>
          {' '}— {t('screens.opLoggingTab.selectToAddMoreControls', 'select to add them')}
        </Text>
      </View>

      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: styles.oneSpace,
        paddingTop: styles.oneSpace,
        paddingBottom: styles.oneSpace,
        gap: styles.halfSpace
      }}
      >
        {moreControls?.map(control => (

          <View key={control.key} style={{ flex: 0, flexDirection: 'column' }}>
            {control.LabelComponent ? (
              <control.LabelComponent
                t={t}
                qso={qso} operation={operation} vfo={vfo} settings={settings} control={control}
                icon={control.icon}
                accessibilityLabel={control.accessibilityLabel}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                disabled={control.optionType === 'mandatory'}
                selected={false}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              />
            ) : (
              <LoggerChip
                icon={control.icon}
                accessibilityLabel={control.accessibilityLabel}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                disabled={control.optionType === 'mandatory'}
                selected={false}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              >
                {control.label ? valueOrFunction(control.label, { t, operation, vfo, qso, settings }) : control.key}
              </LoggerChip>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.secondaryControls.headingContainer, { paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace }]}>
        <Text style={styles.secondaryControls.headingText}>
          <Text style={[styles.secondaryControls.headingText, { fontWeight: 'bold' }]}>{t('screens.opLoggingTab.activeControlsLabel', 'Active Controls')}</Text>
          {' '}— {t('screens.opLoggingTab.selectToRemoveActiveControls', 'select to remove them')}
        </Text>
      </View>

      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: styles.oneSpace,
        paddingTop: styles.oneSpace,
        paddingBottom: styles.oneSpace,
        gap: styles.halfSpace
      }}
      >
        {enabledControls.map(control => (

          <View key={control.key} style={{ flex: 0, flexDirection: 'column' }}>
            {control.LabelComponent ? (
              <control.LabelComponent
                t={t}
                qso={qso} operation={operation} vfo={vfo} settings={settings} control={control}
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                selected={false}
                disabled={control.optionType === 'mandatory'}
                accessibilityLabel={control.accessibilityLabel ? valueOrFunction(control.accessibilityLabel, { t, operation, vfo, qso, settings }) : undefined}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              />
            ) : (
              <LoggerChip
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                selected={false}
                disabled={control.optionType === 'mandatory'}
                accessibilityLabel={control.accessibilityLabel ? valueOrFunction(control.accessibilityLabel, { t, operation, vfo, qso, settings }) : undefined}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              >
                {control.label ? valueOrFunction(control.label, { t, operation, vfo, qso, settings }) : control.key}
              </LoggerChip>
            )}
          </View>
        ))}

        <View style={{ flex: 0, flexDirection: 'column' }}>
          <View style={{ flex: 0, flexDirection: 'row' }}>
            <LoggerChip
              styles={styles}
              style={{ flex: 0 }}
              themeColor={themeColor}
              selected={true}
              accessibilityLabel={'Hide Secondary Control Settings'}
              onChange={() => setCurrentSecondaryControl('manage-controls')}
            >
              <H2kIcon icon="cog" size={styles.normalFontSize} />
            </LoggerChip>
          </View>
        </View>
      </View>
    </>
  )
}
