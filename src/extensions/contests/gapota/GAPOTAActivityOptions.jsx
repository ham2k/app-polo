/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { findRef, replaceRef } from '../../../tools/refTools'

import { setOperationData } from '../../../store/operations'
import { H2kListRow, H2kListSection, H2kMarkdown } from '../../../ui'

import { Info } from './GAPOTAExtension'

export function ActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  useEffect(() => {
    if (!findRef(operation?.refs, Info.key)) {
      dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ref: 'GA POTA' }) }))
    }
  }, [dispatch, operation])

  return (
    <>
      <H2kListSection title={'Georgia State Parks on the Air'}>
        <H2kListRow>
          <H2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
This extension provides basic features to support participation in the Georgia State Parks on the Air contest.

It will highlight Georgia State Parks whenever POTA parks are shown, such as spots or log entries.

And it provides a summary of Georgia State Parks that you have worked in your operation.
`}
          </H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}
