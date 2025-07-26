/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { setOperationData } from '../../../store/operations'
import { findRef, replaceRef } from '../../../tools/refTools'
import { H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput, H2kDropDown } from '../../../ui'

import { Info } from './FDExtension'

export function FDActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ref = useMemo(() => findRef(operation, Info.key), [operation])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()
    if (value?.transmitterPower) value.transmitterPower = value.transmitterPower.toUpperCase()
    if (value?.powerSource) value.powerSource = value.powerSource.toUpperCase()

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, ...value }) }))
  }, [dispatch, operation, ref])

  const handleTransmitterPowerChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, transmitterPower: value }) }))
  }, [dispatch, operation, ref])

  const handlePowerSourceChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, powerSource: value }) }))
  }, [dispatch, operation, ref])

  return (
    <>
      <H2kListSection title={'Exchange Information'}>
        <H2kListRow>
          <H2kTextInput
            style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
            textStyle={styles.text.callsign}
            label={'Class'}
            mode={'flat'}
            uppercase={true}
            noSpaces={true}
            value={ref?.class || ''}
            onChangeText={(text) => handleChange({ class: text })}
          />
        </H2kListRow>
        <H2kListRow>
          <H2kTextInput
            style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
            textStyle={styles.text.callsign}
            label={'Location'}
            mode={'flat'}
            uppercase={true}
            noSpaces={true}
            value={ref?.location || ''}
            onChangeText={(text) => handleChange({ location: text })}
          />
        </H2kListRow>
        <H2kListRow style={{ marginTop: styles.oneSpace * 4 }}>
          <H2kMarkdown>{`
  Class for ARRL Field Day is, for example \`2A\`:

  - \`1\`, \`2\`, \`3\`... for the number of transmitters.
  - \`A\` for Group (3 or more) Portable Station
  - \`B\` for One or two person Portable Station
  - \`C\` for Mobile Station
  - \`D\` for Home Station
  - \`E\` for Home Station on Emergency Power
  - \`F\` for Emergency Operation Center

  Location is the ARRL Section, RAC Section, \`MX\` for Mexico, or \`DX\` for anywhere else.

  More info in the **[official rules](https://www.arrl.org/field-day-rules)**.
            `}</H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
      <H2kListSection title={'Additional Information'}>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            label="Highest Transmitter Power"
            value={ref?.transmitterPower}
            placeholder="100W"
            onChangeText={handleTransmitterPowerChange}
            options={[
              { label: 'QRP: 5W or less', value: '5W' },
              { label: 'QRO: 100W or less', value: '100W' },
              { label: 'More than 100W', value: '500W' }
            ]}
          />

        </H2kListRow>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            label="Power Source"
            value={ref?.powerSource}
            placeholder="Select a power source"
            onChangeText={handlePowerSourceChange}
            options={[
              { label: 'Batteries, Solar, Wind', value: 'BATTERIES' },
              { label: 'Commercial Power, Generator', value: 'GENERATOR' }
            ]}
          />
        </H2kListRow>
      </H2kListSection>
    </>
  )
}
