/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { findRef, replaceRef } from '../../../tools/refTools'

import { setOperationData } from '../../../store/operations'
import { H2kListSection, H2kListRow, H2kMarkdown, H2kTextInput } from '../../../ui'

import { Info } from './SimpleContestExtension'

export function ActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ref = useMemo(() => findRef(operation, Info.key), [operation])

  const handleIdChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, contestIdentifier: value }) }))
  }, [dispatch, operation, ref])

  const handleExchangeChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, exchange: value }) }))
  }, [dispatch, operation, ref])

  return (
    <>
      <H2kListSection title={'Contest Details'}>
        <H2kListRow>

          <H2kTextInput
            label="Contest Identifier"
            value={ref?.contestIdentifier || ''}
            uppercase={true}
            onChangeText={handleIdChange}
          />
          <H2kTextInput
            label="Exchange Sent"
            value={ref?.exchange || ''}
            uppercase={false}
            onChangeText={handleExchangeChange}
          />
          <H2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
⚠️ Please note that this *Simple Contest* will not do any scoring or mult tracking.

⚠️ Generated Cabrillo and ADIF files will most likely require some additional editing in order to be valid for submission.

See [Cabrillo](https://www.contestcalendar.com/cabnames.php) or [ADIF](https://www.adif.org/314/ADIF_314.htm#Contest_ID) for some possible Contest Identifiers.

Neither Name or Identifier are required, but they make it easier to identify your operation, and it prefills some values in generated ADIF and Cabrillo files.
`}
          </H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}
