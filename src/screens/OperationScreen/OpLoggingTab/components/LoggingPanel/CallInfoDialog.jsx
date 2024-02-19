import React, { useCallback } from 'react'
import { Button, Dialog, Icon, Portal, Text } from 'react-native-paper'
import { View, KeyboardAvoidingView } from 'react-native'
import { capitalizeString } from '../../../../../tools/capitalizeString'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

export function CallInfoDialog ({
  visible, setVisible,
  qso, guess, operation,
  qrz, pota, callHistory,
  styles
}) {
  const entity = DXCC_BY_PREFIX[guess?.entityPrefix]

  const handleDone = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  if (visible) {
    return (
      <Portal>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
          <Dialog visible={visible} onDismiss={handleDone}>
            <Dialog.Content>
              <View style={{ flexDirection: 'row' }}>
                <View>
                  <Icon source={'account'} size={styles.oneSpace * 4} />
                </View>
                <View>
                  <Text variant="headlineSmall">
                    {qso.their.call}
                    {qrz?.data?.call && qrz?.data?.call !== qrz.originalArgs?.call && (
                      ` (now ${qrz.data.call})`
                    )}
                  </Text>
                </View>
              </View>
              <View>
                <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                  {capitalizeString(qrz?.data?.name, { content: 'name', force: false })}
                </Text>
                {qrz?.data?.call === guess?.baseCall && qrz?.data?.city && (
                  <Text>
                    {[capitalizeString(qrz?.data?.city, { force: false }), qrz?.data?.state].filter(x => x).join(', ')}
                  </Text>
                )}
                {entity && (
                  <Text>{entity.flag} {entity.shortName} • {entity.entityPrefix}</Text>
                )}
                {pota?.data?.name && (
                  <Text style={{ marginTop: styles.oneSpace }}>
                    POTA: {pota.data.reference} {pota.data.name} {pota.data.parktypeDesc}
                  </Text>
                )}
                {pota?.data?.locationName && (
                  <Text>{pota.data.locationName}</Text>
                )}
              </View>
            </Dialog.Content>
            <Dialog.Actions style={{ justifyContent: 'space-between' }}>
              <View />
              <Button onPress={handleDone}>Ok</Button>
            </Dialog.Actions>
          </Dialog>
        </KeyboardAvoidingView>
      </Portal>
    )
  }
}
