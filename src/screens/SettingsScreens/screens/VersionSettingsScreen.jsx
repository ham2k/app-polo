/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { List } from 'react-native-paper'
import { useSelector } from 'react-redux'
import { Image, Platform, Pressable, ScrollView } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import Markdown from 'react-native-markdown-display'
import CodePush from 'react-native-code-push'

import packageJson from '../../../../package.json'
import releaseNotes from '../../../../RELEASE-NOTES.json'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { ListRow } from '../../components/ListComponents'
import { reportError } from '../../../distro'
import { selectSettings } from '../../../store/settings'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'

const SPLASH_IMAGE = require('../../../screens/StartScreen/img/launch_screen.jpg')

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

export default function VersionSettingsScreen ({ navigation }) {
  const styles = useThemedStyles(prepareStyles)

  const settings = useSelector(selectSettings)

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

  const [showImage, setShowImage] = useState(false)

  return (
    <ScreenContainer
      style={{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        margin: 0,
        height: '100%'
      }}
    >
      {showImage ? (
        <Pressable
          onPress={() => setShowImage(false)}
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'stretch'
          }}
        >
          <Image
            source={SPLASH_IMAGE}
            style={{
              resizeMode: 'cover',
              width: '100%',
              margin: 0,
              height: '100%'
            }}
          />
        </Pressable>
      ) : (
        <ScrollView style={{ flex: 1 }}>
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

          <Ham2kListSection>
            <Ham2kListItem
              title={'Recent Changes'}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="newspaper-variant-outline" />}
              right={() => (
                <Pressable onPress={() => setShowImage(true)}>
                  <Image source={SPLASH_IMAGE} style={{ width: 64, height: 64 }} />
                </Pressable>
              )}
            />

            {Object.keys(releaseNotes).slice(0, 8).map((release, i) => (
              <ListRow key={i} style={styles.listRow}>

                <Markdown style={styles.markdown}>
                  {
  `## ${releaseNotes[release].name ? `${releaseNotes[release].name} Release` : `Version ${release}`}
  ${releaseNotes[release].changes.map(c => `* ${c}\n`).join('')}
  `
                  }
                </Markdown>
              </ListRow>
            ))}
          </Ham2kListSection>

        </ScrollView>
      )}
    </ScreenContainer>
  )
}
