/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { setOperationData } from '../../../store/operations'
import { findRef, replaceRef } from '../../../tools/refTools'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import { ListRow } from '../../../screens/components/ListComponents'
import { Ham2kListSection } from '../../../screens/components/Ham2kListSection'
import { Info } from './WFDExtension'
import { View } from 'react-native'
import { Ham2kMarkdown } from '../../../screens/components/Ham2kMarkdown'

export function WFDActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ref = useMemo(() => findRef(operation, Info.key), [operation])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, ...value }) }))
  }, [dispatch, operation, ref])

  return (
    <Ham2kListSection title={'Exchange Information'}>
      <ListRow>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'Class'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={ref?.class || ''}
          onChangeText={(text) => handleChange({ class: text })}
        />
      </ListRow>
      <ListRow>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'Location'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={ref?.location || ''}
          onChangeText={(text) => handleChange({ location: text })}
        />
      </ListRow>
      <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, flexDirection: 'column' }}>
        <Ham2kMarkdown>{`
Class for Winter Field Day is, for example \`2M\`:

- \`1\`, \`2\`, \`3\`... for the number of transmitters.
- \`H\` for Home Station
- \`I\` for Indoors
- \`O\` for Outdoors
- \`M\` for Mobile or Mobile Stationary

Location is the ARRL Section, RAC Section, \`MX\` for Mexico, or \`DX\` for anywhere else.

More info in the **[official rules](https://www.winterfieldday.com/sop.php)**.
          `}</Ham2kMarkdown>
      </View>
    </Ham2kListSection>
  )
}
