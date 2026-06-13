// Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
// SPDX-License-Identifier: MPL-2.0

export function buildSectionFlashListData ({ sections, extraData, stickySectionHeadersEnabled, isStickyItem }) {
  let currentContextItem
  let pendingContextDetailItem

  const data = sections
    .map((section) => {
      const sectionRows = []
      let sectionHeaderAdded = false
      let sectionHasLocalRows = false

      const addSectionHeader = () => {
        if (sectionHeaderAdded) return
        sectionRows.push({
          type: 'sectionHeader',
          section,
          ...(currentContextItem ? { contextItem: currentContextItem } : {}),
          extraData
        })
        sectionHeaderAdded = true
        if (pendingContextDetailItem) {
          sectionRows.push({
            type: 'row',
            item: pendingContextDetailItem.item,
            index: pendingContextDetailItem.index,
            section,
            extraData
          })
          pendingContextDetailItem = undefined
        }
      }

      section.data.forEach((item, index) => {
        if (isStickyItem?.({ item, index, section, extraData }) === true) {
          currentContextItem = item
          pendingContextDetailItem = undefined
          if (hasLocalRowsUntilNextStickyItem({ section, index, extraData, isStickyItem })) {
            sectionRows.push({
              type: 'contextHeader',
              section,
              contextItem: item,
              index,
              extraData
            })
            sectionHeaderAdded = true
            sectionRows.push({
              type: 'row',
              item,
              index,
              section,
              extraData
            })
          } else {
            pendingContextDetailItem = { item, index }
          }
        } else {
          sectionHasLocalRows = true
          addSectionHeader()
          sectionRows.push({
            type: 'row',
            item,
            index,
            section,
            extraData
          })
        }
      })
      if (sectionHasLocalRows || !currentContextItem) {
        addSectionHeader()
      }

      return sectionRows
    })
    .flat()

  const stickyHeaderIndices = []

  data.forEach((item, index) => {
    if (item.type !== 'sectionHeader' && item.type !== 'contextHeader') {
      return
    }
    if (stickySectionHeadersEnabled !== false) {
      stickyHeaderIndices.push(index)
    }
  })

  return { data, stickyHeaderIndices }
}

function hasLocalRowsUntilNextStickyItem ({ section, index, extraData, isStickyItem }) {
  for (let nextIndex = index + 1; nextIndex < section.data.length; nextIndex++) {
    const nextItem = section.data[nextIndex]
    if (isStickyItem?.({ item: nextItem, index: nextIndex, section, extraData }) === true) {
      return false
    }
    if (!nextItem?.deleted && !nextItem?.event) {
      return true
    }
  }

  return false
}
