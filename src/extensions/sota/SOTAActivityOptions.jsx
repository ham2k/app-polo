import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Searchbar, Text } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'

import { selectOperationCallInfo, setOperationData } from '../../store/operations'
import { findRef, replaceRef } from '../../tools/refTools'
import { SOTAData } from './SOTADataFile'
import { Info } from './SOTAInfo'
import { SOTAListItem } from './SOTAListItem'
import { ListRow } from '../../screens/components/ListComponents'

export function SOTAActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation } = props

  const dispatch = useDispatch()

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const operationRef = useMemo(() => findRef(operation, Info.activationType), [operation]) ?? ''

  const title = useMemo(() => {
    if (!operationRef?.ref) return 'No summit selected for activation'
    else return 'Activating summit:'
  }, [operationRef])

  const [search, setSearch] = useState('')

  const [results, setResults] = useState([])
  const [resultsMessage, setResultsMessage] = useState([])

  const [location, setLocation] = useState()
  useEffect(() => {
    Geolocation.getCurrentPosition(info => {
      const { latitude, longitude } = info.coords
      setLocation({ lat: latitude, lon: longitude })
    }, error => {
      console.error('Geolocation error', error)
      setLocation(undefined)
    })
  }, [])

  const [nearbyResults, setNearbyResults] = useState([])
  useEffect(() => {
    if (location?.lat && location?.lon) {
      const newResults = SOTAData.activeReferences.filter(reference => {
        return (Math.abs(reference.lat - location.lat) < NEARBY_DEGREES && Math.abs(reference.lon - location.lon) < NEARBY_DEGREES)
      }).sort((a, b) => {
        const distA = Math.sqrt((a.lat - location.lat) ** 2 + (a.lon - location.lon) ** 2)
        const distB = Math.sqrt((b.lat - location.lat) ** 2 + (b.lon - location.lon) ** 2)
        return distA - distB
      })
      setNearbyResults(newResults)
    }
  }, [ourInfo, location])

  useEffect(() => {
    if (search?.length > 2) {
      const ucSearch = search.toUpperCase()
      let newResults = SOTAData.activeReferences.filter(reference => {
        return (reference.ref?.includes(ucSearch) || (reference.uc ?? reference.name ?? '').includes(ucSearch))
      })

      if (location?.lat && location?.lon) {
        newResults = newResults.sort((a, b) => {
          const distA = Math.sqrt((a.lat - location.lat) ** 2 + (a.lon - location.lon) ** 2)
          const distB = Math.sqrt((b.lat - location.lat) ** 2 + (b.lon - location.lon) ** 2)
          return distA - distB
        })
      }

      // Is the search term a plain reference, either with prefix or just digits?
      let nakedReference
      if (search.match(Info.referenceRegex)) {
        nakedReference = search.toUpperCase()
      }

      // If it's a naked reference, let's ensure the results include it, or else add a placeholder
      // just to cover any cases where the user knows about a new reference not included in our data
      if (nakedReference && !newResults.find(ref => ref.ref === nakedReference)) {
        newResults.unshift({ ref: nakedReference, name: 'Unknown summit' })
      }

      setResults(newResults.slice(0, 10))
      if (newResults.length === 0) {
        setResultsMessage('No summits found')
      } else if (newResults.length > 10) {
        setResultsMessage(`… and ${newResults.length - 10} more`)
      } else {
        setResultsMessage('')
      }
    } else {
      setResults(nearbyResults)
      if (nearbyResults === undefined) setResultsMessage('Search for some summits to activate!')
      else if (nearbyResults.length === 0) setResultsMessage('No summits nearby')
      else setResultsMessage('')
    }
  }, [search, ourInfo, nearbyResults, location])

  const handleAddReference = useCallback((newRef) => {
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRef(operation?.refs, Info.activationType, { type: Info.activationType, ref: newRef })
    }))
  }, [dispatch, operation])

  const handleRemoveReference = useCallback((newRef) => {
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRef(operation?.refs, Info.activationType, {})
    }))
  }, [dispatch, operation])

  return (
    <>
      <List.Section title={title}>
        {operationRef?.ref && (
          <SOTAListItem
            key={operationRef.ref}
            activityRef={operationRef.ref}
            operationRef={operationRef.ref}
            styles={styles}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        )}
      </List.Section>
      <List.Section title={operationRef ? undefined : 'Select a summit'}>
        <ListRow>

          <Searchbar
            placeholder={'Summits by name or reference…'}
            value={search}
            onChangeText={setSearch}
          />
        </ListRow>
        {results.map((result) => (
          <SOTAListItem
            key={result.ref}
            activityRef={result.ref}
            operationRef={operationRef.ref}
            refData={result}
            styles={styles}
            onPress={() => handleAddReference(result.ref) }
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
        {resultsMessage && <List.Item title={<Text style={{ textAlign: 'center' }}>{resultsMessage}</Text>} />}
      </List.Section>
    </>
  )
}
