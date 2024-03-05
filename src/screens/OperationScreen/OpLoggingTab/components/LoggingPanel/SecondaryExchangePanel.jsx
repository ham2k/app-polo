import React, { useMemo } from 'react'
import { ScrollView, View } from 'react-native'

import activities from '../../../activities'
import LoggerChip from '../../../components/LoggerChip'
import { stringOrFunction } from '../../../../../tools/stringOrFunction'
import { timeControl } from './SecondaryExchangePanel/TimeControl'
import { radioControl } from './SecondaryExchangePanel/RadioControl'
import { notesControl } from './SecondaryExchangePanel/NotesControl'
import { generateActivityControl } from './SecondaryExchangePanel/ActivityControl'

const CONTROLS = {
  time: timeControl,
  radio: radioControl,
  notes: notesControl
}
activities.forEach(activity => {
  CONTROLS[activity.key] = generateActivityControl(activity)
})

export const SecondaryExchangePanel = ({ qso, operation, settings, setQSO, disabled, handleFieldChange, handleSubmit, focusedRef, styles, themeColor, visibleFields, setVisibleFields }) => {
  const elements = useMemo(() => {
    const keys = ['time', 'radio', 'notes']
    activities.forEach(activity => {
      if (activity.includeControlForQSO && activity.includeControlForQSO({ qso, operation, settings })) {
        keys.push(activity.key)
      }
    })

    return keys.map(key => CONTROLS[key]).sort((a, b) => a.order - b.order)
  }, [qso, operation, settings])

  return (
    <ScrollView keyboardShouldPersistTaps={'handled'} horizontal={true} style={{ width: '100%' }}>
      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.oneSpace, gap: styles.halfSpace }}>

        {elements.map(control => (
          <View key={control.key} style={{ flex: 0, flexDirection: 'column' }}>
            {control.labelComponent ? (
              <control.labelComponent
                qso={qso} operation={operation} settings={settings}
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                selected={visibleFields[control.key]} onChange={(value) => setVisibleFields({ ...visibleFields, [control.key]: value })}
              />
            ) : (
              <LoggerChip
                icon={control.icon}
                style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                selected={visibleFields[control.key]} onChange={(value) => setVisibleFields({ ...visibleFields, [control.key]: value })}
              >
                {control.label ? stringOrFunction(control.label, { operation, qso, settings }) : control.key}
              </LoggerChip>
            )}
            {visibleFields[control.key] && (
              <>
                <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
                <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
                  {control.inputComponent && (
                    <control.inputComponent
                      qso={qso} operation={operation} settings={settings}
                      disabled={disabled}
                      icon={control.icon}
                      style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                      handleFieldChange={handleFieldChange}
                      setQSO={setQSO}
                      handleSubmit={handleSubmit}
                      focusedRef={focusedRef}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        ))}

        {/* <View style={{ flex: 0, flexDirection: 'column' }}>
          <View style={{ flex: 0, flexDirection: 'row' }}>
            <LoggerChip icon="dots-vertical" styles={styles} style={{ flex: 0 }} themeColor={themeColor}
              selected={visibleFields.more}
              onChange={(value) => setVisibleFields({ ...visibleFields, more: value })}
            >More</LoggerChip>
          </View>
        </View> */}
      </View>
    </ScrollView>
  )
}
