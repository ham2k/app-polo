/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo } from 'react'
import { IconButton, List, Text } from 'react-native-paper'
import { View } from 'react-native'

import { INFO } from './SOTAInfo'
import { SOTAData } from './SOTADataFile'

export function SOTAListItem ({ activityRef, refData, operationRef, style, styles, onPress, onAddReference, onRemoveReference }) {
  const reference = useMemo(() => {
    return (SOTAData.byReference && SOTAData.byReference[activityRef]) || {}
  }, [activityRef])

  return (
    <List.Item style={{ paddingRight: styles.oneSpace * 1 }}
      title={
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ fontWeight: 'bold' }}>
            {reference?.ref ?? activityRef}
          </Text>
          <Text>
            {reference?.name ? ` - ${reference?.name}` : ''}
          </Text>
        </View>
      }
      description={[SOTAData.regions[reference.reg]?.region, SOTAData.regions[reference.reg]?.association].filter(x => x).join(' • ')}
      onPress={onPress}
      left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={INFO.icon} />}
      right={() => (
        activityRef === operationRef ? (
          onRemoveReference && <IconButton icon="minus-circle-outline" onPress={() => onRemoveReference(activityRef)} />
        ) : (
          onAddReference && <IconButton icon="plus-circle" onPress={() => onAddReference(activityRef)} />

        )
      )}
    />
  )
}
