import React, { useCallback } from 'react'
import { Button, Chip, Dialog, Icon, Portal, Text } from 'react-native-paper'
import { View, KeyboardAvoidingView, Image, Linking } from 'react-native'
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
  // console.log(qrz.data)
  if (visible) {
    return (
      <Portal>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
          <Dialog visible={visible} onDismiss={handleDone}>
            <Dialog.Content>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, flexDirection: 'column' }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View>
                      <Icon source={'account'} size={styles.oneSpace * 4} />
                    </View>
                    <View>
                      <Text variant="headlineSmall" style={styles.text.callsign}>
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
                      <Text>{entity.flag} {entity.shortName} • <Text style={styles.text.callsign}>{entity.entityPrefix}</Text></Text>
                    )}
                    {pota?.data?.name && (
                      <Text style={{ marginTop: styles.oneSpace }}>
                        POTA: <Text style={styles.text.callsign}>{pota.data.reference}</Text> {pota.data.name} {pota.data.parktypeDesc}
                      </Text>
                    )}
                    {pota?.data?.locationName && (
                      <Text>{pota.data.locationName}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flex: 0, marginLeft: styles.oneSpace }}>
                  {qrz?.data?.image && (
                    <Image source={{ uri: qrz.data.image }} style={{ width: styles.oneSpace * 10, height: styles.oneSpace * 10, borderWidth: styles.oneSpace * 0.7, borderColor: 'white', marginBottom: styles.oneSpace }} />
                  )}
                  {qrz?.data?.call && (
                    <Chip icon="web" mode="flat" onPress={() => Linking.openURL(`https://qrz.com/db/${qrz?.data?.call}`)}>qrz</Chip>
                  )}
                </View>
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
