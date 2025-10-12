/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import React, { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { setOperationData } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { H2kDropDown, H2kListItem, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'
import { fmtDateTimeNice, fmtTimeBetween, prepareTimeValue } from '../../../tools/timeFormats'
import { findRef, replaceRef } from '../../../tools/refTools'

import { Info } from './QSOPartiesInfo'
import { qpData, qpIsInState, qpNameForLocation, qpNormalizeLocation, QSO_PARTY_DATA } from './QSOPartiesExtension'

export function ActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)

  const ref = useMemo(() => findRef(operation, Info.key), [operation])
  const qp = useMemo(() => qpData({ ref }), [ref])

  const partyOptions = useMemo(() => {
    const now = new Date()

    const activePartyKeys = Object.keys(QSO_PARTY_DATA).filter(key => QSO_PARTY_DATA[key].options && !QSO_PARTY_DATA[key].disabled)
    const activePartyData = activePartyKeys.map(key => {
      const date = new Date(QSO_PARTY_DATA[key].start)
      let days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      let timeDiff
      if (days < -14) {
        timeDiff = 'Already happened'
        days = days + 365
      } else if (days < -2) {
        timeDiff = 'Last weekend'
      } else if (days >= -1 && days <= 1) {
        timeDiff = 'This weekend'
      } else if (days > 1) {
        timeDiff = `in ${days} days`
      }

      return {
        label: `${QSO_PARTY_DATA[key].name?.replace(' QSO Party', '')} (${timeDiff})`,
        value: key,
        days
      }
    }).sort((a, b) => a.days - b.days)

    return activePartyData
  }, [])

  const handlePartyChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, ref: value }) }))
  }, [dispatch, operation, ref])

  const handleLocationChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, location: value }) }))
  }, [dispatch, operation, ref])

  const handleEmailChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, email: value }) }))
  }, [dispatch, operation, ref])

  const handleSpotToQPHubChange = useCallback((value) => {
    if (value === undefined) value = !ref?.spotToQPHub
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, spotToQPHub: value }) }))
  }, [dispatch, operation, ref])

  const handleSpotToAPRSChange = useCallback((value) => {
    if (value === undefined) value = !ref?.spotToAPRS
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, spotToAPRS: value }) }))
  }, [dispatch, operation, ref])

  return (
    <>
      <H2kListSection title={'Which QSO Party?'}>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            // label="Which QSO Party?"
            value={ref?.ref}
            placeholder="Select a QSO Party"
            onChangeText={handlePartyChange}
            dropDownContainerMaxHeight={styles.oneSpace * 45}
            style={{ width: styles.oneSpace * (styles.size === 'xs' ? 13 : 15) }}
            options={partyOptions}
          />
        </H2kListRow>
      </H2kListSection>

      {qp && (
        <>
          <H2kListSection title={'Your Exchange'}>
            <H2kListRow>
              <H2kTextInput
                label="Location"
                value={ref?.location || ''}
                uppercase={true}
                onChangeText={handleLocationChange}
              />
              {ref?.location?.length > 1 && (
                qpNormalizeLocation({ location: ref.location, qp }) ? (
                  <H2kMarkdown style={{ padding: styles.oneSpace }}>
                    {qpIsInState({ location: ref.location, qp }) ? 'In-state: ' : 'Out-of-state: ' }{qpNameForLocation({ location: ref.location, qp })}
                  </H2kMarkdown>
                ) : (
                  <H2kMarkdown style={{ padding: styles.oneSpace, color: 'red' }}>
                    Not found!
                  </H2kMarkdown>
                )
              )}
            </H2kListRow>
          </H2kListSection>
          <H2kListSection title={'Entry Information'}>
            <H2kListRow>
              <H2kTextInput
                label="E-Mail"
                autoComplete="email"
                inputMode="email"
                keyboardType="email-address"
                autoCapitalize={'none'}
                value={ref?.email || ''}
                onChangeText={handleEmailChange}
              />
            </H2kListRow>
          </H2kListSection>

          {settings.devMode && qp?.options?.selfSpotting && (
            <H2kListSection title={'Spotting'} titleStyle={{ color: styles.colors.devMode }}>
              <H2kListRow>
                <H2kListItem
                  title="Spot to QSO Party Hub"
                  description={ref?.spotToQPHub ? 'Yes, spot us!' : 'Disabled'}
                  leftIcon="hand-wave"
                  rightSwitchValue={ref?.spotToQPHub}
                  rightSwitchOnValueChange={handleSpotToQPHubChange}
                  onPress={handleSpotToQPHubChange}
                  leftIconColor={styles.colors.devMode}
                  titleStyle={{ color: styles.colors.devMode }}
                  descriptionStyle={{ color: styles.colors.devMode }}
                />

                <H2kListItem
                  title="Spot to APRS"
                  description={ref?.spotToAPRS ? 'Yes, spot us!' : 'Disabled'}
                  leftIcon="hand-wave"
                  rightSwitchValue={ref?.spotToAPRS}
                  rightSwitchOnValueChange={handleSpotToAPRSChange}
                  onPress={handleSpotToAPRSChange}
                  leftIconColor={styles.colors.devMode}
                  titleStyle={{ color: styles.colors.devMode }}
                  descriptionStyle={{ color: styles.colors.devMode }}
                />

                <H2kMarkdown style={{ color: styles.colors.devMode, marginHorizontal: styles.oneSpace }}>
                  **Warning:** Self-spotting might not be allowed for all classes. Check the official rules before enabling these options.
                </H2kMarkdown>
              </H2kListRow>
            </H2kListSection>
          )}

          <H2kListSection title={'Information'}>
            <H2kListRow>
              <H2kMarkdown style={{ marginHorizontal: styles.oneSpace }} styles={{ markdown: { paragraph: { marginBottom: styles.oneSpace } } }}>{`
**Official Site:**
[${qp.url}](${qp.url})

${qp.secondStart ? (
`**First Period:**
${fmtTimeBetween(qp.start, qp.end, { roundTo: 'hours' })}: ${_fmtDateTimeNiceRange(qp.start, qp.end).replaceAll(/:00 /g, '')}
**Second Period:**
${fmtTimeBetween(qp.secondStart, qp.secondEnd, { roundTo: 'hours' })}: ${_fmtDateTimeNiceRange(qp.secondStart, qp.secondEnd).replaceAll(/:00 /g, '')}
`
) : (
`**Period:**
${_fmtDateTimeNiceRange(qp.start, qp.end).replaceAll(/:00 /g, '')}`
)}

${qp.notes ? `**Notes:**\n${qp.notes}` : ''}

${qp.lastUpdated ? `**Last Updated:** ${qp.lastUpdated}` : ''}

${qp.status ? `**Status:** ${qp.status}` : ''}
`}
              </H2kMarkdown>
            </H2kListRow>
          </H2kListSection>
        </>
      )}
    </>
  )
}

function _fmtDateTimeNiceRange (t1, t2) {
  t1 = prepareTimeValue(t1)
  t2 = prepareTimeValue(t2)
  const diffInDays = (t2 - t1) / (1000 * 60 * 60 * 24)
  if (diffInDays < 7) {
    const date1 = t1.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const date2 = t2.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    if (date1 === date2) {
      return [
        t1.toLocaleTimeString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: undefined, hour: '2-digit', minute: '2-digit' }),
        t2.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      ].join(' to ')
    } else {
      return [
        t1.toLocaleTimeString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: undefined, seconds: undefined }),
        t2.toLocaleTimeString(undefined, { weekday: 'long', hour: '2-digit', minute: '2-digit' })
      ].join(' to ')
    }
  } else {
    return [fmtDateTimeNice(t1), fmtDateTimeNice(t2)].join(' to ')
  }
}
