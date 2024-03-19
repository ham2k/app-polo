import { bandForFrequency } from '@ham2k/lib-operation-data'
import { actions, selectOperation } from '../operationsSlice'
import debounce from 'debounce'
import { saveOperation } from './operationsDB'
import { findRef } from '../../../tools/refTools'
import { refHandlers } from '../../../plugins/loadPlugins'

function debounceableDispatch (dispatch, action) {
  return dispatch(action())
}
const debouncedDispatch = debounce(debounceableDispatch, 2000)

// const refTypeTitles = {
//   potaActivation: 'POTA',
//   sotaActivation: 'SOTA',
//   iotaActivation: 'IOTA',
//   botaActivation: 'BOTA',
//   wwffActivation: 'WWFF',
//   contest: 'Contest'
// }

export const setOperationData = (data) => async (dispatch, getState) => {
  const { uuid } = data
  const operation = selectOperation(getState(), uuid) ?? {}

  if (data.power) data.power = parseInt(data.power, 10)

  if (data.freq) {
    data.band = bandForFrequency(data.freq)
  } else if (data.band) {
    data.freq = undefined
  }

  if (data.refs) {
    const newRefs = []
    for (const ref of data.refs) {
      if (refHandlers[ref.type]?.decorateRefWithDispatch) {
        newRefs.push(await dispatch(refHandlers[ref.type].decorateRefWithDispatch(ref)))
      } else if (refHandlers[ref.type]?.decorateRef) {
        newRefs.push(dispatch(refHandlers[ref.type].decorateRef(ref)))
      } else {
        newRefs.push(ref)
      }
    }

    data.refs = newRefs
  }

  if (data.description) {
    data.title = data.description
    data.subtitle = ''
  } else if (data.refs && !operation.description) {
    const referenceTitles = data.refs.map(ref => refHandlers[ref?.type]?.suggestOperationTitle && refHandlers[ref?.type]?.suggestOperationTitle(ref)).filter(x => x)

    const titleParts = []

    const plainTitles = referenceTitles.map(ref => ref.title).filter(x => x).join(', ')
    const forTitles = referenceTitles.map(ref => ref.for).filter(x => x).join(', ')
    const atTitles = referenceTitles.map(ref => ref.at).filter(x => x).join(', ')
    if (plainTitles) titleParts.push(plainTitles)
    if (forTitles) titleParts.push('for ' + forTitles)
    if (atTitles) titleParts.push('at ' + atTitles)

    const subtitleParts = referenceTitles.map(ref => ref.subtitle).filter(x => x)

    if (titleParts.length) {
      data.title = titleParts.join(' ')
      data.subtitle = subtitleParts.join(' • ')
    } else {
      data.title = 'General Operation'
      data.subtitle = ''
    }
  }

  if (!operation.title && (!data.title || data.title === 'at ')) {
    data.title = 'General Operation'
    data.subtitle = ''
  }

  if (!operation.grid && !data.grid && data.refs) {
    const pota = findRef(data, 'potaActivation')
    if (pota?.grid) {
      data.grid = pota.grid
    }
  }

  await dispatch(actions.setOperation(data))
  const savedOperation = selectOperation(getState(), uuid) ?? {}
  return debouncedDispatch(dispatch, () => saveOperation(savedOperation))
}
