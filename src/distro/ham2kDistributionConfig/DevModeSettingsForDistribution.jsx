/* eslint-disable react/no-unstable-nested-components */
/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Ham2kListSection } from '../../screens/components/Ham2kListSection'
import { Ham2kListItem } from '../../screens/components/Ham2kListItem'
import { DEFAULT_TRACK, UPDATE_TRACK_KEYS, UPDATE_TRACK_LABELS } from '../../screens/SettingsScreens/screens/VersionSettingsScreen'
import { List } from 'react-native-paper'
import { UpdateTracksDialog } from './UpdateTracksDialog'
import CodePush from 'react-native-code-push'

export function DevModeSettingsForDistribution ({ settings, styles, reportError }) {
  const [currentDialog, setCurrentDialog] = useState()

  const [pendingUpdateMetadata, setPendingUpdateMetadata] = useState()
  useEffect(() => {
    CodePush.getUpdateMetadata(CodePush.UpdateState.PENDING).then((metadata) => {
      if (metadata?.deploymentKey) {
        const track = Object.keys(UPDATE_TRACK_KEYS).find(key => UPDATE_TRACK_KEYS[key] === metadata.deploymentKey)
        if (track) metadata.track = track
      }
      setPendingUpdateMetadata(metadata)
    })
  }, [])

  const [isUpdating, setIsUpdating] = useState()
  const [updateMessage, setUpdateMessage] = useState()
  const checkForUpdatesLabel = useMemo(() => {
    if (isUpdating) {
      return 'Checking for updates...'
    } else if (pendingUpdateMetadata?.isPending) {
      setUpdateMessage(pendingUpdateMetadata?.description)
      if (settings.devMode || (settings.updateTrack && settings.updateTrack !== DEFAULT_TRACK)) {
        return `${UPDATE_TRACK_LABELS[settings?.updateTrack ?? 'Production']} update available`
      } else {
        return 'Update available'
      }
    } else if (settings.devMode || (settings.updateTrack && settings.updateTrack !== DEFAULT_TRACK)) {
      return `Check for ${UPDATE_TRACK_LABELS[settings?.updateTrack ?? 'Production']} updates`
    } else {
      return 'Check for updates'
    }
  }, [isUpdating, settings.devMode, settings.updateTrack, pendingUpdateMetadata?.description, pendingUpdateMetadata?.isPending])

  const checkForUpdates = useCallback(async () => {
    if (pendingUpdateMetadata?.isPending) {
      pendingUpdateMetadata.install(CodePush.InstallMode.IMMEDIATE)
    } else {
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
    }
  }, [pendingUpdateMetadata, reportError, settings.updateTrack])

  return (
    <Ham2kListSection title={'Updates'}>
      <Ham2kListItem title={'Select Update Track'}
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
      <Ham2kListItem title={checkForUpdatesLabel}
        description={updateMessage}
        disabled={isUpdating}
        style={{ opacity: isUpdating ? 0.7 : 1 }}
        titleStyle={{ color: styles.colors.devMode }}
        descriptionStyle={{ color: styles.colors.devMode }}
        onPress={checkForUpdates}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-arrow-down" color={styles.colors.devMode}/>}
      />

    </Ham2kListSection>
  )
}
