/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'
import { Icon, Text } from 'react-native-paper'

import LoggerChip from '../../../../components/LoggerChip'
import { stringOrFunction } from '../../../../../../tools/stringOrFunction'
import { setOperationData } from '../../../../../../store/operations'
import { setSettings } from '../../../../../../store/settings'

export const SecondaryControlManagementSubPanel = ({
  qso, operation, settings, styles, themeColor, currentSecondaryControl, setCurrentSecondaryControl,
  allControls, enabledControls, moreControls, secondaryControlSettings
}) => {
  const dispatch = useDispatch()

  const toggleSecondaryControlSettings = useCallback((key) => {
    const controls = { ...secondaryControlSettings }
    if (controls[key]) {
      delete controls[key]
    } else {
      controls[key] = true
    }
    dispatch(setOperationData({ uuid: operation.uuid, secondaryControls: controls }))
    dispatch(setSettings({ secondaryControls: controls }))
  }, [dispatch, operation.uuid, secondaryControlSettings])

  return (
    <>
      <View style={styles.secondaryControls.headingContainer}>
        <Text style={styles.secondaryControls.headingText}>
          <Text style={[styles.secondaryControls.headingText, { fontWeight: 'bold' }]}>More Controls</Text>
          {' '}— select to add them
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
                qso={qso} operation={operation} settings={settings}
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                disabled={control.optionType === 'mandatory'}
                selected={false}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              />
            ) : (
              <LoggerChip
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                disabled={control.optionType === 'mandatory'}
                selected={false}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              >
                {control.label ? stringOrFunction(control.label, { operation, qso, settings }) : control.key}
              </LoggerChip>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.secondaryControls.headingContainer, { paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace }]}>
        <Text style={styles.secondaryControls.headingText}>
          <Text style={[styles.secondaryControls.headingText, { fontWeight: 'bold' }]}>Active Controls</Text>
          {' '}— select to remove them
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
                qso={qso} operation={operation} settings={settings}
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                selected={false}
                disabled={control.optionType === 'mandatory'}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              />
            ) : (
              <LoggerChip
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                selected={false}
                disabled={control.optionType === 'mandatory'}
                onChange={() => toggleSecondaryControlSettings(control.key)}
              >
                {control.label ? stringOrFunction(control.label, { operation, qso, settings }) : control.key}
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
              onChange={() => setCurrentSecondaryControl('manage-controls')}
            >
              <Icon source="cog" size={styles.oneSpace * 2} color={styles.colors[`on${styles.upcasedThemeColor}`]} />
            </LoggerChip>
          </View>
        </View>
      </View>
    </>
  )
}
