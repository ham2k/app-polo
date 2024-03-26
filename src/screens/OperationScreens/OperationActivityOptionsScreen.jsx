import React, { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'

import ScreenContainer from '../components/ScreenContainer'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { selectOperation, setOperationData } from '../../store/operations'

import { replaceRefs } from '../../tools/refTools'
import { ListSeparator } from '../components/ListComponents'
import { findHooks } from '../../extensions/registry'

export default function OperationActivityOptionsScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))
  const handler = useMemo(() => findHooks(`ref:${route.params.activity}`)[0], [route.params.activity])
  const activity = useMemo(() => findHooks('activity', { key: handler.key })[0], [handler])

  useEffect(() => { // Prepare the screen, set the activity title, etc
    if (activity && operation) {
      navigation.setOptions({
        title: activity.name ?? `Activity "${activity.key}`
      })
    } else {
      navigation.goBack()
    }
  }, [navigation, activity, operation])

  const handleRemoveActivity = useCallback(() => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation, activity.activationType ?? activity.key, []) }))

    navigation.goBack()
  }, [activity, dispatch, navigation, operation])

  if (!handler || !activity) {
    navigation.goBack()
    return null
  }

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        {activity.Options && <activity.Options operation={operation} styles={styles} />}

        <List.Section>
          <ListSeparator />
          <List.Item
            title={`Remove ${activity.shortName ?? activity.name} from this operation`}
            titleStyle={{ color: styles.theme.colors.error }}
            // eslint-disable-next-line react/no-unstable-nested-components
            left={() => <List.Icon color={styles.theme.colors.error} style={{ marginLeft: styles.oneSpace * 2 }} icon="delete" />}
            onPress={handleRemoveActivity}
          />
        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}
