import POTAActivity from './pota/POTAActivity'
import SOTAActivity from './sota/SOTAActivity'
import WWFFActivity from './wwff/WWFFActivity'
import BOTAActivity from './bota/BOTAActivity'
import FDActivity from './fd/FDActivity'
import WFDActivity from './wfd/WFDActivity'

const activities = []
const activityIndex = {}
const refHandlers = {}

function addActivity (activity) {
  activities.push(activity)
  activityIndex[activity.key] = activity
  if (activity.activationType) refHandlers[activity.activationType] = activity
  if (activity.huntingType) refHandlers[activity.huntingType] = activity
  if (activity.key) refHandlers[activity.key] = activity
}

addActivity(POTAActivity)
addActivity(SOTAActivity)
addActivity(WWFFActivity)
addActivity(BOTAActivity)
addActivity(FDActivity)
addActivity(WFDActivity)

export {
  activityIndex,
  activities,
  refHandlers
}

export default activities
