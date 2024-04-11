import React, { useCallback, useMemo } from 'react'
import { Button, Chip, Dialog, Icon, Portal, Text } from 'react-native-paper'
import { View, KeyboardAvoidingView, Image, Linking } from 'react-native'
import { capitalizeString } from '../../../../../tools/capitalizeString'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import { fmtDateTimeDynamic } from '../../../../../tools/timeFormats'
import { useAllCallNotesFinder } from '../../../../../extensions/data/call-notes/CallNotesExtension'
import { Ham2kMarkdown } from '../../../../components/Ham2kMarkdown'

const HISTORY_QSOS_TO_SHOW = 3

export function CallInfoDialog ({
  visible, setVisible,
  qso, operation,
  pota, qrz, callHistory,
  styles
}) {
  const lookup = qso?.their?.lookup ?? {}
  const guess = qso?.their?.guess ?? {}

  const entity = DXCC_BY_PREFIX[guess.entityPrefix]

  const [thisOpTitle, thisOpQSOs, historyTitle, historyRecent, historyAndMore] = useMemo(() => {
    const thisQs = (callHistory || []).filter(q => operation && q.operation === operation?.uuid)
    const otherOps = (callHistory || []).filter(q => q.operation !== operation?.uuid)

    const recent = otherOps?.slice(0, HISTORY_QSOS_TO_SHOW) || []
    let thisTitle
    let title
    let andMore

    if (thisQs?.length === 1) {
      thisTitle = 'One QSO in this operation'
    } else if (thisQs?.length > 1) {
      thisTitle = `${thisQs.length} QSOs in this operation`
    } else {
      thisTitle = ''
    }

    if (otherOps?.length === 1) {
      title = 'One previous QSO'
    } else if (otherOps?.length > 1) {
      title = `${otherOps.length} previous QSOs`
    } else {
      title = 'No previous QSOs'
    }

    if (otherOps?.length <= HISTORY_QSOS_TO_SHOW) {
      andMore = ''
    } else if (otherOps?.length > HISTORY_QSOS_TO_SHOW) {
      andMore = `… and ${otherOps.length - HISTORY_QSOS_TO_SHOW} more`
    } else {
      andMore = ''
    }

    return [thisTitle, thisQs, title, recent, andMore]
  }, [callHistory, operation])

  const callNotes = useAllCallNotesFinder(guess.baseCall)

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
                <View style={{ flex: 1, flexDirection: 'column' }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View>
                      <Icon source={'account'} size={styles.oneSpace * 4} />
                    </View>
                    <View>
                      <Text variant="headlineSmall" style={styles.text.callsign}>
                        {qso.their?.call}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                      {capitalizeString(qso?.their?.lookup?.name, { content: 'name', force: false })}
                    </Text>
                    {lookup.call === guess.baseCall && lookup.city && (
                      <Text>
                        {[capitalizeString(lookup.city, { force: false }), lookup.state].filter(x => x).join(', ')}
                      </Text>
                    )}
                    {entity && (
                      <Text>{entity.flag} {entity.shortName} • <Text style={styles.text.callsign}>{entity.entityPrefix}</Text></Text>
                    )}
                    {pota?.data?.name && (
                      <Text style={{ marginTop: styles.oneSpace }}>
                        POTA: <Text style={styles.text.callsign}>{pota.data.reference}</Text> {pota.data.shortName ?? pota.data.name}
                      </Text>
                    )}
                    {pota?.data?.locationName && (
                      <Text>{pota.data.locationName}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flex: 0, marginLeft: styles.oneSpace }}>
                  {(lookup.image ?? qrz.image) && (
                    <Image source={{ uri: (lookup.image ?? qrz.image) }} style={{ width: styles.oneSpace * 10, height: styles.oneSpace * 10, borderWidth: styles.oneSpace * 0.7, borderColor: 'white', marginBottom: styles.oneSpace }} />
                  )}
                  <Chip icon="web" mode="flat" onPress={() => Linking.openURL(`https://qrz.com/db/${qso.their.call}`)}>qrz.com</Chip>
                </View>
              </View>
              {callNotes && (
                <View style={{ flexDirection: 'column' }}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>Notes</Text>
                  {callNotes.map((note, i) => (
                    <Ham2kMarkdown key={i}>{note.note}</Ham2kMarkdown>
                  ))}
                </View>
              )}

              {thisOpTitle && (
                <View style={{ flexDirection: 'column' }}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                    {thisOpTitle}
                  </Text>
                  {thisOpQSOs.map((q, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: styles.oneSpace }}>
                      <Text style={{}}>{q.band}</Text>
                      <Text style={{}}>{q.mode}</Text>
                      <Text style={{}}>{fmtDateTimeDynamic(q.startOnMillis)}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'column' }}>
                <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                  {historyTitle}
                </Text>
                {historyRecent.map((q, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: styles.oneSpace }}>
                    <Text style={{}}>{q.band}</Text>
                    <Text style={{}}>{q.mode}</Text>
                    <Text style={{}}>{fmtDateTimeDynamic(q.startOnMillis)}</Text>
                  </View>
                ))}
                {historyAndMore && (
                  <Text style={{}}>
                    {historyAndMore}
                  </Text>
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
