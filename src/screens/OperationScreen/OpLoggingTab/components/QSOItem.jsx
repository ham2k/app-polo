import React from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'
import { View } from 'react-native'

import { activityIndex } from '../../activities'

export function guessItemHeight (qso, styles) {
  return styles.compactRow.height + styles.compactRow.borderBottomWidth
}

const REFS_TO_INCLUDE = {
  pota: true
}

const QSOItem = React.memo(function QSOItem ({ qso, onPress, styles, selected, extendedWidth }) {
  return (
    <TouchableRipple onPress={() => onPress && onPress({ qso })} style={{ backgroundColor: selected ? styles.theme.colors.secondaryLight : undefined }}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.number}>{qso._number}</Text>
        <Text style={styles.fields.time}>{fmtShortTimeZulu(qso.startOnMillis)}</Text>
        <Text style={styles.fields.freq}>{qso.freq ?? qso.band}</Text>
        <Text style={styles.fields.call}>{qso.their?.call ?? '?'}</Text>
        {qso.notes && (
          <Icon source="note-outline" size={styles.oneSpace * 2} style={styles.fields.icon} />
        )}
        {(qso.refs || []).filter(ref => REFS_TO_INCLUDE[ref.type]).map(ref => ({ ref, activity: activityIndex[ref.type] })).map(({ ref, activity }, i) => (
          <Icon key={i} source={activity?.icon} size={styles.oneSpace * 2} style={styles.fields.icon} />
        ))}
        {qso?.their?.exchange ? (
          <>
            {extendedWidth && (
              <Text style={styles.fields.signal}>{qso?.our?.sent}{'  '}{qso?.their?.sent}</Text>
            )}
            <Text style={styles.fields.exchange}>{qso?.their?.exchange}</Text>
          </>
        ) : (
          <Text style={styles.fields.signal}>{qso?.our?.sent}{'  '}{qso?.their?.sent}</Text>
        )}
      </View>
    </TouchableRipple>
  )
})
export default QSOItem
