/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'react-native-paper'
import { Alert, ScrollView, View } from 'react-native'
import { pick, keepLocalCopy } from '@react-native-documents/picker'
import RNFetchBlob from 'react-native-blob-util'
import { fmtNumber } from '@ham2k/lib-format-tools'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { reportError } from '../../../distro'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { getDataFileDefinitions, selectAllDataFileInfos } from '../../../store/dataFiles'
import { fetchDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { selectSettings } from '../../../store/settings'
import { countHistoricalRecords, deleteHistoricalRecords, importHistoricalADIF } from '../../../store/operations'
import { fmtDateTimeNice, fmtDateTimeRelative } from '../../../tools/timeFormats'
import { findHooks } from '../../../extensions/registry'
import { countTemplate } from '../../../tools/stringTools'
import ScreenContainer from '../../components/ScreenContainer'
import KeepAwake from '@sayem314/react-native-keep-awake'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kListSection, H2kMarkdown } from '../../../ui'

const DataFileDefinitionItem = ({ def, settings, info, styles, onPress }) => {
  return (
    <H2kListItem
      key={def.name}
      title={def.name}
      description={`Updated ${fmtDateTimeRelative(info?.date)}`}
      leftIcon={def.icon ?? 'file-outline'}
      onPress={onPress}
    />
  )
}

const DataFileDefinitionDialog = ({ def, info, settings, styles, onDialogDone }) => {
  const dispatch = useDispatch()

  const [statusText, setStatusText] = useState()

  const handleRefresh = useCallback(() => {
    setStatusText(`### Fetching '${def.name}'…`)

    dispatch(fetchDataFile(def.key, {
      force: true,
      onStatus: ({ key, definition, status, progress }) => {
        if (status === 'fetching' || status === 'loading') {
          setStatusText(`### Fetching '${definition.name}'…`)
        } else if (status === 'progress') {
          setStatusText(`### Fetching '${definition.name}'\n\n${progress}`)
        } else if (status === 'loaded' || status === 'error') {
          setStatusText('')
        }
      }
    }))
  }, [def.key, def.name, dispatch])

  return (
    <H2kDialog visible={true} onDismiss={onDialogDone}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{def.name}</H2kDialogTitle>
      <H2kDialogContent>
        <H2kMarkdown>{def.buildDescription ? def.buildDescription({ data: info }) : def.description}</H2kMarkdown>
      </H2kDialogContent>
      <H2kDialogContent>
        {info?.status === 'fetching' ? (
          <>
            <H2kMarkdown>{statusText}</H2kMarkdown>
            <KeepAwake />
          </>
        ) : (
          <H2kMarkdown>
            Updated on {fmtDateTimeNice(info?.date)}
            {info?.version && `\n\nVersion: ${info.version}`}
          </H2kMarkdown>
        )}
      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handleRefresh} disabled={info?.status === 'fetching'}>Refresh</H2kButton>
        <H2kButton onPress={onDialogDone}>Done</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}

const ConfirmClearHistoryDialog = ({ onDialogDelete, onDialogDone }) => {
  const handleDelete = () => {
    onDialogDelete()
    onDialogDone()
  }

  return (
    <H2kDialog visible={true} onDismiss={onDialogDone}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Are you sure?</H2kDialogTitle>
      <H2kDialogContent>
        <Text variant="bodyMedium" style={{ textAlign: 'center' }}>This will remove all historical records previously imported from ADIF files</Text>
      </H2kDialogContent>
      <H2kDialogContent>
        <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Records from operations will not be deleted</Text>
      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handleDelete}>Delete</H2kButton>
        <H2kButton onPress={onDialogDone}>Cancel</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}

export default function DataSettingsScreen ({ navigation, splitView }) {
  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)

  const dataFileDefinitions = useMemo(() => getDataFileDefinitions(), [])
  const sortedDataFileDefinitions = useMemo(() => {
    return Object.values(dataFileDefinitions).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
  }, [dataFileDefinitions])

  const dataFileInfos = useSelector(selectAllDataFileInfos)

  const [selectedDefinition, setSelectedDefinition] = useState()

  const extensionSettingHooks = useMemo(() => {
    const hooks = findHooks('setting').filter(hook => hook.category === 'data' && hook.SettingItem)
    return hooks
  }, [])

  const [loadingHistoricalMessage, setLoadingHistoricalMessage] = useState()
  const [historicalCount, setHistoricalCount] = useState()
  const [showClearHistoricalRecordsDialog, setShowClearHistoricalRecordsDialog] = useState(false)
  useEffect(() => {
    setTimeout(async () => {
      const count = await dispatch(countHistoricalRecords())
      setHistoricalCount(count)
    }, 0)
  }, [dispatch])

  const handleImportHistoricalFile = useCallback(() => {
    pick({ mode: 'import' }).then(async (files) => {
      const [localCopy] = await keepLocalCopy({
        files: files.map(file => ({
          uri: file.uri,
          fileName: file.name ?? 'fallbackName'
        })),
        destination: 'cachesDirectory'
      })

      const filename = decodeURIComponent(localCopy.localUri?.replace('file://', ''))

      setLoadingHistoricalMessage('Importing ADIF records... Please be patient!')
      const interval = setInterval(async () => {
        const count = await dispatch(countHistoricalRecords())
        setHistoricalCount(count)
      }, 1000)

      await dispatch(importHistoricalADIF(filename))
      RNFetchBlob.fs.unlink(filename)

      clearInterval(interval)

      setLoadingHistoricalMessage()
      const count = await dispatch(countHistoricalRecords())

      setHistoricalCount(count)
    }).catch((error) => {
      if (error?.message?.indexOf('user canceled') >= 0) {
        // ignore
      } else {
        Alert.alert('Error importing historical ADIF', error.message)
        reportError('Error importing historical ADIF', error)
      }
    })
  }, [dispatch])

  const handleClearHistoricalRecords = useCallback(async () => {
    try {
      await dispatch(deleteHistoricalRecords())
    } catch (error) {
      Alert.alert('Error deleting historical records', error.message)
      reportError('Error deleting historical records', error)
    }

    setHistoricalCount(await dispatch(countHistoricalRecords()))
  }, [dispatch])

  return (
    <ScreenContainer>
      {loadingHistoricalMessage && (
        <H2kDialog visible={true}>
          <H2kDialogContent>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{loadingHistoricalMessage}</Text>
          </H2kDialogContent>
        </H2kDialog>
      )}

      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection title={'Offline Data'}>
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
        </H2kListSection>

        <H2kListSection title={'Log Data'}>
          <H2kListItem
            title="Import History from ADIF"
            description={historicalCount && countTemplate(historicalCount, { zero: 'No records', one: '1 record', more: '{fmtCount} records' }, { fmtCount: fmtNumber(historicalCount) })}
            leftIcon={'database-import-outline'}
            onPress={handleImportHistoricalFile}
          />
          {
            historicalCount > 0 &&
              <>
                <H2kListItem
                  title="Clear ADIF History"
                  description="Remove ADIF imported records"
                  leftIcon={'database-remove-outline'}
                  onPress={() => setShowClearHistoricalRecordsDialog(true)}
                />
                { showClearHistoricalRecordsDialog &&
                  <ConfirmClearHistoryDialog
                    onDialogDone={() => setShowClearHistoricalRecordsDialog(false)}
                    onDialogDelete={handleClearHistoricalRecords}
                  />
                }
              </>
          }
        </H2kListSection>

        {extensionSettingHooks.length > 0 ? (
          <H2kListSection title={'Extensions'} style={{ marginBottom: safeAreaInsets.bottom }}>
            {extensionSettingHooks.map((hook) => (
              <hook.SettingItem key={hook.key} settings={settings} styles={styles} navigation={navigation} />
            ))}
          </H2kListSection>
        ) : (
          <View style={{ height: safeAreaInsets.bottom }} />
        )}
      </ScrollView>
    </ScreenContainer>
  )
}
