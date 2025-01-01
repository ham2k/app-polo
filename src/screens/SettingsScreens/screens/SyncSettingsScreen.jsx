/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Switch, Text } from 'react-native-paper'
import { ScrollView, View } from 'react-native'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { SyncServiceDialog } from '../components/SyncServiceDialog'
import { SyncAccountDialog } from '../components/SyncAccountDialog'
import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { selectSettings } from '../../../store/settings'
import { selectFiveSecondsTick } from '../../../store/time'
import { fmtNumber } from '@ham2k/lib-format-tools'
import { getSyncCounts, resetSyncedStatus } from '../../../store/operations'

const LOFI_SERVER_LABELS = {
  'https://dev.lofi.ham2k.net': 'Ham2K LoFi (Development)',
  'https://lofi.ham2k.net': 'Ham2K LoFi (Official)'
}

export default function SyncSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

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
      return 'not set'
    } else {
      return `${lofiData?.account?.call} (${lofiData?.account?.uuid.slice(0, 8)})`
    }
  }, [lofiData?.account])

  const accountInfo = useMemo(() => {
    if (lofiData?.account?.email) {
      if (lofiData?.account?.pending_email && lofiData?.account?.pending_email !== lofiData?.account?.email) {
        return `${lofiData?.account?.pending_email} (pending confirmation)`
      } else {
        return `${lofiData?.account?.email} (confirmed)`
      }
    } else {
      return 'You\'ll need to enter an email for account recovery.'
    }
  }, [lofiData?.account])

  const serverLabel = useMemo(() => {
    return LOFI_SERVER_LABELS[lofiData.server] || `Custom (${lofiData.server})`
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
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection title={'Ham2K Log Filer - Sync Server (BETA)'}>
          <Ham2kListItem
            title="Sync Service"
            description={settings?.extensions?.['ham2k-lofi']?.enabled ? 'Enabled' : 'Disabled'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="sync-circle" />}
            right={() => <Switch value={!!settings?.extensions?.['ham2k-lofi']?.enabled} onValueChange={(value) => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: value })) } />}
            onPress={() => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: !lofiData.enabled }))}
          />
          <Ham2kListItem
            title={`Account ${accountTitle}`}
            description={accountInfo}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="card-account-details" />}
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
              Ham2K LoFi provides a reliable sync service for all your devices and provides a backup
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
              the next couple of months, the service will be free. After that prices will depend
              on the country and currency but will not be more than US$30/year or equivalent, and probably less.
            </Text>
          </View>

        </Ham2kListSection>
        <Ham2kListSection title={'This Device'}>
          <Ham2kListItem
            key={lofiData.client.uuid}
            title={`${lofiData.client.name} (${lofiData.client.uuid.slice(0, 8)})`}
            description={syncStatus}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone" />}
          />
        </Ham2kListSection>

        {(lofiData?.allClients || []).filter(client => client.uuid !== lofiData.client.uuid).length > 0 && (
          <Ham2kListSection title={'Other Devices'}>
            {(lofiData?.allClients || []).filter(client => client.uuid !== lofiData.client.uuid).map((client) => (
              <Ham2kListItem
                key={client.uuid}
                title={client.name}
                description={client.uuid === lofiData.client?.uuid ? 'This device' : client.uuid.slice(0, 8)}
                left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone" />}
              />
            ))}
          </Ham2kListSection>
        )}

        {settings.devMode && (
          <Ham2kListSection title={'Dev Settings'} titleStyle={{ color: styles.colors.devMode }}>
            <Ham2kListItem
              title="LoFi Server"
              description={serverLabel}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} color={styles.colors.devMode} icon="server" />}
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

            <Ham2kListItem
              title="Reset Sync Status"
              description={''}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-remove" color={styles.colors.devMode} />}
              titleStyle={{ color: styles.colors.devMode }}
              descriptionStyle={{ color: styles.colors.devMode }}
              onPress={handleResetSyncStatus}
            />

          </Ham2kListSection>
        )}

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
