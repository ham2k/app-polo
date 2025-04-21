/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import React, { useCallback, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { findRef, replaceRef } from '../../../tools/refTools'

import { setOperationData } from '../../../store/operations'
import { Ham2kListSection } from '../../../screens/components/Ham2kListSection'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

import { Info } from './GAPOTAExtension'
import { Ham2kMarkdown } from '../../../screens/components/Ham2kMarkdown'
import { ListRow } from '../../../screens/components/ListComponents'

export function ActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ref: 'GA POTA' }) }))
  }, [])
  return (
    <>
      <Ham2kListSection title={'Georgia State Parks on the Air'}>
        <ListRow>
          <Ham2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
This extension provides basic features to support participation in the Georgia State Parks on the Air contest.

It will highlight Georgia State Parks whenever POTA parks are shown, such as spots or log entries.

And it provides a summary of Georgia State Parks that you have worked in your operation.
`}
          </Ham2kMarkdown>
        </ListRow>
      </Ham2kListSection>
    </>
  )
}
