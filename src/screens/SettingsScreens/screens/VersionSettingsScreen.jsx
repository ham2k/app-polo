/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { List } from 'react-native-paper'
import { Platform, ScrollView } from 'react-native'

import DeviceInfo from 'react-native-device-info'

import packageJson from '../../../../package.json'
import releaseNotes from '../../../../RELEASE-NOTES.json'

import Markdown from 'react-native-markdown-display'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { ListRow } from '../../components/ListComponents'
import CodePush from 'react-native-code-push'
import { reportError } from '../../../App'
import { useSelector } from 'react-redux'
import { selectSettings } from '../../../store/settings'
import { UpdateTracksDialog } from '../components/UpdateTracksDialog'

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

export default function VersionSettingsScreen ({ navigation }) {
  const settings = useSelector(selectSettings)

  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      listRow: {
        marginLeft: baseStyles.oneSpace * 2,
        marginRight: baseStyles.oneSpace * 2,
        marginBottom: baseStyles.oneSpace
      }
    }
  })

  const [currentDialog, setCurrentDialog] = useState()

  const [updateMetadata, setUpdateMetadata] = useState()
  useEffect(() => {
    CodePush.getUpdateMetadata().then((metadata) => {
      console.log(metadata)
      if (metadata?.deploymentKey) {
        const track = Object.keys(UPDATE_TRACK_KEYS).find(key => UPDATE_TRACK_KEYS[key] === metadata.deploymentKey)
        if (track) metadata.track = track
        console.log('track', track)
      }
      setUpdateMetadata(metadata)
    })
  }, [])

  const [isUpdating, setIsUpdating] = useState()
  const [updateMessage, setUpdateMessage] = useState()
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

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Item title={`Version ${packageJson.version}${updateMetadata?.track ? ` - Track: ${UPDATE_TRACK_LABELS[updateMetadata.track]}` : ''}`}
            description={`Base Build ${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />}
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

          <List.Item title={
            isUpdating ? 'Checking for updates...'
              : `Check for updates${(settings?.updateTrack && settings.updateTrack !== 'Production') ? ` - Track: ${UPDATE_TRACK_LABELS[settings?.updateTrack ?? 'Production']}` : ''}`}
            description={updateMessage}
            disabled={isUpdating}
            style={{ opacity: isUpdating ? 0.7 : 1 }}
            onPress={checkForUpdates}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-arrow-down" />}
          />

          <List.Item title={'Recent Changes'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="newspaper-variant-outline" />}
          />
          {Object.keys(releaseNotes).slice(0, 5).map((release, i) => (
            <ListRow key={i} style={styles.listRow}>

              <Markdown style={styles.markdown}>
                {
`## Release ${release}
${releaseNotes[release].changes.map(c => `* ${c}\n`).join('')}
`
                }
              </Markdown>
            </ListRow>
          ))}

        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}

// ))}
