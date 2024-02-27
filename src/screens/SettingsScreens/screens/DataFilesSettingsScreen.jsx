import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Button, Dialog, List, Portal, Text } from 'react-native-paper'
import { KeyboardAvoidingView, ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { getDataFileDefinitions, selectAllDataFileInfos } from '../../../store/dataFiles'
import { fmtDateTimeNice, fmtDateTimeRelative } from '../../../tools/timeFormats'

const DefinitionItem = ({ def, info, styles, onPress }) => {
  const Icon = useMemo(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={def.icon ?? 'file-outline'} />
  ), [def.icon, styles])
  return (
    <List.Item
      key={def.name}
      title={def.name}
      description={`Updated ${fmtDateTimeRelative(info.date)}`}
      left={() => Icon}
      onPress={onPress}
    />
  )
}

const DefinitionDialog = ({ def, info, styles, onDialogDone }) => {
  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={true} onDismiss={onDialogDone}>
          <Dialog.Icon icon={def.icon ?? 'file-outline'} />
          <Dialog.Title style={{ textAlign: 'center' }}>{def.name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Updated on {fmtDateTimeNice(info.date)}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={onDialogDone}>Cancel</Button>
            <Button onPress={onDialogDone}>Ok</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}

export default function DataFilesSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const definitions = useMemo(() => getDataFileDefinitions(), [])
  const sortedDefinitions = useMemo(() => {
    return Object.values(definitions).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
  }, [definitions])

  const dataFileInfos = useSelector(selectAllDataFileInfos())

  const [selectedDefinition, setSelectedDefinition] = useState()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          {sortedDefinitions.map((def) => (
            <React.Fragment key={def.key}>
              <DefinitionItem def={def} info={dataFileInfos[def.key]} styles={styles} onPress={() => setSelectedDefinition(def.key)} />
              {selectedDefinition === def.key && (
                <DefinitionDialog
                  def={def}
                  info={dataFileInfos[def.key]}
                  styles={styles}
                  visible={true}
                  onDialogDone={() => setSelectedDefinition('')}
                />
              )}
            </React.Fragment>
          ))}
        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}
