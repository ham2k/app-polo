/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'
import DocumentPicker from 'react-native-document-picker'
import Share from 'react-native-share'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { selectSettings } from '../../../store/settings'
import { generateExport, importQSON, selectOperationsList } from '../../../store/operations'
import { loadQSOs } from '../../../store/qsos'
import { DEFAULT_TRACK, UPDATE_TRACK_KEYS, UPDATE_TRACK_LABELS } from './VersionSettingsScreen'
import { UpdateTracksDialog } from '../components/UpdateTracksDialog'
import { reportError } from '../../../App'
import CodePush from 'react-native-code-push'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    listRow: {
      marginLeft: baseStyles.oneSpace * 2,
      marginRight: baseStyles.oneSpace * 2,
      marginBottom: baseStyles.oneSpace
    }
  }
}

export default function DevModeSettingsScreen ({ navigation }) {
  const styles = useThemedStyles(prepareStyles)

  const [currentDialog, setCurrentDialog] = useState()

  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)
  const operations = useSelector(selectOperationsList)

  const handleExportFiles = useCallback(async () => {
    let paths = []
    for (const operation of operations) {
      await dispatch(loadQSOs(operation.uuid))
      const qsonPaths = await dispatch(generateExport(operation.uuid, 'qson'))
      if (qsonPaths?.length > 0) {
        paths = paths.concat(qsonPaths)
      }
    }
    if (paths.length > 0) {
      Share.open({
        urls: paths.map(p => `file://${p}`),
        type: 'text/plain' // There is no official QSON mime type
      }).then((x) => {
        console.info('Shared', x)
      }).catch((e) => {
        console.info('Sharing Error', e)
      }).finally(() => {
        // Deleting these file causes GMail on Android to fail to attach it
        // So for the time being, we're leaving them in place.
        // dispatch(deleteExport(path))
      })
    }
  }, [dispatch, operations])

  const handleImportFiles = useCallback(() => {
    DocumentPicker.pickSingle().then((file) => {
      console.info('File', file)
      dispatch(importQSON(file.uri))
    })
  }, [dispatch])

  const [isUpdating, setIsUpdating] = useState()
  const [updateMessage, setUpdateMessage] = useState()
  const checkForUpdatesLabel = useMemo(() => {
    if (isUpdating) {
      return 'Checking for updates...'
    } else if (settings.devMode || (settings.updateTrack && settings.updateTrack !== DEFAULT_TRACK)) {
      return `Check for ${UPDATE_TRACK_LABELS[settings?.updateTrack ?? 'Production']} Track updates`
    } else {
      return 'Check for updates'
    }
  }, [isUpdating, settings?.devMode, settings?.updateTrack])

  const checkForUpdates = useCallback(async () => {
    try {
      const deploymentKey = UPDATE_TRACK_KEYS[settings.updateTrack] || UPDATE_TRACK_KEYS.Production
      console.log(deploymentKey)
      setIsUpdating(true)
      setUpdateMessage('Checking for updates...')
      const update = await CodePush.checkForUpdate(deploymentKey)
      console.log(update)
      if (update) {
        setUpdateMessage('Update available')
        console.log(update)
        setTimeout(() => {
          setUpdateMessage('Downloading...')
          update.download((progress) => {
            setUpdateMessage(`Downloading... ${(progress.receivedBytes / progress.totalBytes * 100).toFixed(0)}%`)
          }).then((result) => {
            console.log(result)
            setUpdateMessage('Installing...')
            result.install(CodePush.InstallMode.IMMEDIATE)
            setIsUpdating(false)
          }).catch((err) => {
            reportError('Error downloading update', err)
            setUpdateMessage('Error downloading update')
            setIsUpdating(false)
          })
        }, 1000)
      } else {
        setUpdateMessage('No updates available')
        setIsUpdating(false)
      }
    } catch (err) {
      reportError('Error checking for updates', err)
      setUpdateMessage('Error checking for updates')
      setIsUpdating(false)
    }
  }, [settings.updateTrack])

  if (!settings.devMode) return

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>Updates</List.Subheader>
          <List.Item title={'Select Update Track'}
            description={UPDATE_TRACK_LABELS[settings?.updateTrack || DEFAULT_TRACK]}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="glass-fragile" color={styles.colors.devMode}/>}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={() => setCurrentDialog('track')}
          />
          {currentDialog === 'track' && (
            <UpdateTracksDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}
          <List.Item title={checkForUpdatesLabel}
            description={updateMessage}
            disabled={isUpdating}
            style={{ opacity: isUpdating ? 0.7 : 1 }}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={checkForUpdates}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-arrow-down" color={styles.colors.devMode}/>}
          />

          <List.Subheader>Data</List.Subheader>
          <List.Item
            title="Export all operation data"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-upload" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleExportFiles}
          />
          <List.Item
            title="Import QSON file"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-download" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleImportFiles}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
