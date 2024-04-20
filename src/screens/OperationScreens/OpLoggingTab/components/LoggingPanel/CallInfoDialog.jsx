/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { Button, Dialog } from 'react-native-paper'
import { View } from 'react-native'
import { Ham2kDialog } from '../../../../components/Ham2kDialog'
import { CallInfoPanel } from '../../../OpInfoTab/components/CallInfoPanel'

export function CallInfoDialog ({
  visible, setVisible,
  qso, operation
}) {
  const handleDone = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  if (visible) {
    return (
      <Ham2kDialog visible={visible} onDismiss={handleDone}>
        <Dialog.Content>
          <CallInfoPanel
            qso={qso}
            operation={operation}
            themeColor="primary"
          />
        </Dialog.Content>
        <Dialog.Actions style={{ justifyContent: 'space-between' }}>
          <View />
          <Button onPress={handleDone}>Ok</Button>
        </Dialog.Actions>
      </Ham2kDialog>
    )
  }
}
