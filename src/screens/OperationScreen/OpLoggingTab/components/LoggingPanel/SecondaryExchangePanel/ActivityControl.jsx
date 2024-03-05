import React from 'react'
import { View } from 'react-native'

import { stringOrFunction } from '../../../../../../tools/stringOrFunction'

export const generateActivityControl = (activity) => ({
  key: activity.key,
  order: 10,
  icon: activity.icon,
  label: ({ qso, operation, settings }) => stringOrFunction(activity.labelControlForQSO, { operation, qso, settings }),
  inputComponent: ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, setQSO, handleSubmit, focusedRef }) => (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <activity.OptionalExchangePanel qso={qso} setQSO={setQSO} operation={operation} settings={settings} disabled={disabled} styles={styles} focusedRef={focusedRef} />
    </View>
  )
})
