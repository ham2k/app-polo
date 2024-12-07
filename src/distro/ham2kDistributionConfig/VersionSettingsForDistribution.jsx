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
import { Platform } from 'react-native'
import CodePush from 'react-native-code-push'

import packageJson from '../../../package.json'
import { reportError } from './distroTracking'
import { Ham2kListSection } from '../../screens/components/Ham2kListSection'
import { Ham2kListItem } from '../../screens/components/Ham2kListItem'
import DeviceInfo from 'react-native-device-info'
import { List } from 'react-native-paper'

export const UPDATE_TRACK_KEYS = {
  Production: (Platform.OS === 'ios') ? 'sC0Sy_ImAi-XZCBDK-mdoLYO2FR7CD2vXw1MD' : 'XfaqlzjBp9SWZLCZQSfezxEOdlkNgLu4PYrDN',
  Staging: (Platform.OS === 'ios') ? 'j1Ux2KScamgLBBbu3v0EgeFWLhWtLdfLk_A7d' : 'EIfkyoFTrEig6wBclCA0MBeY9H2GZBO1RoTaf',
  Development: (Platform.OS === 'ios') ? 'GgYMX5qJm-w6SDnyfAsfBEFcDPPPgWpxOANAI' : 'fDguTumb3gkMNGzZjZE8tcab6tD_KV2hohf3y'
}
export const UPDATE_TRACK_LABELS = {
  Production: 'Stable(ish)',
  Staging: 'Unstable',
  Development: 'Bleeding Edge'
}

export const DEFAULT_TRACK = 'Production'

export function VersionSettingsForDistribution ({ settings, styles }) {
  const [updateMetadata, setUpdateMetadata] = useState()
  useEffect(() => {
    CodePush.getUpdateMetadata().then((metadata) => {
      if (metadata?.deploymentKey) {
        const track = Object.keys(UPDATE_TRACK_KEYS).find(key => UPDATE_TRACK_KEYS[key] === metadata.deploymentKey)
        if (track) metadata.track = track
      }
      setUpdateMetadata(metadata)
    })
  }, [])

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

  const currentVersionLabel = useMemo(() => {
    let version
    if (packageJson.versionName) {
      version = `${packageJson.versionName} Release`
    } else {
      version = `Version ${packageJson.version}`
    }
    if ((updateMetadata?.track && updateMetadata?.track !== DEFAULT_TRACK) || settings.devMode) {
      version += ` (${UPDATE_TRACK_LABELS[updateMetadata?.track]})`
    }
    return version
  }, [settings.devMode, updateMetadata?.track])

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
        setIsUpdating(true)
        setUpdateMessage('Checking for updates...')
        const update = await CodePush.checkForUpdate(deploymentKey)
        if (update) {
          setUpdateMessage('Update available')
          setTimeout(() => {
            setUpdateMessage('Downloading...')
            update.download((progress) => {
              setUpdateMessage(`Downloading... ${(progress.receivedBytes / progress.totalBytes * 100).toFixed(0)}%`)
            }).then((result) => {
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
  }, [settings.updateTrack, pendingUpdateMetadata])

  return (
    <Ham2kListSection>

      <Ham2kListItem title={currentVersionLabel}
        description={`${packageJson.version} - Build ${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />}
      />

      <Ham2kListItem title={checkForUpdatesLabel}
        description={updateMessage}
        disabled={isUpdating}
        style={{ opacity: isUpdating ? 0.7 : 1 }}
        onPress={checkForUpdates}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-arrow-down" />}
      />
    </Ham2kListSection>
  )
}
