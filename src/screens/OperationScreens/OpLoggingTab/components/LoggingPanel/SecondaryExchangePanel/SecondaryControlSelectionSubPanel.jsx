import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Icon } from 'react-native-paper'

import LoggerChip from '../../../../components/LoggerChip'
import { stringOrFunction } from '../../../../../../tools/stringOrFunction'

const PositionedControlChip = (props) => {
  const { control, operation, qso, settings, onChange } = props

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
          {control.label ? stringOrFunction(control.label, { operation, qso, settings }) : control.key}
        </LoggerChip>
      </View>
    )
  }
}

export const SecondaryControlSelectionsubPanel = ({
  qso, operation, settings, setQSO, handleFieldChange, handleSubmit, focusedRef, styles,
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
    setCurrentSecondaryControl(key)
  }, [setCurrentSecondaryControl])

  const [secondaryControl, SecondaryComponent] = useMemo(() => {
    const control = allControls[currentSecondaryControl]
    return [control, control?.InputComponent]
  }, [allControls, currentSecondaryControl])

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
        setSecondaryContainerStyle({ paddingLeft: chipLayout.x })
      } else if (containerLayout.width - (chipLayout.x + chipLayout.width) - controlWidth > 0) {
        setSecondaryContainerStyle({ paddingRight: containerLayout.width - (chipLayout.x + chipLayout.width), justifyContent: 'flex-end' })
      } else {
        setSecondaryContainerStyle({ paddingRight: styles.oneSpace, justifyContent: 'flex-end' })
      }
    }
  }, [secondaryControl, chipLayout, containerLayout, currentSecondaryControl, styles])

  return (
    <>
      {SecondaryComponent && (
        <View style={[styles.secondaryControls.controlContainer, secondaryContainerStyle]}>
          <SecondaryComponent
            qso={qso} operation={operation} settings={settings}
            style={secondaryComponentStyle} styles={styles} themeColor={themeColor}
            handleFieldChange={handleFieldChange}
            setQSO={setQSO}
            handleSubmit={handleSubmit}
            focusedRef={focusedRef}
            selected={false}
          />
        </View>
      )}
      <View
        onLayout={(event) => setContainerLayout(event.nativeEvent.layout)}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: styles.oneSpace,
          paddingTop: styles.oneSpace,
          paddingBottom: styles.oneSpace,
          gap: styles.halfSpace
        }}
      >
        {enabledControls.map(control => (
          <PositionedControlChip
            key={control.key}
            control={control}
            icon={control.icon}
            qso={qso} operation={operation} settings={settings}
            style={{ flex: 0 }} styles={styles} themeColor={themeColor}
            selected={currentSecondaryControl === control.key}
            onChange={(value, measure) => handleChipSelect(control.key, value, measure)}
          />
        ))}

        <View style={{ flex: 0, flexDirection: 'column' }}>
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
    </>
  )
}
