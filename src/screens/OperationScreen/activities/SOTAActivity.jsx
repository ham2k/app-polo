/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { replaceRefs, stringToRefs } from '../../../tools/refTools'

/*
https://sotawatch.sota.org.uk/en/

https://www.sotadata.org.uk/summitslist.csv

https://sotastore.blob.core.windows.net/docs/SOTA-General-Rules-June-2022.pdf

At least one QSO must be made from the Summit to qualify an activation.

In order for the activation to qualify for the points attributed to that Summit, a minimum of four
QSOs must be made, each of which must be with a different station.

QSOs must comprise an exchange of callsigns and signal reports; it is strongly recommended that
the summit identifier be given during each contact.

Activator points accrue to the operator regardless of the callsign used. The operator must
be entitled to use the callsign. Multiple operators of the same station may claim activator
points. Each individual operator must make the minimum number of QSOs stated above
in order to claim Activator points.

The Activator claims the Summit points on an expedition basis

Rules for Chasers

With effect from 01-Jan-2004, only one QSO with a given Summit on any one day (defined as 00:00 to 23:59 UTC) counts for points.

 */

const ACTIVITY = {
  key: 'sota',
  comingSoon: true,
  icon: 'image-filter-hdr',
  name: 'Summits on the Air',
  shortName: 'SOTA',
  infoURL: 'https://www.sota.org.uk/',
  huntingType: 'sota',
  activationType: 'sotaActivation',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: 'Enter SOTA reference'
}

function ThisActivityOptionalExchangePanel (props) {
  return (
    <Text>WIP</Text>
  )
}

export function ThisActivitySettingsDialog (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const handleChange = useCallback((value) => {
    let refs
    if (value) {
      refs = stringToRefs(ACTIVITY.activationType, value, { regex: ACTIVITY.referenceRegex })
    } else {
      refs = []
    }

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, ACTIVITY.activationType, refs) }))
  }, [dispatch, operation])

  return (
    <ActivitySettingsDialog
      {...props}
      icon={ACTIVITY.icon}
      title={ACTIVITY.name}
      info={ACTIVITY.infoURL}
      removeOption={true}
      value={operation[ACTIVITY.operationAttribute]}
      onChange={handleChange}
      content={({ value, setValue }) => (
        <>
          <Text variant="bodyMedium">Enter the reference for the Summit being activated in this operation</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={[styles.nativeInput, styles.text.callsign]}
            label={'SOTA Reference'}
            placeholder={'...'}
            mode={'flat'}
            value={value}
            onChangeText={(text) => setValue(text)}
          />
          <Text variant="bodyMedium" style={{ color: styles.theme.colors.primary }}>NOT FUNCTIONAL YET, FOR TESTING PURPOSES ONLY</Text>
        </>
      )}
    />
  )
}

const ThisActivity = {
  ...ACTIVITY,
  MainExchangePanel: null,
  OptionalExchangePanel: ThisActivityOptionalExchangePanel,
  SettingsDialog: ThisActivitySettingsDialog
}

export default ThisActivity
