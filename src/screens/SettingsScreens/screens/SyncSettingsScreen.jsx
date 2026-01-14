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
import { useTranslation } from 'react-i18next'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { H2kButton, H2kListItem, H2kListSection, H2kMarkdown } from '../../../ui'
import ScreenContainer from '../../components/ScreenContainer'
import { SyncServiceDialog } from '../components/SyncServiceDialog'
import { SyncAccountDialog } from '../components/SyncAccountDialog'
import SyncProgress from '../../HomeScreen/components/SyncProgress'
import { findHooks } from '../../../extensions/registry'
import { DEFAULT_LOFI_SERVER } from '../../../extensions/data/ham2k-lofi-sync/Ham2KLoFiSyncExtension'
import { selectLocalExtensionData, setLocalExtensionData, selectLocalData } from '../../../store/local'
import { selectSettings } from '../../../store/settings'
import { clearMatchingNotices } from '../../../store/system'
import { selectFiveSecondsTick, startTickTock, stopTickTock } from '../../../store/time'
import { getSyncCounts, resetSyncedStatus } from '../../../store/operations'
import { prepareSyncToReplaceLocalData, prepareSyncToCombineLocalData } from '../../../store/sync'

import { SyncSettingsForDistribution } from '../../../distro'
import GLOBAL from '../../../GLOBAL'

const LOFI_SERVER_LABELS = {
  // 'https://dev.lofi.ham2k.net': 'Ham2K LoFi (Development)',
  'https://lofi.ham2k.net': 'Ham2K LoFi (Official)'
}

export default function SyncSettingsScreen ({ navigation, splitView }) {
  const { t } = useTranslation()

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

  useEffect(() => { // Ensure the clock is ticking
    dispatch(startTickTock())
    return () => dispatch(stopTickTock())
  }, [dispatch])

  const fiveSecondTick = useSelector(selectFiveSecondsTick)

  const [counts, setCounts] = useState()
  useEffect(() => {
    if (!currentDialog) {
      setImmediate(async () => {
        console.log('refreshing data')
        dispatch(syncHook.getAccountData())
        setCounts(await getSyncCounts())
      })
    }
  }, [currentDialog, dispatch, fiveSecondTick, syncHook, t])

  const accountTitle = useMemo(() => {
    const id = lofiData?.account?.uuid.slice(0, 8).toUpperCase()
    if (!lofiData?.account) {
      return t('screens.syncSettings.deviceNotLinked', 'Device not linked! ({{id}})', { id })
    } else {
      if (lofiData?.pending_link_email) {
        return lofiData.pending_link_email
      } else if (lofiData?.account?.pending_email) {
        return lofiData.account.pending_email
      } else if (lofiData?.account?.email) {
        return lofiData.account.email
      } else {
        return t('screens.syncSettings.anonymousAccount', 'Anonymous Account (#{{id}})', { id })
      }
    }
  }, [lofiData.account, lofiData.pending_link_email, t])

  const accountInfo = useMemo(() => {
    if (!lofiData?.account) {
      return t('screens.syncSettings.enableSyncToLinkDevice', 'Enable sync to link this device')
    } else {
      if (lofiData?.account?.email) {
        if (lofiData?.pending_link_email && lofiData?.pending_link_email !== lofiData?.account?.email) {
          return t('screens.syncSettings.checkEmailInboxForConfirmation', '(check your email inbox for confirmation)')
        } else if (lofiData?.account?.pending_email && lofiData?.account?.pending_email !== lofiData?.account?.email) {
          return t('screens.syncSettings.checkEmailInboxForConfirmation', '(check your email inbox for confirmation)')
        } else {
          return t('screens.syncSettings.accountNumber', 'Account #{{id}}', { id: lofiData?.account?.uuid.slice(0, 8).toUpperCase() })
        }
      } else if (lofiData?.account?.pending_email) {
        return t('screens.syncSettings.pendingEmailConfirmation', '(pending email confirmation)')
      } else {
        return t('screens.syncSettings.tapToConfigure', 'Tap to configure')
      }
    }
  }, [lofiData.account, lofiData.pending_link_email, t])

  useEffect(() => {
    if (currentDialog) {
      GLOBAL.syncEnabled = false
    } else {
      GLOBAL.syncEnabled = true
    }
  }, [currentDialog])

  const askAboutMergingAccounts = useMemo(() => {
    if (lofiData?.account?.uuid && localData?.sync?.lastSyncAccountUUID && (lofiData.account.uuid !== localData.sync.lastSyncAccountUUID)) {
      if (lofiData?.account?.operations?.total === 0 && lofiData?.account?.qsos?.total === 0) {
        return false
      }

      if (counts?.qsos?.total === 0 && counts?.operations?.total > 0) {
        return false
      }

      return true
    }
  }, [
    lofiData.account?.uuid, lofiData.account?.operations?.total, lofiData.account?.qsos?.total,
    localData.sync?.lastSyncAccountUUID,
    counts?.qsos?.total, counts?.operations?.total
  ])

  const serverLabel = useMemo(() => {
    if (lofiData?.server) {
      return t(`screens.syncSettings.serverLabels.${lofiData.server}`, LOFI_SERVER_LABELS[lofiData.server] || 'screens.syncSettings.customServer', 'Custom ({{server}})', { server: lofiData.server })
    } else {
      return t(`screens.syncSettings.serverLabels.${DEFAULT_LOFI_SERVER}`, LOFI_SERVER_LABELS[DEFAULT_LOFI_SERVER] || DEFAULT_LOFI_SERVER)
    }
  }, [lofiData.server, t])

  const serverCountDescription = useMemo(() => {
    return _cloudCountDescription({ operations: lofiData?.operations, qsos: lofiData?.qsos, t })
  }, [lofiData?.operations, lofiData?.qsos, t])

  const handleReplaceLocalData = useCallback(async () => {
    Alert.alert(
      t('screens.syncSettings.replaceDataAlert.title', 'Replace Local Data?'),
      t('screens.syncSettings.replaceDataAlert.text', `Are you sure you want to replace all data on this device with the operations and QSOs for the new account from the Sync Service?

The app will restart.

If you have unsynced data, IT WILL BE LOST.`),
      [
        { text: t('screens.syncSettings.replaceDataAlert.buttonCancel', 'No, Cancel'), onPress: () => {} },
        {
          text: t('screens.syncSettings.replaceDataAlert.buttonProcees', 'Yes, I\'ll take the risk! Replace It All!'),
          style: 'destructive',
          onPress: async () => {
            await prepareSyncToReplaceLocalData({ dispatch })
          }
        }
      ]
    )
  }, [dispatch, t])

  // TODO: Make this reset trigger a full sync, not just upload
  const handleResetSyncStatus = useCallback(async () => {
    await dispatch(resetSyncedStatus())
    setCounts(await getSyncCounts())
  }, [dispatch])

  const handleCombineLocalData = useCallback(async () => {
    Alert.alert(t('screens.syncSettings.combineDataAlert.title', 'Combine Local Data?'),
      t('screens.syncSettings.combineDataAlert.text', `Are you sure you want to combine these operations and QSOs with the new account?

This will combine QSOs on this device with what's already in the Sync Service for the new account, and can accidentally result in mixing unrelated logs!

This operation cannot be undone.`),
      [
        { text: t('screens.syncSettings.combineDataAlert.buttonCancel', 'No, Cancel'), onPress: () => {} },
        {
          text: t('screens.syncSettings.combineDataAlert.buttonText', 'Yes, I\'ll take the risk! Combine Them!'),
          style: 'destructive',
          onPress: async () => {
            await prepareSyncToCombineLocalData({ dispatch })
          }
        }
      ])
  }, [dispatch, t])

  const handleLinkBack = useCallback(async () => {
    if (lofiData.previousAccount?.email) {
      const linkResult = await dispatch(syncHook.linkClient(lofiData.previousAccount.email))
      if (linkResult.ok) {
        dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: linkResult.json.account, pending_link_email: lofiData.previousAccount.email }))
        dispatch(clearMatchingNotices({ uniquePrefix: 'sync:' }))
        // await dispatch(resetSyncedStatus())
        // dispatch(setLocalData({ sync: { lastSyncAccountUUID: undefined } }))
      } else {
        Alert.alert(
          t('screens.syncSettings.linkBackErrorAlert.title', 'Error Linking Back to Previous Account'),
          t('screens.syncSettings.linkBackErrorAlert.text', `An error occurred while linking back to the previous account.

{{error}}

Please try again later.`, { error: linkResult.json.error })
        )
      }
    }
  }, [dispatch, lofiData.previousAccount?.email, syncHook, t])

  const handleDialogDone = useCallback(() => {
    setCurrentDialog('')
    setImmediate(async () => {
      setCounts(await getSyncCounts())
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
        <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, flexDirection: 'column' }}>
          <Text style={styles.paragraph}>
            {t('screens.syncSettings.description', 'Ham2K LoFi offers a reliable sync service between all your devices and provides a backup for your operation data in the cloud.')}
          </Text>
        </View>
        <H2kListItem
          title={t('screens.syncSettings.syncService', 'Sync Service')}
          description={lofiData?.enabled !== false ? t('screens.syncSettings.syncService.enabled', 'Enabled') : t('screens.syncSettings.syncService.disabled', 'Disabled')}
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
            <H2kMarkdown style={[styles.paragraph, styles.text.bold, { color: styles.colors.error }]}>
              {t('screens.syncSettings.askAboutMergingAccounts.warning-md', { id: localData.sync.lastSyncAccountUUID.slice(0, 8).toUpperCase() })}
            </H2kMarkdown>
            <H2kMarkdown style={[styles.paragraph, { marginTop: styles.oneSpace * 1 }]}>
              {lofiData?.account?.email ? (
                t('screens.syncSettings.askAboutMergingAccounts.option1withEmail-md', { email: lofiData?.account?.email })
              ) : (
                t('screens.syncSettings.askAboutMergingAccounts.option1noEmail-md', 'Option #1: Replace data on this device with that from the new account on the server.')
              )}
            </H2kMarkdown>
            <H2kButton mode="contained" style={{ marginBottom: styles.oneSpace * 1 }} onPress={handleReplaceLocalData}>{t('screens.syncSettings.askAboutMergingAccounts.option1button', 'Go with #1: replace with server data')}</H2kButton>

            <H2kMarkdown style={[styles.paragraph, { marginTop: styles.oneSpace * 1 }]}>
              {lofiData?.account?.email ? (
                t('screens.syncSettings.askAboutMergingAccounts.option2withEmail-md', { email: lofiData?.account?.email })
              ) : (
                t('screens.syncSettings.askAboutMergingAccounts.option2noEmail-md', 'Option #2: Combine data on this device with that from the new account on the server.')
              )}
            </H2kMarkdown>
            <H2kButton mode="contained" style={{ marginBottom: styles.oneSpace * 1 }} onPress={handleCombineLocalData}>{t('screens.syncSettings.askAboutMergingAccounts.option2button', 'Go with #2: combine data')}</H2kButton>

            {lofiData?.previousAccount?.email && (
              <>
                <H2kMarkdown style={[styles.paragraph, { marginTop: styles.oneSpace * 1 }]}>
                  {t('screens.syncSettings.askAboutMergingAccounts.option3-md', { email: lofiData?.previousAccount?.email })}
                </H2kMarkdown>
                <H2kButton mode="contained" style={{ marginBottom: styles.oneSpace * 1 }} onPress={handleLinkBack}>{t('screens.syncSettings.askAboutMergingAccounts.option3button', 'Go with #3: previous account')}</H2kButton>
              </>
            )}
          </View>
        )}

        <H2kListItem
          title={`${lofiData?.subscription?.plan?.name ?? t('screens.syncSettings.noActivePlan', 'No Active Plan')}`}
          description={t(`screens.syncSettings.plans.${lofiData?.subscription?.plan?.slug}`, lofiData?.subscription?.plan?.description ?? '')}
          leftIcon="calendar-clock"
          onPress={() => null}
        />

        <SyncSettingsForDistribution settings={settings} styles={styles} />

        <H2kListSection title={t('screens.syncSettings.thisDevice', 'This Device')}>
          <H2kListItem
            key={lofiData?.client?.uuid}
            title={lofiData?.client?.name ? `${lofiData?.client?.name} (${lofiData?.client?.uuid?.slice(0, 8)?.toUpperCase() ?? '?'})` : t('screens.syncSettings.notAuthenticated', 'Not authenticated')}
            description={
              [
                t(
                  'screens.syncSettings.syncCountDescription.operations', 'Operations: {{synced}} synced, {{pending}} pending',
                  { synced: fmtNumber(counts?.operations?.synced || 0), pending: fmtNumber(counts?.operations?.pending || 0) }
                ),
                t(
                  'screens.syncSettings.syncCountDescription.qsos', 'QSOs: {{synced}} synced, {{pending}} pending',
                  { synced: fmtNumber(counts?.qsos?.synced || 0), pending: fmtNumber(counts?.qsos?.pending || 0) }
                )
              ].join('\n')
            }
            leftIcon="cellphone"
          />
        </H2kListSection>

        <H2kListSection title={t('screens.syncSettings.lofiServer', 'LoFi Server')}>
          <H2kListItem
            key={'lofi-server'}
            title={serverLabel}
            description={serverCountDescription}
            leftIcon="cloud-sync-outline"
          />
        </H2kListSection>

        {(lofiData?.allClients || []).filter(client => client.uuid !== lofiData?.client?.uuid).length > 0 && (
          <H2kListSection title={t('screens.syncSettings.otherDevices', 'Other Devices')}>
            {(lofiData?.allClients || []).filter(client => client.uuid !== lofiData?.client?.uuid).map((client) => (
              <H2kListItem
                key={client.uuid}
                title={client.name}
                description={client.uuid === lofiData?.client?.uuid ? t('screens.syncSettings.thisDevice', 'This device') : client.uuid.slice(0, 8)?.toUpperCase()}
                leftIcon="cellphone"
              />
            ))}
          </H2kListSection>
        )}

        {settings.devMode && (
          <H2kListSection title={t('screens.syncSettings.devSettings', 'Dev Settings')} titleStyle={{ color: styles.colors.devMode }}>
            <H2kListItem
              title={t('screens.syncSettings.lofiServer', 'LoFi Server')}
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
              title={t('screens.syncSettings.resetSyncStatus', 'Reset Sync Status')}
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

function _cloudCountDescription ({ operations, qsos, t }) {
  if (!operations || !qsos || (operations?.total === 0 && qsos?.total === 0)) {
    return t('screens.syncSettings.noDataStored', 'No data stored')
  }

  const parts = []
  if (operations?.total === operations?.syncable) {
    parts.push(t('screens.syncSettings.cloudCountDescription.operations', 'Operations: {{total}} total', { total: fmtNumber(operations?.total || 0) }))
  } else {
    parts.push(t('screens.syncSettings.cloudCountDescription.operationsSyncable', 'Operations: {{total}} stored, {{syncable}} syncable', { total: fmtNumber(operations?.total || 0), syncable: fmtNumber(operations?.syncable || 0) }))
  }
  if (qsos?.total === qsos?.syncable) {
    parts.push(t('screens.syncSettings.cloudCountDescription.qsos', 'QSOs: {{total}} stored', { total: fmtNumber(qsos?.total || 0) }))
  } else {
    parts.push(t('screens.syncSettings.cloudCountDescription.qsosSyncable', 'QSOs: {{total}} stored, {{syncable}} syncable', { total: fmtNumber(qsos?.total || 0), syncable: fmtNumber(qsos?.syncable || 0) }))
  }
  return parts.join('\n')
}
