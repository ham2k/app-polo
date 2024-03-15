import React, { useMemo } from 'react'

import activities from '../../../activities'
import { timeControl } from './SecondaryExchangePanel/TimeControl'
import { radioControl } from './SecondaryExchangePanel/RadioControl'
import { notesControl } from './SecondaryExchangePanel/NotesControl'
import { SecondaryControlManagementSubPanel } from './SecondaryExchangePanel/SecondaryControlManagementSubPanel'
import { SecondaryControlSelectionsubPanel } from './SecondaryExchangePanel/SecondaryControlSelectionSubPanel'

export const SecondaryExchangePanel = (params) => {
  const { currentSecondaryControl, operation, settings } = params

  const secondaryControlSettings = useMemo(() => (
    operation?.secondaryControls ?? settings?.secondaryControls ?? {}
  ), [operation?.secondaryControls, settings?.secondaryControls])

  const allControls = useMemo(() => {
    const newControls = {
      time: timeControl,
      radio: radioControl,
      notes: notesControl
    }
    activities.forEach(activity => {
      const activityControls = activity.loggingControls ? activity.loggingControls({ operation, settings }) : []
      for (const control of activityControls) {
        newControls[control.key] = control
      }
    })
    return newControls
  }, [operation, settings])

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
    return <SecondaryControlManagementSubPanel {...params} secondaryControlSettings={secondaryControlSettings} allControls={allControls} enabledControls={enabledControls} moreControls={moreControls} />
  } else {
    return <SecondaryControlSelectionsubPanel {...params} secondaryControlSettings={secondaryControlSettings} allControls={allControls} enabledControls={enabledControls} moreControls={moreControls} />
  }
}
