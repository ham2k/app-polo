import React, { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'

import activities from '../../../activities'
import LoggerChip from '../../../components/LoggerChip'
import { stringOrFunction } from '../../../../../tools/stringOrFunction'
import { timeControl } from './SecondaryExchangePanel/TimeControl'
import { radioControl } from './SecondaryExchangePanel/RadioControl'
import { notesControl } from './SecondaryExchangePanel/NotesControl'
import { Icon, IconButton, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../../../store/operations'
import { setSettings } from '../../../../../store/settings'

export const SecondaryExchangePanel = ({
  qso, operation, settings, setQSO, handleFieldChange, handleSubmit, focusedRef, styles, themeColor, currentSecondaryControl, setCurrentSecondaryControl
}) => {
  const secondaryControlSettings = useMemo(() => (
    operation?.secondaryControls ?? settings?.secondaryControls ?? {}
  ), [operation?.secondaryControls, settings?.secondaryControls])

  const allControls = useMemo(() => {
    const newControls = {
      time: timeControl,
      radio: radioControl,
      notes: notesControl
    }
    activities.forEach(activity => {
      const activityControls = activity.loggingControls ? activity.loggingControls({ operation, settings }) : []
      for (const control of activityControls) {
        newControls[control.key] = control
      }
    })
    return newControls
  }, [operation, settings])

  const enabledControls = useMemo(() => {
    let keys = Object.keys(allControls)

    keys = keys.filter(key => allControls[key].optionType === 'mandatory' || secondaryControlSettings[key])

    return keys.map(key => allControls[key]).sort((a, b) => a.order - b.order)
  }, [allControls, secondaryControlSettings])

  const moreControls = useMemo(() => {
    let keys = Object.keys(allControls)

    keys = keys.filter(key => !(allControls[key].optionType === 'mandatory' || secondaryControlSettings[key]))

    return keys.map(key => allControls[key]).sort((a, b) => a.order - b.order)
  }, [allControls, secondaryControlSettings])

  const CurrentSecondaryControlComponent = useMemo(() => {
    return currentSecondaryControl && allControls[currentSecondaryControl] && allControls[currentSecondaryControl].InputComponent
  }, [allControls, currentSecondaryControl])

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

  if (currentSecondaryControl === 'manage-controls') {
    return (
      <>
        <View style={styles.secondaryControls.headingContainer}>
          <Text style={styles.secondaryControls.headingText}>More Controls — select to add them</Text>
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
          <Text style={styles.secondaryControls.headingText}>Active Controls — select to remove them</Text>
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
                <Icon source="plus-circle" size={styles.oneSpace * 2} color={styles.colors[`on${styles.upcasedThemeColor}`]} />
              </LoggerChip>
            </View>
          </View>
        </View>
        <View style={[styles.secondaryControls.controlContainer, { flexDirection: 'column' }]}>
          <Text style={styles.secondaryControls.controlText}>Add or remove additional controls.</Text>
          <Text style={styles.secondaryControls.controlText}>Some of them are required and cannot be removed.</Text>
        </View>
      </>
    )
  } else {
    return (
      <>
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
                  selected={currentSecondaryControl === control.key} onChange={(value) => setCurrentSecondaryControl(control.key)}
                />
              ) : (
                <LoggerChip
                  icon={control.icon}
                  style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                  selected={currentSecondaryControl === control.key} onChange={(value) => setCurrentSecondaryControl(currentSecondaryControl === control.key ? '' : control.key)}
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
                onChange={() => setCurrentSecondaryControl('manage-controls')}
              >
                <Icon source="plus-circle" size={styles.oneSpace * 2} />
              </LoggerChip>
            </View>
          </View>
        </View>
        {CurrentSecondaryControlComponent && (
          <View style={styles.secondaryControls.controlContainer}>
            <CurrentSecondaryControlComponent
              qso={qso} operation={operation} settings={settings}
              style={{ flex: 0 }} styles={styles} themeColor={themeColor}
              handleFieldChange={handleFieldChange}
              setQSO={setQSO}
              handleSubmit={handleSubmit}
              focusedRef={focusedRef}
              selected={false}
            />
          </View>
        )}
      </>
    )
  }
}
