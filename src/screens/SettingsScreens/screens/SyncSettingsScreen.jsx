/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dialog, List, Switch, Text } from 'react-native-paper'
import { ScrollView, View } from 'react-native'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectExtensionSettings, selectSettings, setExtensionSettings } from '../../../store/settings'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { SyncServiceDialog } from '../components/SyncServiceDialog'
import { SyncEmailDialog } from '../components/SyncEmailDialog'
import { findHooks } from '../../../extensions/registry'

const LOFI_SERVER_LABELS = {
  'https://dev.lofi.ham2k.net': 'Ham2K LoFi (Development)',
  'https://lofi.ham2k.net': 'Ham2K LoFi (Official)'
}

export default function SyncSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const lofiSettings = useSelector(state => selectExtensionSettings(state, 'ham2k-lofi'))

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
    return `${lofiSettings?.account?.call} • ${lofiSettings?.account?.uuid.slice(0, 8)}`
  }, [lofiSettings?.account])

  const accountInfo = useMemo(() => {
    if (lofiSettings?.account?.email) {
      if (lofiSettings?.account?.pending_email && lofiSettings?.account?.pending_email !== lofiSettings?.account?.email) {
        return `${lofiSettings?.account?.pending_email} (pending confirmation)`
      } else {
        return `${lofiSettings?.account?.email} (confirmed)`
      }
    } else {
      return 'No email configured!'
    }
  }, [lofiSettings?.account])

  const serverLabel = useMemo(() => {
    return LOFI_SERVER_LABELS[lofiSettings.server] || `Custom (${lofiSettings.server})`
  }, [lofiSettings.server])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection title={'Ham2K Log Filer - Sync Server'}>
          <Ham2kListItem
            title="Sync Service"
            description={settings?.extensions?.['ham2k-lofi']?.enabled ? 'Enabled' : 'Disabled'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="sync-circle" />}
            right={() => <Switch value={!!settings?.extensions?.['ham2k-lofi']?.enabled} onValueChange={(value) => dispatch(setExtensionSettings({ key: 'ham2k-lofi', enabled: value })) } />}
            onPress={() => dispatch(setExtensionSettings({ key: 'ham2k-lofi', enabled: !lofiSettings.enabled }))}
          />
          <View style={{ margin: styles.oneSpace * 2, flexDirection: 'column' }}>
            <Text style={styles.paragraph}>
              Ham2K LoFi provides a reliable sync service for all your devices and provides a backup for all your operation data in the cloud.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.text.bold}>Basic service is free</Text> and allows you to sync recent data (up to 7 days) between two devices or apps.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.text.bold}>Full service requires a paid subscription</Text> and includes unlimited data sync between any number of devices or apps.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.text.bold}>Pricing: </Text> $19.99/year (or $1.99/month)
            </Text>
          </View>

          <Ham2kListItem
            title={`Account ${accountTitle}`}
            description={accountInfo}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="card-account-details" />}
            onPress={() => setCurrentDialog('syncEmail')}
          />
          {currentDialog === 'syncEmail' && (
            <SyncEmailDialog
              styles={styles}
              visible={true}
              syncHook={syncHook}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}

          {settings.devMode && (
            <>
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
            </>
          )}
        </Ham2kListSection>

      </ScrollView>
    </ScreenContainer>
  )
}
