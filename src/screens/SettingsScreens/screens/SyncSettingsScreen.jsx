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
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ScreenContainer from '../../components/ScreenContainer'
import { H2kButton, H2kListItem, H2kListSection } from '../../../ui'
import { SyncServiceDialog } from '../components/SyncServiceDialog'
import { SyncAccountDialog } from '../components/SyncAccountDialog'
import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData, setLocalExtensionData, selectLocalData } from '../../../store/local'
import { selectSettings } from '../../../store/settings'
import { selectFiveSecondsTick } from '../../../store/time'
import { clearAllOperationData, getSyncCounts, resetSyncedStatus } from '../../../store/operations'

import GLOBAL from '../../../GLOBAL'

import { DEFAULT_LOFI_SERVER } from '../../../extensions/data/ham2k-lofi-sync/Ham2KLoFiSyncExtension'

const LOFI_SERVER_LABELS = {
  // 'https://dev.lofi.ham2k.net': 'Ham2K LoFi (Development)',
  'https://lofi.ham2k.net': 'Ham2K LoFi (Official)'
}

export default function SyncSettingsScreen ({ navigation, splitView }) {
  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const localData = useSelector(selectLocalData)
  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  const [currentDialog, setCurrentDialog] = useState()

  const syncHook = useMemo(() => {
    return findHooks('sync')[0]
  }, [])

  useEffect(() => {
    if (syncHook) {
      dispatch(syncHook.getAccountData())
    }
  }, [dispatch, syncHook])

  useEffect(() => {
    console.log('LOFI', lofiData)
  }, [lofiData])

  const accountTitle = useMemo(() => {
    if (!lofiData?.account) {
      return `Device not linked! (${GLOBAL.deviceId.slice(0, 8).toUpperCase()})`
    } else {
      if (lofiData?.pending_link_email) {
        return lofiData.pending_link_email
      } else if (lofiData?.account?.pending_email) {
        return lofiData.account.pending_email
      } else if (lofiData?.account?.email) {
        return lofiData.account.email
      } else {
        return `Anonymous Account (#${lofiData?.account?.uuid.slice(0, 8).toUpperCase()})`
      }
    }
  }, [lofiData?.account, lofiData?.pending_link_email])

  const accountInfo = useMemo(() => {
    if (!lofiData?.account) {
      return 'Enable sync to link this device'
    } else {
      if (lofiData?.account?.email) {
        if (lofiData?.pending_link_email && lofiData?.pending_link_email !== lofiData?.account?.email) {
          return '(pending email confirmation)'
        } else if (lofiData?.account?.pending_email && lofiData?.account?.pending_email !== lofiData?.account?.email) {
          return '(pending email confirmation)'
        } else {
          return `Account #${lofiData?.account?.uuid.slice(0, 8).toUpperCase()}`
        }
      } else if (lofiData?.account?.pending_email) {
        return '(pending email confirmation)'
      } else {
        return 'Tap to configure'
      }
    }
  }, [lofiData?.account, lofiData?.pending_link_email])

  const serverLabel = useMemo(() => {
    if (lofiData?.server) {
      return LOFI_SERVER_LABELS[lofiData.server] || `Custom (${lofiData.server})`
    } else {
      return LOFI_SERVER_LABELS[DEFAULT_LOFI_SERVER] || DEFAULT_LOFI_SERVER
    }
  }, [lofiData.server])

  const fiveSecondTick = useSelector(selectFiveSecondsTick)
  const [syncStatus, setSyncStatus] = useState()
  useEffect(() => {
    setImmediate(async () => {
      dispatch(syncHook.getAccountData())
      setSyncStatus(await syncCountDescription())
    })
  }, [dispatch, fiveSecondTick, syncHook])

  const handleResetSyncStatus = useCallback(async () => {
    await dispatch(resetSyncedStatus())
    setSyncStatus(await syncCountDescription())
  }, [dispatch])

  const askAboutMergingAccounts = useMemo(() => {
    return lofiData?.account?.uuid && localData?.sync?.lastSyncAccountUUID && (lofiData.account.uuid !== localData.sync.lastSyncAccountUUID)
  }, [lofiData?.account?.uuid, localData?.sync?.lastSyncAccountUUID])

  const handleReplaceLocalData = useCallback(async () => {
    Alert.alert(
      'Replace Local Data?',
      'Are you sure you want to replace all local data with the operations and QSOs from the new account?\n\nThe app will restart.\n\n If you have unsynced data, it will be lost.',
      [
        { text: 'No, Cancel', onPress: () => {} },
        {
          text: 'Yes, Replace It All!',
          onPress: async () => {
            await dispatch(setLocalExtensionData({ key: 'ham2k-lofi', pending_link_email: undefined }))
            setTimeout(async () => {
              await dispatch(clearAllOperationData())
            }, 1000)
          }
        }
      ]
    )
  }, [dispatch])

  const handleCombineLocalData = useCallback(async () => {
    Alert.alert('Combine Local Data?', 'Are you sure you want to combine these operations and QSOs into the new account? This operation cannot be undone.', [
      { text: 'No, Cancel', onPress: () => {} },
      {
        text: 'Yes, Combine Them!',
        onPress: async () => {
          await dispatch(setLocalExtensionData({ key: 'ham2k-lofi', pending_link_email: undefined }))
          await dispatch(resetSyncedStatus())
        }
      }
    ])
  }, [dispatch])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection title={'Cloud Sync: Ham2K Log Filer (PRE-ALPHA)'}>
          <H2kListItem
            title="Sync Service"
            description={lofiData?.enabled !== false ? 'Enabled' : 'Disabled'}
            leftIcon="sync-circle"
            rightSwitchValue={lofiData?.enabled !== false}
            rightSwitchOnValueChange={(value) => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: value }))}
            onPress={() => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: !lofiData.enabled }))}
          />
          <H2kListItem
            title={accountTitle}
            description={accountInfo}
            leftIcon="card-account-details"
            onPress={() => setCurrentDialog('syncAccount')}
          />
          {currentDialog === 'syncAccount' && (
            <SyncAccountDialog
              styles={styles}
              visible={true}
              syncHook={syncHook}
              onDialogDone={() => {
                setCurrentDialog('')
                setImmediate(async () => {
                  setSyncStatus(await syncCountDescription())
                  if (syncHook) {
                    dispatch(syncHook.getAccountData())
                  }
                })
              }}
            />
          )}

          {askAboutMergingAccounts && (
            <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, flexDirection: 'column', marginBottom: styles.oneSpace * 4 }}>
              <Text style={[styles.paragraph, { color: styles.colors.error }]}>
                This device was last synced with a different account (#{localData.sync.lastSyncAccountUUID.slice(0, 8).toUpperCase()}).
              </Text>
              <Text style={[styles.paragraph, { color: styles.colors.error }]}>
                In order to continue syncing, you need to decide betwee the following options:
              </Text>

              <H2kButton mode="contained" style={{ marginTop: styles.oneSpace * 2 }} onPress={handleReplaceLocalData}>Replace local data with the new account</H2kButton>

              <H2kButton mode="contained" style={{ marginTop: styles.oneSpace * 2 }} onPress={handleCombineLocalData}>Combine local data into the new account</H2kButton>
            </View>
          )}

          <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, flexDirection: 'column' }}>
            <Text style={styles.paragraph}>
              Ham2K LoFi offers a reliable sync service between all your devices and provides a backup
              for your operation data in the cloud.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.text.bold}>Basic service is free</Text> and allows you to sync recent
              data (up to 7 days) between two devices or apps.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.text.bold}>Full service requires a paid subscription</Text> and
              includes all your operations synced between any reasonable number of devices or apps.
            </Text>
            <Text style={styles.paragraph}>
              While the LoFi service is in BETA for
              the next couple of months, the service will remain free. After that prices will depend
              on the country and currency but should not be more than US$30/year or equivalent, and probably less.
            </Text>
          </View>

        </H2kListSection>
        <H2kListSection title={'This Device'}>
          <H2kListItem
            key={lofiData?.client?.uuid}
            title={lofiData?.client?.name ? `${lofiData?.client?.name} (${lofiData?.client?.uuid?.slice(0, 8)?.toUpperCase() ?? '?'})` : 'Not authenticated'}
            description={syncStatus}
            leftIcon="cellphone"
          />
        </H2kListSection>

        {(lofiData?.allClients || []).filter(client => client.uuid !== lofiData?.client?.uuid).length > 0 && (
          <H2kListSection title={'Other Devices'}>
            {(lofiData?.allClients || []).filter(client => client.uuid !== lofiData?.client?.uuid).map((client) => (
              <H2kListItem
                key={client.uuid}
                title={client.name}
                description={client.uuid === lofiData?.client?.uuid ? 'This device' : client.uuid.slice(0, 8)?.toUpperCase()}
                leftIcon="cellphone"
              />
            ))}
          </H2kListSection>
        )}

        {settings.devMode && (
          <H2kListSection title={'Dev Settings'} titleStyle={{ color: styles.colors.devMode }}>
            <H2kListItem
              title="LoFi Server"
              description={serverLabel}
              leftIcon="server"
              leftIconColor={styles.colors.devMode}
              onPress={() => setCurrentDialog('ham2k-lofi')}
              titleStyle={{ color: styles.colors.devMode }}
              descriptionStyle={{ color: styles.colors.devMode }}
            />
            {currentDialog === 'ham2k-lofi' && (
              <SyncServiceDialog
                settings={settings}
                styles={styles}
                visible={true}
                onDialogDone={() => {
                  setCurrentDialog('')
                  setImmediate(async () => {
                    if (syncHook) {
                      dispatch(syncHook.getAccountData())
                    }
                    setSyncStatus(await syncCountDescription())
                  })
                }}
              />
            )}

            <H2kListItem
              title="Reset Sync Status"
              description={''}
              leftIcon="cellphone-remove"
              leftIconColor={styles.colors.devMode}
              titleStyle={{ color: styles.colors.devMode }}
              descriptionStyle={{ color: styles.colors.devMode }}
              onPress={handleResetSyncStatus}
            />

          </H2kListSection>
        )}

        <View style={{ height: safeAreaInsets.bottom }} />

      </ScrollView>
    </ScreenContainer>
  )
}

async function syncCountDescription () {
  const counts = await getSyncCounts()

  return [
    `Operations: ${fmtNumber(counts?.operations?.synced || 0)} synced, ${fmtNumber(counts?.operations?.pending || 0)} pending`,
    `QSOs: ${fmtNumber(counts?.qsos?.synced || 0)} synced, ${fmtNumber(counts?.qsos?.pending || 0)} pending`
  ].join('\n')
}
