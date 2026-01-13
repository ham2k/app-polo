/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import Geolocation from '@react-native-community/geolocation'
import { useTranslation } from 'react-i18next'

import { selectOperationCallInfo } from '../../../store/operations'
import { filterRefs, replaceRefs } from '../../../tools/refTools'
import { selectRuntimeOnline } from '../../../store/runtime'
import { distanceOnEarth } from '../../../tools/geoTools'
import { H2kListRow, H2kListSection, H2kSearchBar } from '../../../ui'

import { Info } from './LLOTAInfo'
import { llotaFindByReference, llotaFindByLocation, llotaFindByName, llotaPrefixForDXCCCode } from './LLOTAAllRefsData'
import { LLOTAListItem } from './LLOTAListItem'

export function LLOTAActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs: setRefsUpstream }) {
  const { t } = useTranslation()

  const NEARBY_DEGREES = 0.25

  const online = useSelector(selectRuntimeOnline)

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const activityRefs = useMemo(() => filterRefs(allRefs, Info.activationType).filter(ref => ref.ref), [allRefs])

  const title = useMemo(() => {
    return t('extensions.llota.activityOptions.title', 'Activating {{count}} lakes', { count: activityRefs?.length || 0 })
  }, [activityRefs?.length, t])

  const [search, setSearch] = useState('')

  const [refs, setRefs] = useState([])
  const [refsMessage, setRefsMessage] = useState([])

  const [location, setLocation] = useState()
  useEffect(() => {
    Geolocation.getCurrentPosition(
      info => {
        const { latitude, longitude } = info.coords
        setLocation({ lat: latitude, lon: longitude })
      },
      error => {
        console.info('Geolocation error', error)
      }, {
        enableHighAccuracy: true,
        timeout: 1000 * 30 /* 30 seconds */,
        maximumAge: 1000 * 60 /* 1 minute */
      }
    )
  }, [])

  const [refDatas, setRefDatas] = useState([])
  useEffect(() => {
    setTimeout(async () => {
      const datas = []
      for (const ref of activityRefs) {
        const refData = await llotaFindByReference(ref.ref)
        const newData = { ...ref, ...refData }
        if (location?.lat && location?.lon) {
          newData.distance = distanceOnEarth(newData, location, { units: settings.distanceUnits })
        }
        datas.push(newData)
      }
      setRefDatas(datas)
    }, 0)
  }, [activityRefs, location, settings.distanceUnits])

  const [nearbyResults, setNearbyResults] = useState([])
  useEffect(() => {
    setTimeout(async () => {
      if (location?.lat && location?.lon) {
        const newResults = await llotaFindByLocation(ourInfo.dxccCode, location.lat, location.lon, NEARBY_DEGREES)
        setNearbyResults(
          newResults.map(result => ({
            ...result,
            distance: distanceOnEarth(result, location, { units: settings.distanceUnits })
          })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))
        )
      }
    })
  }, [ourInfo, location, settings.distanceUnits])

  useEffect(() => {
    setTimeout(async () => {
      if (search?.length > 2) {
        let newRefs = await llotaFindByName(ourInfo?.dxccCode, search.toLowerCase())
        if (location?.lat && location?.lon) {
          newRefs = newRefs.map(ref => ({
            ...ref,
            distance: distanceOnEarth(ref, location, { units: settings.distanceUnits })
          })).sort((a, b) => a.distance - b.distance)
        }

        // Is the search term a plain reference, either with prefix or just digits?
        let nakedReference
        const parts = search.match(/^\s*([A-Z]*)[-]{0,1}(\d+|TEST)\s*$/i)
        if (parts && parts[2].length >= 4) {
          nakedReference = (parts[1]?.toUpperCase() || llotaPrefixForDXCCCode(ourInfo?.dxccCode) || 'K') + '-' + parts[2].toUpperCase()
        } else if (search.match(Info.referenceRegex)) {
          nakedReference = search
        }

        // If it's a naked reference, let's ensure the results include it, or else add a placeholder
        // just to cover any cases where the user knows about a new reference not included in our data
        if (nakedReference && !newRefs.find(ref => ref.ref === nakedReference)) {
          newRefs.unshift({ ref: nakedReference })
        }

        setRefs(newRefs.slice(0, 15))
        if (newRefs.length > 15) {
          setRefsMessage(t('extensions.llota.activityOptions.nearestMatches', 'Nearest {{limit}} of {{count}} matches', { limit: 15, count: newRefs.length }))
        } else {
          setRefsMessage(t('extensions.llota.activityOptions.matchingRefs', '{{count}} matching lakes', { count: newRefs.length }))
        }
      } else {
        setRefs(nearbyResults)
        if (nearbyResults === undefined) setRefsMessage(t('extensions.llota.activityOptions.searchForRefs', 'Search for some lakes to activate!'))
        else if (nearbyResults.length === 0) setRefsMessage(t('extensions.llota.activityOptions.noRefsNearby', 'No lakes nearby'))
        else setRefsMessage(t('extensions.llota.activityOptions.nearbyRefs', 'Nearby lakes'))
      }
    })
  }, [search, ourInfo, nearbyResults, location, settings.distanceUnits, t])

  const handleAddReference = useCallback((ref) => {
    setRefsUpstream(replaceRefs(allRefs, Info.activationType, [...activityRefs.filter(r => r.ref !== ref), { type: Info.activationType, ref }]))
  }, [activityRefs, allRefs, setRefsUpstream])

  const handleRemoveReference = useCallback((ref) => {
    setRefsUpstream(replaceRefs(allRefs, Info.activationType, activityRefs.filter(r => r.ref !== ref)))
  }, [activityRefs, allRefs, setRefsUpstream])

  return (
    <>
      <H2kListSection title={title}>
        {refDatas.map((ref, index) => (
          <LLOTAListItem
            key={ref.ref}
            activityRef={ref.ref}
            refData={ref}
            allRefs={activityRefs}
            styles={styles}
            settings={settings}
            online={online}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </H2kListSection>

      <H2kListRow>
        <H2kSearchBar
          placeholder={t('extensions.llota.activityOptions.searchPlaceholder', 'Name or reference…')}
          value={search}
          onChangeText={setSearch}
        />
      </H2kListRow>

      <H2kListSection title={refsMessage}>
        {refs.map((ref) => (
          <LLOTAListItem
            key={ref.ref}
            activityRef={ref.ref}
            allRefs={activityRefs}
            refData={ref}
            styles={styles}
            settings={settings}
            onPress={() => handleAddReference(ref.ref)}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </H2kListSection>
    </>
  )
}
