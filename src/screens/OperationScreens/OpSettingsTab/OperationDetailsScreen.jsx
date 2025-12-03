/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, setOperationData } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { H2kListSection, H2kTextInput } from '../../../ui'

export default function OperationDetailsScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))

  const [title, setTitle] = useState(operation?.userTitle || '')
  const [notes, setNotes] = useState(operation?.notes || '')

  useEffect(() => {
    if (!operation) {
      navigation.goBack()
    }

    navigation.setOptions({
      leftAction: 'accept',
      leftActionA11yLabel: 'Accept Changes',
      rightAction: 'revert',
      rightActionA11yLabel: 'Revert Changes',
      onLeftActionPress: () => {
        dispatch(setOperationData({ uuid: operation.uuid, userTitle: title, notes }))
        navigation.goBack()
      },
      onRightActionPress: () => {
        setTitle(operation?.userTitle || '')
        setNotes(operation?.notes || '')
        navigation.goBack()
      }
    })
  }, [navigation, operation, dispatch, title, notes])

  const handleChangeTitle = useCallback((value) => {
    setTitle(value)
  }, [setTitle])

  const handleChangeNotes = useCallback((value) => {
    setNotes(value)
  }, [setNotes])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace }}>
          <H2kListSection title={'Title'}>
            <View style={{ marginHorizontal: styles.oneSpace * 2 }}>
              <H2kTextInput
                value={title ?? ''}
                placeholder={'New Operation'}
                onChangeText={handleChangeTitle}
              />
            </View>
          </H2kListSection>
          <H2kListSection title={'Notes'}>
            <View style={{ marginHorizontal: styles.oneSpace * 2 }}>
              <H2kTextInput
                value={notes ?? ''}
                placeholder={'Anything you want to write about this operation'}
                onChangeText={handleChangeNotes}
              />
            </View>
          </H2kListSection>
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}
