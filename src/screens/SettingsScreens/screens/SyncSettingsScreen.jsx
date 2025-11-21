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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ScreenContainer from '../../components/ScreenContainer'
import { H2kButton, H2kListItem, H2kListSection } from '../../../ui'
import { SyncServiceDialog } from '../components/SyncServiceDialog'
import { SyncAccountDialog } from '../components/SyncAccountDialog'
import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData, setLocalExtensionData, selectLocalData, setLocalData } from '../../../store/local'
import { selectSettings } from '../../../store/settings'
import { clearMatchingNotices } from '../../../store/system'
import { selectFiveSecondsTick } from '../../../store/time'
import { clearAllOperationData, getSyncCounts, resetSyncedStatus } from '../../../store/operations'

import GLOBAL from '../../../GLOBAL'

import { DEFAULT_LOFI_SERVER } from '../../../extensions/data/ham2k-lofi-sync/Ham2KLoFiSyncExtension'
import SyncProgress from '../../HomeScreen/components/SyncProgress'

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
    console.log('LOFI', lofiData)
  }, [lofiData])

  const fiveSecondTick = useSelector(selectFiveSecondsTick)
  const [syncStatus, setSyncStatus] = useState()
  useEffect(() => {
    if (!currentDialog) {
      setImmediate(async () => {
        dispatch(syncHook.getAccountData())
        setSyncStatus(await _syncCountDescription())
      })
    }
  }, [currentDialog, dispatch, fiveSecondTick, syncHook])

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
          return '(check your email inbox for confirmation)'
        } else if (lofiData?.account?.pending_email && lofiData?.account?.pending_email !== lofiData?.account?.email) {
          return '(check your email inbox for confirmation)'
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

  useEffect(() => {
    if (currentDialog) {
      GLOBAL.syncEnabled = false
    } else {
      GLOBAL.syncEnabled = true
    }
  }, [currentDialog])

  const handleResetSyncStatus = useCallback(async () => {
    await dispatch(resetSyncedStatus())
    setSyncStatus(await _syncCountDescription())
  }, [dispatch])

  const askAboutMergingAccounts = useMemo(() => {
    return lofiData?.account?.uuid && localData?.sync?.lastSyncAccountUUID && (lofiData.account.uuid !== localData.sync.lastSyncAccountUUID)
  }, [lofiData?.account?.uuid, localData?.sync?.lastSyncAccountUUID])

  const serverLabel = useMemo(() => {
    if (lofiData?.server) {
      return LOFI_SERVER_LABELS[lofiData.server] || `Custom (${lofiData.server})`
    } else {
      return LOFI_SERVER_LABELS[DEFAULT_LOFI_SERVER] || DEFAULT_LOFI_SERVER
    }
  }, [lofiData.server])

  const serverCountDescription = useMemo(() => {
    return _cloudCountDescription(lofiData?.operations, lofiData?.qsos)
  }, [lofiData?.operations, lofiData?.qsos])

  const handleReplaceLocalData = useCallback(async () => {
    Alert.alert(
      'Replace Local Data?',
      'Are you sure you want to replace all data on this device ' +
      'with the operations and QSOs for the new account from the Sync Service?' +
      '\n\n' +
      'The app will restart.' +
      '\n\n' +
      'If you have unsynced data, IT WILL BE LOST.',
      [
        { text: 'No, Cancel', onPress: () => {} },
        {
          text: 'Yes, I\'ll take the risk! Replace It All!',
          style: 'destructive',
          onPress: async () => {
            dispatch(setLocalExtensionData({ key: 'ham2k-lofi', pending_link_email: undefined }))
            dispatch(clearMatchingNotices({ uniquePrefix: 'sync:' }))
            await dispatch(clearAllOperationData())
          }
        }
      ]
    )
  }, [dispatch])

  const handleCombineLocalData = useCallback(async () => {
    Alert.alert('Combine Local Data?',
      'Are you sure you want to combine these operations and QSOs with the new account?' +
      '\n\n' +
      'This will combine QSOs on this device with what\'s already in the Sync Service for the new account, ' +
      'and can accidentally result in mixing unrelated logs!' +
      '\n\n' +
      'This operation cannot be undone.',
      [
        { text: 'No, Cancel', onPress: () => {} },
        {
          text: 'Yes, I\'ll take the risk! Combine Them!',
          style: 'destructive',
          onPress: async () => {
            dispatch(setLocalExtensionData({ key: 'ham2k-lofi', pending_link_email: undefined }))
            dispatch(clearMatchingNotices({ uniquePrefix: 'sync:' }))
            await dispatch(resetSyncedStatus())
            dispatch(setLocalData({ sync: { lastSyncAccountUUID: undefined } }))
          }
        }
      ])
  }, [dispatch])

  const handleLinkBack = useCallback(async () => {
    if (lofiData.previousAccount?.email) {
      const linkResult = await dispatch(syncHook.linkClient(lofiData.previousAccount.email))
      if (linkResult.ok) {
        dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: linkResult.json.account, pending_link_email: lofiData.previousAccount.email }))
        dispatch(clearMatchingNotices({ uniquePrefix: 'sync:' }))
        // await dispatch(resetSyncedStatus())
        // dispatch(setLocalData({ sync: { lastSyncAccountUUID: undefined } }))
      } else {
        Alert.alert('Error linking back to previous account', linkResult.json.error)
      }
    }
  }, [dispatch, lofiData.previousAccount?.email, syncHook])

  const handleDialogDone = useCallback(() => {
    setCurrentDialog('')
    setImmediate(async () => {
      setSyncStatus(await _syncCountDescription())
      if (syncHook) {
        dispatch(syncHook.getAccountData())
      }
    })
  }, [dispatch, syncHook])

  const progressWrapper = useMemo(() => {
    return ({ children }) => (
      <SafeAreaView
        edges={['bottom', 'left', 'right'].filter(x => x)}
        style={{ flex: 0, flexDirection: 'column', width: '100%', backgroundColor: styles.colors.primary }}
      >
        <View style={{ marginTop: styles.oneSpace }}>{children}</View>
      </SafeAreaView>
    )
  }, [styles.oneSpace, styles.colors.primary])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection title={'Cloud Sync: Ham2K Log Filer (ALPHA)'}>
          <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, flexDirection: 'column' }}>
            <Text style={styles.paragraph}>
              Ham2K LoFi offers a reliable sync service between all your devices and provides a backup
              for your operation data in the cloud.
            </Text>
          </View>
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
              onDialogDone={handleDialogDone}
            />
          )}

          {askAboutMergingAccounts && (
            <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, flexDirection: 'column', marginBottom: styles.oneSpace * 4 }}>
              <Text style={[styles.paragraph, styles.text.bold, { color: styles.colors.error }]}>
                This device was last synced with a different account (#{localData.sync.lastSyncAccountUUID.slice(0, 8).toUpperCase()}).
              </Text>
              <Text style={[styles.paragraph, styles.text.bold, { color: styles.colors.error }]}>
                In order to continue syncing, you need to decide between the following options:
              </Text>

              <Text style={[styles.paragraph, { marginTop: styles.oneSpace * 1 }]}>
                {lofiData?.account?.email ? (
                  <><Text style={styles.text.bold}>Option #1:</Text> Replace data on this device with that from the <Text style={styles.text.bold}>{lofiData?.account?.email}</Text> account on the server.</>
                ) : (
                  <><Text style={styles.text.bold}>Option #1:</Text> Replace data on this device with that from the new account on the server. </>
                )}
              </Text>
              <H2kButton mode="contained" style={{ marginBottom: styles.oneSpace * 1 }} onPress={handleReplaceLocalData}>Go with #1: replace with server data</H2kButton>

              <Text style={[styles.paragraph, { marginTop: styles.oneSpace * 1 }]}>
                {lofiData?.account?.email ? (
                  <><Text style={styles.text.bold}>Option #2:</Text> Combine data on this device with what's already on the server for <Text style={styles.text.bold}>{lofiData?.account?.email}</Text>.</>
                ) : (
                  <><Text style={styles.text.bold}>Option #2:</Text> Combine data on this device with what's already on the server for the new account. </>
                )}
              </Text>
              <H2kButton mode="contained" style={{ marginBottom: styles.oneSpace * 1 }} onPress={handleCombineLocalData}>Go with #2: combine data</H2kButton>

              {lofiData?.previousAccount?.email && (
                <>
                  <Text style={[styles.paragraph, { marginTop: styles.oneSpace * 1 }]}>
                    <Text style={styles.text.bold}>Option #3:</Text> Link back with the previous account, <Text style={styles.text.bold}>{lofiData?.previousAccount?.email}</Text>.
                  </Text>
                  <H2kButton mode="contained" style={{ marginBottom: styles.oneSpace * 1 }} onPress={handleLinkBack}>Go with #3: previous account</H2kButton>
                </>
              )}
            </View>
          )}

          <H2kListItem
            title={`${lofiData?.subscription?.plan?.name ?? 'No Active Plan'}`}
            description={lofiData?.subscription?.plan?.description ?? ''}
            leftIcon="calendar-clock"
            onPress={() => null}
          />

          <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, flexDirection: 'column' }}>
            <Text style={styles.paragraph}>
              <Text style={styles.text.bold}>Basic service is free</Text> and allows you to sync recent
              data (up to 7 days) between two devices or apps at limited speed.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.text.bold}>Full service requires a paid subscription</Text> and
              includes all your operations synced between any reasonable number of devices or apps at full speed.
            </Text>
            <Text style={styles.paragraph}>
              While the LoFi service is in its TESTING PERIOD for
              the next couple of months, the service will remain free.
              After that prices will depend on the country and currency
              but should not be more than US$30/year or equivalent, and probably less.
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

        <H2kListSection title={'LoFi Server'}>
          <H2kListItem
            key={'lofi-server'}
            title={serverLabel}
            description={serverCountDescription}
            leftIcon="cloud-sync-outline"
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
                onDialogDone={handleDialogDone}
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

      <SyncProgress
        wrapper={progressWrapper}
      />

    </ScreenContainer>
  )
}

async function _syncCountDescription () {
  const counts = await getSyncCounts()

  return [
    `Operations: ${fmtNumber(counts?.operations?.synced || 0)} synced, ${fmtNumber(counts?.operations?.pending || 0)} pending`,
    `QSOs: ${fmtNumber(counts?.qsos?.synced || 0)} synced, ${fmtNumber(counts?.qsos?.pending || 0)} pending`
  ].join('\n')
}

function _cloudCountDescription (operations, qsos) {
  if (!operations || !qsos || (operations?.total === 0 && qsos?.total === 0)) {
    return 'No data stored'
  }

  const parts = []
  if (operations?.total === operations?.syncable) {
    parts.push(`Operations: ${fmtNumber(operations?.total || 0)} stored`)
  } else {
    parts.push(`Operations: ${fmtNumber(operations?.total || 0)} stored, ${fmtNumber(operations?.syncable || 0)} syncable`)
  }
  if (qsos?.total === qsos?.syncable) {
    parts.push(`QSOs: ${fmtNumber(qsos?.total || 0)} stored`)
  } else {
    parts.push(`QSOs: ${fmtNumber(qsos?.total || 0)} stored, ${fmtNumber(qsos?.syncable || 0)} syncable`)
  }
  return parts.join('\n')
}
