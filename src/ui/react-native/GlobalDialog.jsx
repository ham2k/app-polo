/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from './H2kDialog'
import { H2kMarkdown } from './H2kMarkdown'
import { H2kButton } from './H2kButton'
import { resetGlobalDialog } from '../../store/ui'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function GlobalDialog ({ title, content, uncancelable, doneLabel, cancelLabel }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useThemedStyles()

  if (!uncancelable) {
    doneLabel = t('general.buttons.done', 'Done')
  }

  const handleDone = useCallback(() => {
    if (!uncancelable) {
      dispatch(resetGlobalDialog({}))
    }
  }, [dispatch, uncancelable])

  const handleCancel = useCallback(() => {
    if (!uncancelable) {
      dispatch(resetGlobalDialog({}))
    }
  }, [dispatch, uncancelable])

  return (
    <H2kDialog visible={true} onDismiss={handleCancel}>
      {title && (
        <H2kDialogTitle style={{ paddingTop: styles.oneSpace * 2 }}>
          <H2kMarkdown style={{ textAlign: 'center', fontSize: styles.normalFontSize * 1.3, fontWeight: 'bold' }}>
            {title}
          </H2kMarkdown>
        </H2kDialogTitle>
      )}
      <H2kDialogContent>
        <H2kMarkdown>{content}</H2kMarkdown>
      </H2kDialogContent>
      <H2kDialogActions>
        {cancelLabel && (
          <H2kButton onPress={handleCancel}>{cancelLabel}</H2kButton>
        )}
        {doneLabel && (
          <H2kButton onPress={handleDone}>{doneLabel}</H2kButton>
        )}
      </H2kDialogActions>
    </H2kDialog>
  )
}
