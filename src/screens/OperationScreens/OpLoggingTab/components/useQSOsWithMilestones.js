/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useSelector } from 'react-redux'

import { selectQSOs } from '../../../../store/qsos'

import { useMemo } from 'react'

const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

export function useQSOsWithMilestones ({ uuid }) {
  const qsos = useSelector(state => selectQSOs(state, uuid))

  const sections = useMemo(() => {
    // eslint-disable-next-line no-shadow
    const sections = []
    let currentSection = null
    for (const qso of qsos) {
      const day = qso.startOnMillis - (qso.startOnMillis % TWENTY_FOUR_HOURS_IN_MILLIS)
      if (!currentSection || currentSection.day !== day) {
        currentSection = { day, data: [] }
        sections.push(currentSection)
      }
      currentSection.data.push(qso)
    }
    return sections
  }, [qsos])

  return { qsos, sections }
}
