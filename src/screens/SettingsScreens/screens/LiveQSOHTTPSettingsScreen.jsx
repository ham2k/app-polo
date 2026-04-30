/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { mergeSettings, selectSettings } from '../../../store/settings'
import { normalizeLiveQSOURL, selectLiveQSOHTTPSettings, sendLiveQSOHTTPTest, summarizeLiveQSOURL } from '../../../store/liveQSO'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kListSection, H2kText, H2kTextInput } from '../../../ui'

export default function LiveQSOHTTPSettingsScreen ({ splitView }) {
  const { t } = useTranslation()

  const safeAreaInsets = useSafeAreaInsets()
  const styles = useThemedStyles()
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()

  const httpSettings = selectLiveQSOHTTPSettings(settings)

  const [urlDialogVisible, setURLDialogVisible] = useState(false)
  const [draftURL, setDraftURL] = useState(httpSettings.url)

  useEffect(() => {
    setDraftURL(httpSettings.url)
  }, [httpSettings.url])

  const mergeHTTPSettings = useCallback((partial) => {
    dispatch(mergeSettings({ liveQSO: { http: partial } }))
  }, [dispatch])

  const saveURL = useCallback(() => {
    mergeHTTPSettings({ url: normalizeLiveQSOURL(draftURL) })
    setURLDialogVisible(false)
  }, [draftURL, mergeHTTPSettings])

  const cancelURLDialog = useCallback(() => {
    setDraftURL(httpSettings.url)
    setURLDialogVisible(false)
  }, [httpSettings.url])

  const sendTestMessage = useCallback(async () => {
    try {
      const result = await sendLiveQSOHTTPTest({
        settings: httpSettings,
        operatorCall: settings?.operatorCall
      })
      const body = result.ok
        ? t('screens.liveQSOHTTPSettings.test.successBodyOk', 'Done. Response = {{status}}\nSend successful!', { status: result.status })
        : t('screens.liveQSOHTTPSettings.test.successBodyStatus', 'Done. Response = {{status}}', { status: result.status })

      Alert.alert(
        t('screens.liveQSOHTTPSettings.test.successTitle', 'HTTP test sent'),
        body
      )
    } catch (error) {
      Alert.alert(
        t('screens.liveQSOHTTPSettings.test.errorTitle', 'Error sending HTTP test'),
        error?.message ?? t('screens.liveQSOHTTPSettings.test.errorBody', 'Unknown error')
      )
    }
  }, [httpSettings, settings?.operatorCall, t])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.enabled.title', 'Enabled')}
            description={httpSettings.enabled ? t('screens.liveQSOHTTPSettings.enabled.descriptionOn', 'Send saved QSOs to the configured HTTP endpoint') : t('screens.liveQSOHTTPSettings.enabled.descriptionOff', 'Do not send live QSOs over HTTP')}
            leftIcon="protocol"
            rightSwitchValue={httpSettings.enabled}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ enabled: value })}
            onPress={() => mergeHTTPSettings({ enabled: !httpSettings.enabled })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.url.title', 'Set URL')}
            description={summarizeLiveQSOURL(httpSettings.url, { maxLength: 56 })}
            leftIcon="webhook"
            onPress={() => setURLDialogVisible(true)}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.individualRequests.title', 'Individual requests per QSO')}
            description={httpSettings.individualRequests ? t('screens.liveQSOHTTPSettings.individualRequests.descriptionOn', 'Split multi-record ADIF into separate requests') : t('screens.liveQSOHTTPSettings.individualRequests.descriptionOff', 'Keep multi-record ADIF in one request')}
            leftIcon="call-split"
            rightSwitchValue={httpSettings.individualRequests}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ individualRequests: value })}
            onPress={() => mergeHTTPSettings({ individualRequests: !httpSettings.individualRequests })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.sendADIFHeader.title', 'Send ADIF header')}
            description={httpSettings.sendADIFHeader ? t('screens.liveQSOHTTPSettings.sendADIFHeader.descriptionOn', 'Include ADIF header fields before records') : t('screens.liveQSOHTTPSettings.sendADIFHeader.descriptionOff', 'Send record lines only')}
            leftIcon="format-header-pound"
            rightSwitchValue={httpSettings.sendADIFHeader}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ sendADIFHeader: value })}
            onPress={() => mergeHTTPSettings({ sendADIFHeader: !httpSettings.sendADIFHeader })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.sendEdits.title', 'Send edits')}
            description={httpSettings.sendEdits ? t('screens.liveQSOHTTPSettings.sendEdits.descriptionOn', 'Send edited QSOs with HTTP PUT') : t('screens.liveQSOHTTPSettings.sendEdits.descriptionOff', 'Do not send edited QSOs')}
            leftIcon="file-edit-outline"
            rightSwitchValue={httpSettings.sendEdits}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ sendEdits: value })}
            onPress={() => mergeHTTPSettings({ sendEdits: !httpSettings.sendEdits })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.sendDeletes.title', 'Send deletes')}
            description={httpSettings.sendDeletes ? t('screens.liveQSOHTTPSettings.sendDeletes.descriptionOn', 'Send deleted QSOs with HTTP DELETE') : t('screens.liveQSOHTTPSettings.sendDeletes.descriptionOff', 'Do not send deleted QSOs')}
            leftIcon="delete-outline"
            rightSwitchValue={httpSettings.sendDeletes}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ sendDeletes: value })}
            onPress={() => mergeHTTPSettings({ sendDeletes: !httpSettings.sendDeletes })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.test.title', 'Send test ADIF')}
            description={t('screens.liveQSOHTTPSettings.test.description', 'Sends a test QSO to the configured URL')}
            leftIcon="send-outline"
            onPress={sendTestMessage}
          />
        </H2kListSection>

        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>

      {urlDialogVisible && (
        <H2kDialog visible={true} onDismiss={cancelURLDialog}>
          <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.liveQSOHTTPSettings.url.dialogTitle', 'HTTP Endpoint URL')}</H2kDialogTitle>
          <H2kDialogContent>
            <H2kText variant="bodyMedium">{t('screens.liveQSOHTTPSettings.url.dialogBody', 'Enter the URL that should receive live QSO ADIF requests.')}</H2kText>
            <H2kTextInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={draftURL}
              label={t('screens.liveQSOHTTPSettings.url.inputLabel', 'Endpoint URL')}
              placeholder={t('screens.liveQSOHTTPSettings.url.placeholder', 'http://example.org/live-qso')}
              keyboard="dumb"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setDraftURL}
            />
          </H2kDialogContent>
          <H2kDialogActions>
            <H2kButton onPress={cancelURLDialog}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
            <H2kButton onPress={saveURL}>{t('general.buttons.ok', 'Ok')}</H2kButton>
          </H2kDialogActions>
        </H2kDialog>
      )}
    </ScreenContainer>
  )
}
