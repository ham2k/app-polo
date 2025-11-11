/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'

import { findRef, replaceRef } from '../../../tools/refTools'
import { Info } from './WFDExtension'
import { H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'

export function WFDActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs }) {
  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()

    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, ...value }))
  }, [setRefs, allRefs, activityRef])

  return (
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
  )
}
