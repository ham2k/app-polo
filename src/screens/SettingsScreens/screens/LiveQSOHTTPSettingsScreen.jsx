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
  const noURLConfigured = t('screens.liveQSOSettings.noURLConfigured')

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
      const result = await sendLiveQSOHTTPTest({ settings: httpSettings })
      const body = result.ok
        ? t('screens.liveQSOHTTPSettings.test.successBodyOk', { status: result.status })
        : t('screens.liveQSOHTTPSettings.test.successBodyStatus', { status: result.status })

      Alert.alert(
        t('screens.liveQSOHTTPSettings.test.successTitle'),
        body
      )
    } catch (error) {
      Alert.alert(
        t('screens.liveQSOHTTPSettings.test.errorTitle'),
        error?.message ?? t('screens.liveQSOHTTPSettings.test.errorBody')
      )
    }
  }, [httpSettings, t])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.enabled.title')}
            description={httpSettings.enabled ? t('screens.liveQSOHTTPSettings.enabled.descriptionOn') : t('screens.liveQSOHTTPSettings.enabled.descriptionOff')}
            leftIcon="protocol"
            rightSwitchValue={httpSettings.enabled}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ enabled: value })}
            onPress={() => mergeHTTPSettings({ enabled: !httpSettings.enabled })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.url.title')}
            description={summarizeLiveQSOURL(httpSettings.url, { maxLength: 56, empty: noURLConfigured })}
            leftIcon="webhook"
            onPress={() => setURLDialogVisible(true)}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.individualRequests.title')}
            description={httpSettings.individualRequests ? t('screens.liveQSOHTTPSettings.individualRequests.descriptionOn') : t('screens.liveQSOHTTPSettings.individualRequests.descriptionOff')}
            leftIcon="call-split"
            rightSwitchValue={httpSettings.individualRequests}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ individualRequests: value })}
            onPress={() => mergeHTTPSettings({ individualRequests: !httpSettings.individualRequests })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.sendADIFHeader.title')}
            description={httpSettings.sendADIFHeader ? t('screens.liveQSOHTTPSettings.sendADIFHeader.descriptionOn') : t('screens.liveQSOHTTPSettings.sendADIFHeader.descriptionOff')}
            leftIcon="format-header-pound"
            rightSwitchValue={httpSettings.sendADIFHeader}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ sendADIFHeader: value })}
            onPress={() => mergeHTTPSettings({ sendADIFHeader: !httpSettings.sendADIFHeader })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.sendEdits.title')}
            description={httpSettings.sendEdits ? t('screens.liveQSOHTTPSettings.sendEdits.descriptionOn') : t('screens.liveQSOHTTPSettings.sendEdits.descriptionOff')}
            leftIcon="file-edit-outline"
            rightSwitchValue={httpSettings.sendEdits}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ sendEdits: value })}
            onPress={() => mergeHTTPSettings({ sendEdits: !httpSettings.sendEdits })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.sendDeletes.title')}
            description={httpSettings.sendDeletes ? t('screens.liveQSOHTTPSettings.sendDeletes.descriptionOn') : t('screens.liveQSOHTTPSettings.sendDeletes.descriptionOff')}
            leftIcon="delete-outline"
            rightSwitchValue={httpSettings.sendDeletes}
            rightSwitchOnValueChange={(value) => mergeHTTPSettings({ sendDeletes: value })}
            onPress={() => mergeHTTPSettings({ sendDeletes: !httpSettings.sendDeletes })}
          />

          <H2kListItem
            title={t('screens.liveQSOHTTPSettings.test.title')}
            description={t('screens.liveQSOHTTPSettings.test.description')}
            leftIcon="send-outline"
            onPress={sendTestMessage}
          />
        </H2kListSection>

        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>

      {urlDialogVisible && (
        <H2kDialog visible={true} onDismiss={cancelURLDialog}>
          <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.liveQSOHTTPSettings.url.dialogTitle')}</H2kDialogTitle>
          <H2kDialogContent>
            <H2kText variant="bodyMedium">{t('screens.liveQSOHTTPSettings.url.dialogBody')}</H2kText>
            <H2kTextInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={draftURL}
              label={t('screens.liveQSOHTTPSettings.url.inputLabel')}
              placeholder={t('screens.liveQSOHTTPSettings.url.placeholder')}
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
