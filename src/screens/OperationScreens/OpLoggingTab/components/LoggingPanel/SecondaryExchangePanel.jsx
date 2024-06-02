/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import { timeControl } from './SecondaryExchangePanel/TimeControl'
import { radioControl } from './SecondaryExchangePanel/RadioControl'
import { notesControl } from './SecondaryExchangePanel/NotesControl'
import { SecondaryControlManagementSubPanel } from './SecondaryExchangePanel/SecondaryControlManagementSubPanel'
import { SecondaryControlSelectionsubPanel } from './SecondaryExchangePanel/SecondaryControlSelectionSubPanel'
import { findHooks } from '../../../../../extensions/registry'
import { findRef } from '../../../../../tools/refTools'
import { spotterControl } from './SecondaryExchangePanel/SpotterControl'
import { editQSOControl } from '../../../EditQSOScreen'

export const SecondaryExchangePanel = (props) => {
  const { currentSecondaryControl, operation, vfo, settings } = props

  const secondaryControlSettings = useMemo(() => (
    operation?.secondaryControls ?? settings?.secondaryControls ?? {}
  ), [operation?.secondaryControls, settings?.secondaryControls])

  const allControls = useMemo(() => {
    const newControls = {
      time: timeControl,
      radio: radioControl,
      notes: notesControl,
      edit: editQSOControl
    }
    const activityHooks = findHooks('activity')
    if (activityHooks.filter((x) => (findRef(operation, x.activationType) && x.postSpot)).length > 0) {
      newControls[spotterControl.key] = spotterControl
    }
    activityHooks.forEach(activity => {
      const activityControls = activity.loggingControls ? activity.loggingControls({ operation, vfo, settings }) : []
      for (const control of activityControls) {
        newControls[control.key] = control
      }
    })
    return newControls
  }, [operation, vfo, settings])

  const enabledControls = useMemo(() => {
    let keys = Object.keys(allControls)

    keys = keys.filter(key => allControls[key].optionType === 'mandatory' || secondaryControlSettings[key])

    return keys.map(key => allControls[key]).sort((a, b) => a.order - b.order)
  }, [allControls, secondaryControlSettings])

  const moreControls = useMemo(() => {
    let keys = Object.keys(allControls)

    keys = keys.filter(key => !(allControls[key].optionType === 'mandatory' || secondaryControlSettings[key]))

    return keys.map(key => allControls[key]).sort((a, b) => a.order - b.order)
  }, [allControls, secondaryControlSettings])

  if (currentSecondaryControl === 'manage-controls') {
    return <SecondaryControlManagementSubPanel {...props} secondaryControlSettings={secondaryControlSettings} allControls={allControls} enabledControls={enabledControls} moreControls={moreControls} />
  } else {
    return <SecondaryControlSelectionsubPanel {...props} secondaryControlSettings={secondaryControlSettings} allControls={allControls} enabledControls={enabledControls} moreControls={moreControls} />
  }
}
