import { useDispatch, useSelector } from 'react-redux'
import { selectStateForComponent, setStateForComponent, updateStateForComponent } from './uiSlice'
import { useCallback, useEffect } from 'react'

export function useUIState (component, key, initialValue) {
  const dispatch = useDispatch()
  const componentData = useSelector(state => selectStateForComponent(state, component))
  const setter = useCallback((newData) => dispatch(setStateForComponent({ component, [key]: newData })), [dispatch, component, key])
  const updater = useCallback((newData) => dispatch(updateStateForComponent({ component, [key]: newData })), [dispatch, component, key])
  let data = (componentData && componentData[key]) ?? initialValue

  useEffect(() => {
    if (initialValue !== undefined) {
      setter(initialValue)

      // eslint-disable-next-line react-hooks/exhaustive-deps
      data = initialValue
    }
  }, [setter])

  return [data, setter, updater]
}
