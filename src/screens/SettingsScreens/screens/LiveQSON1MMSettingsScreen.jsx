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
import {
  displayLiveQSOUDPURL,
  normalizeLiveQSOUDPURL,
  sendLiveQSON1MMTest,
  selectLiveQSON1MMSettings,
  summarizeLiveQSOUDPURL
} from '../../../store/liveQSO'
import {
  H2kButton,
  H2kDialog,
  H2kDialogActions,
  H2kDialogContent,
  H2kDialogTitle,
  H2kListItem,
  H2kListSection,
  H2kText,
  H2kTextInput
} from '../../../ui'

export default function LiveQSON1MMSettingsScreen ({ splitView }) {
  const { t } = useTranslation()
  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()
  const n1mmSettings = selectLiveQSON1MMSettings(settings)

  const [urlDialogVisible, setURLDialogVisible] = useState(false)
  const [draftURL, setDraftURL] = useState(displayLiveQSOUDPURL(n1mmSettings.url))

  useEffect(() => {
    setDraftURL(displayLiveQSOUDPURL(n1mmSettings.url))
  }, [n1mmSettings.url])

  const mergeN1MMSettings = useCallback((partial) => {
    dispatch(mergeSettings({ liveQSO: { n1mm: partial } }))
  }, [dispatch])

  const saveURL = useCallback(() => {
    mergeN1MMSettings({ url: normalizeLiveQSOUDPURL(draftURL) })
    setURLDialogVisible(false)
  }, [draftURL, mergeN1MMSettings])

  const cancelURLDialog = useCallback(() => {
    setDraftURL(displayLiveQSOUDPURL(n1mmSettings.url))
    setURLDialogVisible(false)
  }, [n1mmSettings.url])

  const sendTestMessage = useCallback(async () => {
    try {
      await sendLiveQSON1MMTest({
        settings: n1mmSettings,
        operatorCall: settings?.operatorCall
      })

      Alert.alert(
        t('screens.liveQSON1MMSettings.test.successTitle', 'N1MM test sent'),
        t('screens.liveQSON1MMSettings.test.successBody', 'Done.')
      )
    } catch (error) {
      Alert.alert(
        t('screens.liveQSON1MMSettings.test.errorTitle', 'Error sending N1MM test'),
        error?.message ?? t('screens.liveQSON1MMSettings.test.errorBody', 'Unknown error')
      )
    }
  }, [n1mmSettings, settings?.operatorCall, t])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.liveQSON1MMSettings.enabled.title', 'Enabled')}
            description={n1mmSettings.enabled ? t('screens.liveQSON1MMSettings.enabled.descriptionOn', 'Send saved QSOs as N1MM-style UDP broadcast') : t('screens.liveQSON1MMSettings.enabled.descriptionOff', 'Do not send live QSOs as N1MM-style UDP broadcast')}
            leftIcon="broadcast"
            rightSwitchValue={n1mmSettings.enabled}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ enabled: value })}
            onPress={() => mergeN1MMSettings({ enabled: !n1mmSettings.enabled })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.url.title', 'Set URL')}
            description={summarizeLiveQSOUDPURL(n1mmSettings.url, { maxLength: 56 })}
            leftIcon="webhook"
            onPress={() => setURLDialogVisible(true)}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.sendEdits.title', 'Send edits')}
            description={n1mmSettings.sendEdits ? t('screens.liveQSON1MMSettings.sendEdits.descriptionOn', 'Also send QSO edits as N1MM messages') : t('screens.liveQSON1MMSettings.sendEdits.descriptionOff', 'Do not send QSO edits')}
            leftIcon="file-edit-outline"
            rightSwitchValue={n1mmSettings.sendEdits}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ sendEdits: value })}
            onPress={() => mergeN1MMSettings({ sendEdits: !n1mmSettings.sendEdits })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.sendDeletes.title', 'Send deletes')}
            description={n1mmSettings.sendDeletes ? t('screens.liveQSON1MMSettings.sendDeletes.descriptionOn', 'Also send QSO deletes as N1MM messages') : t('screens.liveQSON1MMSettings.sendDeletes.descriptionOff', 'Do not send QSO deletes')}
            leftIcon="delete-outline"
            rightSwitchValue={n1mmSettings.sendDeletes}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ sendDeletes: value })}
            onPress={() => mergeN1MMSettings({ sendDeletes: !n1mmSettings.sendDeletes })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.skipEmptyFields.title', 'Skip empty fields')}
            description={n1mmSettings.skipEmptyFields ? t('screens.liveQSON1MMSettings.skipEmptyFields.descriptionOn', 'Send shorter messages') : t('screens.liveQSON1MMSettings.skipEmptyFields.descriptionOff', "Don't send shorter messages")}
            leftIcon="code-tags"
            rightSwitchValue={n1mmSettings.skipEmptyFields}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ skipEmptyFields: value })}
            onPress={() => mergeN1MMSettings({ skipEmptyFields: !n1mmSettings.skipEmptyFields })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.test.title', 'Send test ADIF')}
            description={t('screens.liveQSON1MMSettings.test.description', 'Sends a test QSO to the configured URL')}
            leftIcon="send-outline"
            onPress={sendTestMessage}
          />
        </H2kListSection>
        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>

      {urlDialogVisible && (
        <H2kDialog visible={true} onDismiss={cancelURLDialog}>
          <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.liveQSON1MMSettings.url.dialogTitle', 'N1MM Broadcast Target')}</H2kDialogTitle>
          <H2kDialogContent>
            <H2kText variant="bodyMedium">{t('screens.liveQSON1MMSettings.url.dialogBody', 'Use a .255 address to broadcast on a /24, or a host IP to send directly.')}</H2kText>
            <H2kTextInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={draftURL}
              label={t('screens.liveQSON1MMSettings.url.inputLabel', 'Target URL')}
              placeholder={t('screens.liveQSON1MMSettings.url.placeholder', '192.168.1.255:12060')}
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
