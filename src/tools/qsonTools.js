/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function forEachQSOWithSectionContext({
  qsos, operation,
  withEvents = false, withDeleted = false,
  callback
}) {
  let sectionRefs = operation?.refs ?? []
  let sectionGrid = operation?.grid ?? undefined

  qsos.forEach(qso => {
    if (!qso.deleted && (qso.event?.event === 'break' || qso.event?.event === 'start')) {
      sectionRefs = qso.event.operation?.refs ?? []
      sectionGrid = qso.event.operation?.grid ?? undefined
    }

    if (!withEvents && qso.event) return

    if (!withDeleted && qso.deleted) return

    callback({ qso, sectionRefs, sectionGrid })
  })
}

export function mapQSOsWithSectionContext({
  qsos, operation,
  withEvents = false, withDeleted = false,
  map
}) {
  const mapped = []

  forEachQSOWithSectionContext({
    qsos,
    operation,
    withEvents,
    withDeleted,
    callback: (context) => {
      mapped.push(map(context))
    }
  })

  return mapped
}

export function filterQSOsWithSectionRefs({
  qsos, operation,
  withEvents = false, withDeleted = false,
  withSectionRefs,
  filter
}) {
  filter = filter ?? (() => true)

  withSectionRefs = (withSectionRefs ?? []).filter(ref => ref?.type && ref?.ref)
  const filtered = []

  forEachQSOWithSectionContext({ qsos, operation, withEvents, withDeleted, callback: ({ qso, sectionRefs, sectionGrid }) => {
    const sectionIncludesRefs = withSectionRefs.length === 0 || withSectionRefs.every(
      ref => sectionRefs.find(
        sectionRef => sectionRef.type === ref.type && sectionRef.ref === ref.ref
      )
    )
    if (!sectionIncludesRefs) return
    if (filter({ qso, sectionRefs, sectionGrid })) {
      filtered.push(qso)
    }
  } })

  return filtered
}

/**
 * Returns QSOs that happened before `qso`
 * that happened on a section that includes the given `sectionRefs`
 * and that also passes the given `filter` function
 */
export function filterNearDupes({ qso, filter, ...rest }) {
  const { uuid, startAtMillis, their } = qso
  const { call } = their

  const actualFilter = ({ qso: q, sectionRefs, sectionGrid }) => {
    const result = (startAtMillis ? q.startAtMillis < startAtMillis : true)
      && !q.deleted && !q.event
      && call === q.their.call
      && uuid !== q.uuid
      && (filter ? filter({ qso: q, sectionRefs, sectionGrid }) : true)
    // console.log('-- result', result)
    return result
  }

  return filterQSOsWithSectionRefs({ ...rest, filter: actualFilter })
}
