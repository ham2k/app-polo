/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'

import { findRef, replaceRef } from '../../../tools/refTools'
import { Info } from './WFDExtension'
import { H2kListItem, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'
import { Text } from 'react-native-paper'

export function WFDActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs }) {
  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()

    const updatedRef = { ...activityRef, ...value }
    const objectiveCount = Object.entries(OBJECTIVES).reduce((acc, [key, objective]) => {
      return acc + (updatedRef[key] ? 1 : 0)
    }, 0)
    const objectiveMultiplier = Object.entries(OBJECTIVES).reduce((acc, [key, objective]) => {
      return acc + (updatedRef[key] ? objective.multiplier : 0)
    }, 0)

    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, ...value, objectiveCount, objectiveMultiplier }))
  }, [setRefs, allRefs, activityRef])

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
            value={activityRef?.class || ''}
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
            value={activityRef?.location || ''}
            onChangeText={(text) => handleChange({ location: text })}
          />
        </H2kListRow>
        <H2kListRow style={{ marginTop: styles.oneSpace * 4 }}>
          <H2kMarkdown>{`
  Class for Winter Field Day is, for example \`2M\`:

  - \`1\`, \`2\`, \`3\`... for the number of transmitters.
  - \`H\` for Home Station
  - \`I\` for Indoors
  - \`O\` for Outdoors
  - \`M\` for Mobile or Mobile Stationary

  Location is the ARRL Section, RAC Section, \`MX\` for Mexico, or \`DX\` for anywhere else.

  More info in the **[official rules](https://www.winterfieldday.com/sop.php)**.
            `}</H2kMarkdown>
        </H2kListRow>

      </H2kListSection>
      <H2kListSection title={activityRef.objectiveCount > 0 ? `Objectives: ${activityRef.objectiveCount} achieved,  OM ×${activityRef.objectiveMultiplier}` : 'Objectives'}>
        <H2kListRow>
          <Text style={{ fontSize: styles.smallFontSize, marginHorizontal: styles.oneSpace }}>Remember to also report these objectives when submitting your log!</Text>
        </H2kListRow>
        {Object.entries(OBJECTIVES).map(([key, objective]) => (
          <H2kListItem
            key={key}
            title={`${objective.title} (OM ×${objective.multiplier})`}
            description={objective.description}
            rightSwitchValue={activityRef[key]}
            rightSwitchOnValueChange={(value) => handleChange({ [key]: value })}
            onPress={() => handleChange({ [key]: !activityRef[key] })}
          />
        ))}
      </H2kListSection>
    </>
  )
}

const OBJECTIVES = {
  objAltPower: {
    title: 'Alternative Power',
    description: 'Operate 100% on alternative power, such as batteries, solar, wind, etc.',
    multiplier: 1
  },
  objAwayFromHome: {
    title: 'Operate Away From Home',
    description: 'Set up your field station at least ½ mile away from home.',
    multiplier: 3
  },
  objMultipleAntennas: {
    title: 'Multiple Antennas',
    description: 'Deploy at least two antennas, and make at least one contact on each.',
    multiplier: 1
  },
  objFMSatelliteContact: {
    title: 'FM Satellite Contact',
    description: 'Make at least 1 FM satellite contact during the operating period.',
    multiplier: 2
  },
  objSSBSatelliteContact: {
    title: 'SSB or CW Satellite Contact',
    description: 'Make at least one contact using SSB or CW.',
    multiplier: 3
  },
  objWinlinkEmails: {
    title: 'Winlink Emails',
    description: 'Send AND receive at least one email from using Winlink over RF.',
    multiplier: 1
  },
  objSpecialBulletin: {
    title: 'Special Bulletin',
    description: 'Accurately copy the WFD Special Bulletin message and submit your copy with your log submission.',
    multiplier: 1
  },
  objSixBands: {
    title: 'Six Bands',
    description: 'Make at least three contacts on each of at least six different bands.',
    multiplier: 6
  },
  objTwelveBands: {
    title: 'Twelve Bands',
    description: 'Make at least three contacts on each of at least twelve different bands.',
    multiplier: 6
  },
  objMultipleModes: {
    title: 'Multiple Modes',
    description: 'Use multiple modes during the operating period.',
    multiplier: 2
  },
  objQRPOperation: {
    title: 'QRP Operation',
    description: 'Operate on QRP power levels (10W or less on Phone, 5W or less on CW or Digital).',
    multiplier: 4
  },
  objSixContinuousHours: {
    title: 'Six Continuous Hours',
    description: 'Operate for at least six continuous hours during the operating period.',
    multiplier: 2
  }
}
