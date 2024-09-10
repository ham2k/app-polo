/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Button, Dialog, List, Switch, Text } from 'react-native-paper'
import { ScrollView } from 'react-native'
import UUID from 'react-native-uuid'

import { BUILT_IN_NOTES, CallNotesData, Info, createDataFileDefinition } from '../CallNotesExtension'
import { loadDataFile } from '../../../../store/dataFiles/actions/dataFileFS'
import { registerDataFile, unRegisterDataFile } from '../../../../store/dataFiles'
import { selectExtensionSettings, setExtensionSettings } from '../../../../store/settings'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import ScreenContainer from '../../../../screens/components/ScreenContainer'
import ThemedTextInput from '../../../../screens/components/ThemedTextInput'
import { Ham2kListItem } from '../../../../screens/components/Ham2kListItem'
import { Ham2kListSection } from '../../../../screens/components/Ham2kListSection'
import { Ham2kDialog } from '../../../../screens/components/Ham2kDialog'

const FileDefinitionDialog = ({ identifier, extSettings, styles, dispatch, onDialogDone }) => {
  const def = useMemo(() => extSettings.customFiles.find(f => f.identifier === identifier), [extSettings.customFiles, identifier])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const originalLocation = useMemo(() => def.location, [])

  const updateDef = useCallback((values) => {
    const newFiles = [...extSettings.customFiles]
    let pos = newFiles.findIndex(f => f.identifier === identifier)
    if (pos < 0) pos = newFiles.length
    newFiles[pos] = { ...def, ...values }

    dispatch(setExtensionSettings({ key: Info.key, customFiles: newFiles }))
  }, [extSettings.customFiles, def, dispatch, identifier])

  const handleDelete = useCallback(() => {
    const newFiles = [...extSettings.customFiles]
    let pos = newFiles.findIndex(f => f.identifier === identifier)
    newFiles.splice(pos, 1)
    const enabledNotes = { ...extSettings.enabledNotes }
    delete enabledNotes[identifier]
    dispatch(setExtensionSettings({ key: Info.key, customFiles: newFiles, enabledNotes }))

    pos = CallNotesData.files.findIndex(f => f.identifier === identifier)
    if (pos >= 0) {
      CallNotesData.files.splice(pos, 1)
      delete CallNotesData.notes[identifier]
      unRegisterDataFile(`call-notes-${identifier}`)
      CallNotesData.activeFiles[identifier] = false
    }

    onDialogDone && onDialogDone()
  }, [dispatch, extSettings.customFiles, extSettings.enabledNotes, identifier, onDialogDone])

  const handleDone = useCallback(async () => {
    let pos = CallNotesData.files.findIndex(f => f.identifier === identifier)
    if (pos <= 0) pos = CallNotesData.files.length
    CallNotesData.files[pos] = def

    if (originalLocation !== def.location) {
      unRegisterDataFile(`call-notes-${identifier}`)
      registerDataFile(createDataFileDefinition(def))
      if (CallNotesData.activeFiles[identifier]) {
        dispatch(loadDataFile(`call-notes-${identifier}`))
      }
    }

    onDialogDone && onDialogDone()
  }, [originalLocation, def, onDialogDone, identifier, dispatch])

  return (
    <Ham2kDialog visible={true} onDismiss={onDialogDone}>
      <Dialog.Title style={{ textAlign: 'center' }}>Callsign Notes File</Dialog.Title>
      <Dialog.Content>
        <ThemedTextInput
          label="Name"
          value={def.name ?? ''}
          placeholder={'Name for your Callsign Notes File'}
          onChangeText={(value) => updateDef({ name: value }) }
        />
        <ThemedTextInput
          label="Location"
          value={def.location ?? ''}
          inputMode={'url'}
          // multiline={true}  // TODO: Change to multiline when this bug is fixed https://github.com/facebook/react-native/issues/37784
          placeholder={'https://example.com/dir/notes.txt'}
          onChangeText={(value) => updateDef({ location: value }) }
        />
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handleDelete}>Delete</Button>
        <Button onPress={handleDone}>Done</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}

export default function ManageCallNotesScreen ({ navigation, dispatch }) {
  useEffect(() => {
    navigation.setOptions({ title: 'Callsign Notes' })
  }, [navigation])

  const styles = useThemedStyles()

  const extSettings = useSelector(state => selectExtensionSettings(state, Info.key))

  const customFiles = useMemo(() => {
    return extSettings?.customFiles || []
  }, [extSettings])

  const [selectedFile, setSelectedFile] = useState()

  const handleToggle = useCallback((identifier, value) => {
    dispatch(setExtensionSettings({ key: Info.key, enabledNotes: { ...extSettings.enabledNotes, [identifier]: value } }))
    CallNotesData.activeFiles[identifier] = value
  }, [dispatch, extSettings.enabledNotes])

  const handleNewFile = useCallback(() => {
    const identifier = UUID.v1()
    dispatch(setExtensionSettings({ key: Info.key, customFiles: [...customFiles, { name: '', identifier }] }))
    CallNotesData.activeFiles[identifier] = true
    setSelectedFile(identifier)
  }, [customFiles, dispatch])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection title={'Builtin'}>
          {BUILT_IN_NOTES.map(def => (
            <Ham2kListItem
              key={def.name}
              title={def.name}
              description={def.description}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-account-outline" />}
              right={() => <Switch value={extSettings?.enabledNotes?.[def.identifier] !== false} onValueChange={(value) => handleToggle(def.identifier, value) } />}
            />
          ))}
        </Ham2kListSection>

        <Ham2kListSection title="Custom">
          {customFiles.map((def, i) => (
            <Ham2kListItem key={i}
              title={def.name}
              description={def.location}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-account-outline" />}
              right={() => <Switch value={extSettings.enabledNotes[def.identifier] !== false} onValueChange={(value) => handleToggle(def.identifier, value) } />}
              onPress={() => setSelectedFile(def.identifier)}
            />
          ))}

          <Ham2kListItem
            title={'Add a new file'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="plus" />}
            onPress={handleNewFile}
          />

        </Ham2kListSection>
        {selectedFile !== undefined && (
          <FileDefinitionDialog
            identifier={selectedFile}
            extSettings={extSettings}
            styles={styles}
            dispatch={dispatch}
            onDialogDone={() => setSelectedFile(undefined)}
          />
        )}
        <Ham2kListSection title={'About Callsign Notes'}>
          <Text style={{ marginHorizontal: styles.oneSpace * 2 }}>
            Callsign notes are stored on simple text files, one call per line followed by
            information you want shown in the logging screen. You can use the builtin files
            or add your own.
          </Text>
        </Ham2kListSection>
      </ScrollView>
    </ScreenContainer>
  )
}
