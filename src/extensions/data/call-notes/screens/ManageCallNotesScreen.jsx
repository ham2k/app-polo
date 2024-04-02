import React, { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dialog, List, Portal, Text } from 'react-native-paper'
import { KeyboardAvoidingView, ScrollView } from 'react-native'

import ScreenContainer from '../../../../screens/components/ScreenContainer'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { getDataFileDefinitions, selectAllDataFileInfos } from '../../../../store/dataFiles'
import { fmtDateTimeNice, fmtDateTimeRelative } from '../../../../tools/timeFormats'
import { fetchDataFile } from '../../../../store/dataFiles/actions/dataFileFS'
import { selectSettings } from '../../../../store/settings'

const DataFileDefinitionItem = ({ def, settings, info, styles, onPress }) => {
  const Icon = useMemo(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={def.icon ?? 'file-outline'} />
  ), [def.icon, styles])
  return (
    <List.Item
      key={def.name}
      title={'TITLE'}
      description={`Updated ${fmtDateTimeRelative(info?.date)}`}
      left={() => Icon}
      onPress={onPress}
    />
  )
}

const DataFileDefinitionDialog = ({ def, info, settings, styles, onDialogDone }) => {
  const dispatch = useDispatch()

  const handleRefresh = useCallback(() => {
    dispatch(fetchDataFile(def.key))
  }, [def.key, dispatch])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={true} onDismiss={onDialogDone}>
          <Dialog.Icon icon={def.icon ?? 'file-outline'} />
          <Dialog.Title style={{ textAlign: 'center' }}>{def.name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{def.description}</Text>
          </Dialog.Content>
          <Dialog.Content>
            {info?.status === 'fetching' ? (
              <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Fetching...</Text>
            ) : (
              <>
                <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Updated on {fmtDateTimeNice(info?.date)}</Text>
                {info?.version && (
                  <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Version: {info.version}</Text>
                )}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between' }}>
            <Button onPress={handleRefresh} disabled={info?.status === 'fetching'}>Refresh</Button>
            <Button onPress={onDialogDone}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}

export default function ManageCallNotesScreen ({ navigation }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const dataFileDefinitions = useMemo(() => getDataFileDefinitions(), [])
  const sortedDataFileDefinitions = useMemo(() => {
    return Object.values(dataFileDefinitions).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
  }, [dataFileDefinitions])

  const dataFileInfos = useSelector(selectAllDataFileInfos)

  const [selectedDefinition, setSelectedDefinition] = useState()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>Offline Data</List.Subheader>
          {sortedDataFileDefinitions.map((def) => (
            <React.Fragment key={def.key}>
              <DataFileDefinitionItem def={def} settings={settings} info={dataFileInfos[def.key]} styles={styles} onPress={() => setSelectedDefinition(def.key)} />
              {selectedDefinition === def.key && (
                <DataFileDefinitionDialog
                  settings={settings}
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

        <List.Section>
          <List.Subheader>Offline Data</List.Subheader>

        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
