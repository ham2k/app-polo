import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Searchbar, Text } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'

import { selectOperationCallInfo, setOperationData } from '../../store/operations'
import { findRef, replaceRef } from '../../tools/refTools'
import { WWFFData } from './WWFFDataFile'
import { INFO } from './WWFFInfo'
import { WWFFListItem } from './WWFFListItem'
import { ListRow } from '../../screens/components/ListComponents'

export function WWFFActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation } = props

  const dispatch = useDispatch()

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const operationRef = useMemo(() => findRef(operation, INFO.activationType), [operation]) ?? ''

  const title = useMemo(() => {
    if (!operationRef?.ref) return 'No park selected for activation'
    else return 'Activating park:'
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
      const newResults = WWFFData.activeReferences.filter(reference => {
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
      let newResults = WWFFData.activeReferences.filter(ref => {
        return (!ourInfo?.dxccCode || ref.dxccCode === ourInfo.dxccCode) &&
            (ref.ref.toLowerCase().includes(search.toLowerCase()) || ref.name.toLowerCase().includes(search.toLowerCase())
            )
      })

      if (location?.lat && location?.lon) {
        newResults = newResults.sort((a, b) => {
          const distA = Math.sqrt((a.lat - location.lat) ** 2 + (a.lon - location.lon) ** 2)
          const distB = Math.sqrt((b.lat - location.lat) ** 2 + (b.lon - location.lon) ** 2)
          return distA - distB
        })
      }

      // // Is the search term a plain reference, either with prefix or just digits?
      // let nakedReference
      // const parts = search.match(/^\s*([A-Za-z]*)(\d+)\s*$/)
      // if (parts && parts[2].length >= 4) {
      //   nakedReference = (parts[1]?.toUpperCase() || WWFFData.prefixByDXCCCode[ourInfo?.dxccCode] || 'K') + '-' + parts[2]
      // } else if (search.match(INFO.referenceRegex)) {
      //   nakedReference = search
      // }

      // // If it's a naked reference, let's ensure the results include it, or else add a placeholder
      // // just to cover any cases where the user knows about a new park not included in our data
      // if (nakedReference && !newResults.find(park => park.ref === nakedReference)) {
      //   newResults.unshift({ ref: nakedReference })
      // }

      setResults(newResults.slice(0, 10))
      if (newResults.length === 0) {
        setResultsMessage('No parks found')
      } else if (newResults.length > 10) {
        setResultsMessage(`… and ${newResults.length - 10} more`)
      } else {
        setResultsMessage('')
      }
    } else {
      setResults(nearbyResults)
      if (nearbyResults === undefined) setResultsMessage('Search for a park to activate!')
      else if (nearbyResults.length === 0) setResultsMessage('No parks nearby')
      else setResultsMessage('')
    }
  }, [search, ourInfo, nearbyResults, location])

  const handleAddReference = useCallback((newRef) => {
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRef(operation?.refs, INFO.activationType, { type: INFO.activationType, ref: newRef })
    }))
  }, [dispatch, operation])

  const handleRemoveReference = useCallback((newRef) => {
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRef(operation?.refs, INFO.activationType, {})
    }))
  }, [dispatch, operation])

  return (
    <>
      <List.Section title={title}>
        {operationRef?.ref && (
          <WWFFListItem
            key={operationRef.ref}
            activityRef={operationRef.ref}
            operationRef={operationRef.ref}
            styles={styles}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        )}
      </List.Section>
      <List.Section title={operationRef ? undefined : 'Select a park'}>
        <ListRow>

          <Searchbar
            placeholder={'Parks by name or reference…'}
            value={search}
            onChangeText={setSearch}
          />
        </ListRow>
        {results.map((result) => (
          <WWFFListItem
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
