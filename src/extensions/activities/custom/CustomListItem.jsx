/* eslint-disable react/no-unstable-nested-components */
import React from 'react'
import { IconButton, List, Text } from 'react-native-paper'
import { View } from 'react-native'

import { Info } from './CustomInfo'

export function CustomListItem ({ activityRef, style, styles, onPress, onRemoveReference }) {
  return (
    <List.Item style={{ paddingRight: styles.oneSpace * 1 }}
      title={
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ fontWeight: 'bold' }}>
            {[activityRef?.mySig, activityRef?.mySigInfo].filter(x => x).join(' ')}
          </Text>
        </View>
      }
      description={activityRef?.name}
      onPress={onPress}
      left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={Info.icon} />}
      right={() => (onRemoveReference && <IconButton icon="minus-circle-outline" onPress={() => onRemoveReference(activityRef.ref)} />
      )}
    />
  )
}
