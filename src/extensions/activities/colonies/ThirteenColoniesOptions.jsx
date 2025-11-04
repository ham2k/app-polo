/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import { H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'
import { findRef } from '../../../tools/refTools'

import { Info } from './ThirteenColoniesExtension'

export function ThirteenColoniesOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const isInTestMode = useMemo(() => {
    const today = new Date()
    const year = activityRef?.year
    const july1 = Date.parse(`${year}-07-01T00:00:00Z`)

    return today < july1
  }, [activityRef?.year])

  return (
    <>
      <H2kListSection title={'Settings'}>
        <H2kListRow>
          <H2kTextInput
            style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
            textStyle={styles.text.callsign}
            label={'Year'}
            mode={'flat'}
            uppercase={true}
            noSpaces={true}
            disabled={true}
            value={activityRef?.year || '2025'}
          />
        </H2kListRow>
      </H2kListSection>
      {isInTestMode && (
        <H2kListRow style={{ marginTop: styles.oneSpace * 2, marginBottom: styles.oneSpace }}>
          <H2kMarkdown style={{ color: 'red' }}>{`
Since the event for this year has not started yet, you can test your operation with QSOs from the last seven days.
            `}</H2kMarkdown>
        </H2kListRow>
      )}
      <H2kListRow style={{ marginTop: styles.oneSpace * 2, marginBottom: styles.oneSpace }}>
        <H2kMarkdown>{`
NOTE: PoLo will report your results using all QSOs in the date range, including any other operations present on this device.
            `}</H2kMarkdown>
      </H2kListRow>

      <H2kListRow style={{ marginTop: styles.oneSpace * 2, marginBottom: styles.oneSpace }}>
        <H2kMarkdown>{`
The 13 Colonies Special Event runs every year from 9am ET July 1st to midnight ET July 7th.

More info at [http://www.13colonies.us/](http://www.13colonies.us/)

            `}</H2kMarkdown>
      </H2kListRow>
    </>
  )
}
