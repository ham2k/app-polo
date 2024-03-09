import React, { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { selectOperation, setOperationData } from '../../store/operations'
import { replaceRefs } from '../../tools/refTools'
import activities from './activities'

export default function OperationAddActivityScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))

  const addActivity = useCallback((activity) => {
    const type = activity.activationType || activity.refType || activity.key
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRefs(
        operation.refs,
        type,
        [{ type, ref: '', ...activity.defaultValue }]
      )
    }))
    navigation.goBack()
  }, [operation, dispatch, navigation])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          {activities.map((activity) => (
            <List.Item
              key={activity.key}
              title={activity.name}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={activity.icon} />}
              onPress={() => addActivity(activity)}
            />
          ))}
        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}
