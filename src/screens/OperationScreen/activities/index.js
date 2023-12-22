import POTAActivity from './POTAActivity'
import SOTAActivity from './SOTAActivity'
import WWFFActivity from './WWFFActivity'
import BOTAActivity from './BOTAActivity'
import FDActivity from './FDActivity'
import WFDActivity from './WFDActivity'

const activities = []
const activityIndex = {}

activities.push(POTAActivity)
activityIndex[POTAActivity.key] = POTAActivity

activities.push(SOTAActivity)
activityIndex[SOTAActivity.key] = SOTAActivity

activities.push(WWFFActivity)
activityIndex[WWFFActivity.key] = WWFFActivity

activities.push(BOTAActivity)
activityIndex[BOTAActivity.key] = BOTAActivity

activities.push(FDActivity)
activityIndex[FDActivity.key] = FDActivity

activities.push(WFDActivity)
activityIndex[WFDActivity.key] = WFDActivity

export {
  activityIndex,
  activities
}
export default activities
