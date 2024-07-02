/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Icon, IconButton } from 'react-native-paper'

import LoggerChip from '../../../../components/LoggerChip'
import { stringOrFunction } from '../../../../../../tools/stringOrFunction'

const PositionedControlChip = (props) => {
  const { control, operation, vfo, qso, settings, onChange } = props

  const [layout, setLayout] = useState([])
  const handleLayout = useCallback((event) => {
    setLayout({ ...event.nativeEvent.layout, key: control.key })
  }, [control.key])

  const handleChange = useCallback((value) => {
    onChange && onChange(value, layout)
  }, [onChange, layout])

  if (control?.LabelComponent) {
    return (
      <View onLayout={handleLayout}><control.LabelComponent {...props} onChange={handleChange} /></View>
    )
  } else {
    return (
      <View onLayout={handleLayout}>
        <LoggerChip {...props} onChange={handleChange}>
          {control.label ? stringOrFunction(control.label, { operation, qso, vfo, settings }) : control.key}
        </LoggerChip>
      </View>
    )
  }
}

export const SecondaryControlSelectionsubPanel = ({
  qso, operation, vfo, settings, navigation, setQSO, updateQSO, handleFieldChange, onSubmitEditing, focusedRef, styles,
  themeColor, currentSecondaryControl, setCurrentSecondaryControl,
  allControls, enabledControls
}) => {
  const [containerLayout, setContainerLayout] = useState()

  const [chipLayout, setChipLayout] = useState({})
  const handleChipSelect = useCallback((key, value, layout) => {
    if (value) {
      setChipLayout(layout)
    } else {
      setChipLayout({})
    }
    if (allControls[key]?.onSelect) {
      allControls[key].onSelect({ qso, operation, settings, navigation })
    } else {
      setCurrentSecondaryControl(key)
    }
  }, [allControls, navigation, operation, qso, setCurrentSecondaryControl, settings])

  const [secondaryControl, SecondaryComponent] = useMemo(() => {
    const control = allControls[currentSecondaryControl]
    return [control, control?.InputComponent]
  }, [allControls, currentSecondaryControl])

  useEffect(() => {
    if (secondaryControl?.onlyNewQSOs && !qso?._isNew) {
      setCurrentSecondaryControl(undefined)
    }
  }, [qso?._isNew, secondaryControl?.onlyNewQSOs, setCurrentSecondaryControl])

  const [secondaryContainerStyle, setSecondaryContainerStyle] = useState()
  const [secondaryComponentStyle, setSecondaryComponentStyle] = useState()

  useEffect(() => {
    if (secondaryControl && secondaryControl.key === chipLayout.key) {
      // We only update once secondaryControl matches chipLayout
      // because measurements are updated before currentSecondaryControl, and this can cause UI components to jump around.
      // This is because LoggingPanel has a delay before updating currentSecondaryControl in
      // order to manage focus and keyboard visibility

      const controlWidth = styles.oneSpace * (secondaryControl.inputWidthMultiplier ?? 20)

      setSecondaryComponentStyle({ width: controlWidth })
      if (chipLayout.x + controlWidth < containerLayout.width) {
        setSecondaryContainerStyle({ paddingLeft: chipLayout.x, paddingRight: styles.oneSpace })
      } else if (containerLayout.width - (chipLayout.x + chipLayout.width) - controlWidth > 0) {
        setSecondaryContainerStyle({ paddingLeft: styles.oneSpace, paddingRight: containerLayout.width - (chipLayout.x + chipLayout.width), justifyContent: 'flex-end' })
      } else {
        setSecondaryContainerStyle({ paddingLeft: styles.oneSpace, paddingRight: styles.oneSpace, justifyContent: 'flex-end' })
      }
    }
  }, [secondaryControl, chipLayout, containerLayout, currentSecondaryControl, styles])

  const [chipContainerOpen, setChipContainerOpen] = useState(false)
  const handleContainerToggle = useCallback((value) => {
    setChipContainerOpen(value)
  }, [])

  const [chipContainerStyle, chipScrollViewProps] = useMemo(() => {
    if (chipContainerOpen) {
      return [{ flexWrap: 'wrap' }, { horizontal: false }]
    } else {
      return [{ flexWrap: 'nowrap', flex: 1 }, { horizontal: true }]
    }
  }, [chipContainerOpen])

  return (
    <>
      {SecondaryComponent && (
        <View style={[styles.secondaryControls.controlContainer, secondaryContainerStyle]}>
          <SecondaryComponent
            qso={qso} operation={operation} vfo={vfo} settings={settings}
            style={secondaryComponentStyle} styles={styles} themeColor={themeColor}
            handleFieldChange={handleFieldChange}
            setCurrentSecondaryControl={setCurrentSecondaryControl}
            setQSO={setQSO}
            updateQSO={updateQSO}
            onSubmitEditing={onSubmitEditing}
            focusedRef={focusedRef}
            selected={false}
          />
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
        <ScrollView
          {...chipScrollViewProps}
          keyboardShouldPersistTaps={'handled'}
          onLayout={(event) => setContainerLayout(event.nativeEvent.layout)}
        >
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: styles.oneSpace,
              paddingTop: styles.oneSpace,
              paddingBottom: styles.oneSpace,
              gap: styles.halfSpace,
              ...chipContainerStyle
            }}
          >
            {enabledControls.map(control => (
              <PositionedControlChip
                key={control.key}
                control={control}
                icon={control.icon}
                qso={qso} operation={operation} vfo={vfo} settings={settings}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                selected={currentSecondaryControl === control.key}
                disabled={control.onlyNewQSOs && !qso?._isNew}
                onChange={(value, measure) => handleChipSelect(control.key, value, measure)}
              />
            ))}

            <View style={{ flex: 0, flexDirection: 'column', marginRight: styles.oneSpace * 6 }}>
              <LoggerChip
                styles={styles}
                style={{ flex: 0 }}
                themeColor={themeColor}
                onChange={() => setCurrentSecondaryControl('manage-controls')}
              >
                <Icon source="cog" size={styles.oneSpace * 2} />
              </LoggerChip>
            </View>
          </View>
        </ScrollView>
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            top: 0,
            marginLeft: 0,
            flexDirection: 'column',
            justifyContent: 'flex-end',
            backgroundColor: chipContainerOpen ? undefined : styles.colors[`${themeColor}ContainerAlpha`]
          }}
        >
          <IconButton
            icon={chipContainerOpen ? 'chevron-down' : 'chevron-left'}
            onPress={() => handleContainerToggle(!chipContainerOpen)}
          />
        </View>
      </View>

    </>
  )
}
