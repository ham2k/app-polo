/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, setOperationData } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { H2kListSection, H2kTextInput } from '../../../ui'

export default function OperationDetailsScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))

  useEffect(() => {
    if (!operation) {
      navigation.goBack()
    }
  }, [navigation, operation])

  const handleChangeTitle = useCallback((userTitle) => {
    dispatch(setOperationData({ uuid: operation.uuid, userTitle }))
  }, [dispatch, operation.uuid])

  const handleChangeNotes = useCallback((notes) => {
    dispatch(setOperationData({ uuid: operation.uuid, notes }))
  }, [dispatch, operation.uuid])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace }}>
          <H2kListSection title={'Title'}>
            <H2kTextInput
              style={[styles.input, { marginHorizontal: styles.oneSpace * 2 }]}
              value={operation?.userTitle || ''}
              placeholder={'New Operation'}
              onChangeText={handleChangeTitle}
            />
          </H2kListSection>
          <H2kListSection title={'Notes'}>
            <H2kTextInput
              style={[styles.input, { marginHorizontal: styles.oneSpace * 2 }]}
              value={operation?.notes || ''}
              placeholder={'Anything you want to write about this operation'}
              onChangeText={handleChangeNotes}
            />
          </H2kListSection>
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}
