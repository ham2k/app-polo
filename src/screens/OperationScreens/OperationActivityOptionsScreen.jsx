import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Text } from 'react-native-paper'
import { ScrollView, View } from 'react-native'

import ScreenContainer from '../components/ScreenContainer'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { selectOperation, setOperationData } from '../../store/operations'
import activities from './activities'
import { selectSettings } from '../../store/settings'
import { replaceRefs } from '../../tools/refTools'

export default function OperationActivityOptionsScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(selectOperation(route.params.operation))
  const activity = activities.find((act) => act.key === route.params.activity)
  const settings = useSelector(selectSettings)
  console.log(operation)
  useEffect(() => { // Prepare the screen, set the activity title, etc
    if (activity && operation) {
      navigation.setOptions({
        title: activity.name ?? `Activity "${activity.key}`
        // subTitle: (activity.description && activity.description(operation)) || activity.descriptionPlaceholder
      })
    } else {
      navigation.goBack()
    }
  }, [navigation, activity, operation])

  const handleRemoveActivity = useCallback(() => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, activity.activationType ?? activity.key, []) }))

    navigation.goBack()
  }, [activity, dispatch, navigation, operation])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        {activity.Options && <activity.Options operation={operation} styles={styles} />}

        <List.Section>
          <List.Item
            title={`Remove ${activity.shortName ?? activity.name} from this operation`}
            titleStyle={{ color: styles.theme.colors.error }}
            left={() => <List.Icon color={styles.theme.colors.error} style={{ marginLeft: styles.oneSpace * 2 }} icon="delete" />}
            onPress={handleRemoveActivity}
          />
        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}
