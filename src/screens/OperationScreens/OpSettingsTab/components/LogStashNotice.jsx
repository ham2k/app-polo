// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FileStashDialogForDistribution } from '../../../../distro'
import { H2kListItem } from '../../../../ui'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'

export function LogStashNotice () {
  const { t } = useTranslation()
  const styles = useThemedStyles()
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <H2kListItem
        title={t('screens.operationData.logStashNotice', "Use our Ham2K File Stash and download later from any browser! Tap for more info")}
        leftIcon="new-box"
        leftIconColor={styles.colors.primary}
        titleStyle={{ color: styles.colors.primary }}
        titleNumberOfLines={3}
        onPress={() => setShowDialog(true)}
      />

      <FileStashDialogForDistribution visible={showDialog} onDismiss={() => setShowDialog(false)} />
    </>
  )
}
