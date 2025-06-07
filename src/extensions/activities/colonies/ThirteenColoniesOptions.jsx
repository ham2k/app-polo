/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { View } from 'react-native'

import { Ham2kMarkdown } from '../../../screens/components/Ham2kMarkdown'
import { Ham2kListSection } from '../../../screens/components/Ham2kListSection'
import { ListRow } from '../../../screens/components/ListComponents'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import { findRef } from '../../../tools/refTools'
import { Info } from './ThirteenColoniesExtension'

export function ThirteenColoniesOptions ({ styles, operation }) {
  const ref = useMemo(() => findRef(operation, Info.key), [operation])

  const isInTestMode = useMemo(() => {
    const today = new Date()
    const year = ref?.year
    const july1 = Date.parse(`${year}-07-01T00:00:00Z`)

    return today < july1
  }, [ref?.year])

  return (
    <>
      <Ham2kListSection title={'Settings'}>
        <ListRow>
          <ThemedTextInput
            style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
            textStyle={styles.text.callsign}
            label={'Year'}
            mode={'flat'}
            uppercase={true}
            noSpaces={true}
            disabled={true}
            value={ref?.year || '2025'}
          />
        </ListRow>
      </Ham2kListSection>
      {isInTestMode && (
        <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, marginBottom: styles.oneSpace, flexDirection: 'column' }}>
          <Ham2kMarkdown style={{ color: 'red' }}>{`
Since the event for this year has not started yet, you can test your operation with QSOs from the last seven days.
            `}</Ham2kMarkdown>
        </View>
      )}
      <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, marginBottom: styles.oneSpace, flexDirection: 'column' }}>
        <Ham2kMarkdown>{`
NOTE: PoLo will report your results using all QSOs in the date range, including any other operations present on this device.
            `}</Ham2kMarkdown>
      </View>

      <View style={{ marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace * 2, marginBottom: styles.oneSpace, flexDirection: 'column' }}>
        <Ham2kMarkdown>{`
The 13 Colonies Special Event runs every year from 9am ET July 1st to midnight ET July 7th.

More info at [http://www.13colonies.us/](http://www.13colonies.us/)

            `}</Ham2kMarkdown>
      </View>
    </>
  )
}
