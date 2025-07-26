/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'react-native-paper'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ScreenContainer from '../../components/ScreenContainer'
import { H2kListItem, H2kListSection } from '../../../ui'
import { SyncServiceDialog } from '../components/SyncServiceDialog'
import { SyncAccountDialog } from '../components/SyncAccountDialog'
import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { selectSettings } from '../../../store/settings'
import { selectFiveSecondsTick } from '../../../store/time'
import { getSyncCounts, resetSyncedStatus } from '../../../store/operations'

import GLOBAL from '../../../GLOBAL'

import { DEFAULT_LOFI_SERVER } from '../../../extensions/data/ham2k-lofi-sync/Ham2KLoFiSyncExtension'

const LOFI_SERVER_LABELS = {
  'https://dev.lofi.ham2k.net': 'Ham2K LoFi (Development)',
  'https://lofi.ham2k.net': 'Ham2K LoFi (Official)'
}

export default function SyncSettingsScreen ({ navigation, splitView }) {
  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
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

  const accountTitle = useMemo(() => {
    if (!lofiData?.account) {
      return `Device not linked! (${GLOBAL.deviceId.slice(0, 8)})`
    } else {
      return `${lofiData?.account?.call} (${lofiData?.account?.uuid.slice(0, 8)})`
    }
  }, [lofiData?.account])

  useEffect(() => {
    console.log('LOFI', lofiData)
  }, [lofiData])

  const accountInfo = useMemo(() => {
    if (lofiData?.account?.email) {
      if (lofiData?.account?.pending_email && lofiData?.account?.pending_email !== lofiData?.account?.email) {
        return `${lofiData?.account?.pending_email} (pending confirmation)`
      } else {
        return `${lofiData?.account?.email} (confirmed)`
      }
    } else if (lofiData?.account?.pending_email) {
      return `${lofiData?.account?.pending_email} (pending confirmation)`
    } else {
      return 'You\'ll need to enter an email for account recovery.'
    }
  }, [lofiData?.account])

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
      setSyncStatus(await syncCountDescription())
    })
  }, [fiveSecondTick])

  const handleResetSyncStatus = useCallback(async () => {
    await resetSyncedStatus()
    setSyncStatus(await syncCountDescription())
  }, [])

  useEffect(() => console.log('LOFI', lofiData), [lofiData])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection title={'Ham2K Log Filer - Sync Server (BETA)'}>
          <H2kListItem
            title="Sync Service"
            description={lofiData?.enabled !== false ? 'Enabled' : 'Disabled'}
            leftIcon="sync-circle"
            rightSwitchValue={lofiData?.enabled !== false}
            rightSwitchOnValueChange={(value) => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: value }))}
            onPress={() => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: !lofiData.enabled }))}
          />
          <H2kListItem
            title={`Account ${accountTitle}`}
            description={accountInfo}
            leftIcon="card-account-details"
            onPress={() => setCurrentDialog('syncAccount')}
          />
          {currentDialog === 'syncAccount' && (
            <SyncAccountDialog
              styles={styles}
              visible={true}
              syncHook={syncHook}
              onDialogDone={() => setCurrentDialog('')}
            />
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
              on the country and currency but will not be more than US$30/year or equivalent, and probably less.
            </Text>
          </View>

        </H2kListSection>
        <H2kListSection title={'This Device'}>
          <H2kListItem
            key={lofiData?.client?.uuid}
            title={lofiData?.client?.name ? `${lofiData?.client?.name} (${lofiData?.client?.uuid?.slice(0, 8) ?? '?'})` : 'Not authenticated'}
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
                description={client.uuid === lofiData?.client?.uuid ? 'This device' : client.uuid.slice(0, 8)}
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
                onDialogDone={() => setCurrentDialog('')}
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
