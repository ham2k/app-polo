/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView } from 'react-native'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, setOperationData } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import ThemedTextInput from '../../components/ThemedTextInput'

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
      <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace }}>
        <Ham2kListSection title={'Title'}>
          <ThemedTextInput
            style={[styles.input, { marginHorizontal: styles.oneSpace * 2 }]}
            value={operation?.userTitle || ''}
            placeholder={'New Operation'}
            onChangeText={handleChangeTitle}
          />
        </Ham2kListSection>
        <Ham2kListSection title={'Notes'}>
          <ThemedTextInput
            style={[styles.input, { marginHorizontal: styles.oneSpace * 2 }]}
            value={operation?.notes || ''}
            label="Operation Notes"
            placeholder={'Anything you want to write about this operation'}
            onChangeText={handleChangeNotes}
            multiline={true}
            numberOfLines={6}
          />
        </Ham2kListSection>

      </ScrollView>
    </ScreenContainer>
  )
}
