/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
 * Based on https://github.com/hareruya-maro/react-native-flash-section-list
 * Released by Haruya Nakamura under the ISC license
 *
*/

import { FlashList } from '@shopify/flash-list'
import React from 'react'

export function SectionFlashList ({
  sections, extraData, stickySectionHeadersEnabled,
  SectionSeparatorComponent,
  ItemSeparatorComponent,
  maintainVisibleContentPosition,
  horizontal, numColumns,
  renderSectionHeader,
  renderSectionFooter,
  renderItem,
  overrideItemLayout,
  ...props
}) {
  const data = sections
    .map((section) => {
      return [
        { type: 'sectionHeader', section, extraData },
        ...section.data.map((item, index) => ({
          type: 'row',
          item,
          index,
          extraData
        }))
      ]
    })
    .flat()

  const stickyHeaderIndices = []
  const sectionLabels = []

  data.forEach((item, index) => {
    if (item.type !== 'sectionHeader') {
      return
    }
    sectionLabels.push({
      actualIndex: index
    })
    if (stickySectionHeadersEnabled !== false) {
      stickyHeaderIndices.push(index)
    }
  })
  const separator = (index, isSection) => {
    if (!data || index + 1 >= data.length) {
      return null
    }

    const leadingItem = data[index]
    const trailingItem = data[index + 1]

    const separatorProps = {
      index,
      leadingItem,
      trailingItem
    }

    const Separator = isSection
      ? SectionSeparatorComponent
      : ItemSeparatorComponent
    return Separator && <Separator {...separatorProps} />
  }

  const renderItemWithSections = (info) => {
    if (info.item.type === 'sectionHeader') {
      return (
        <>
          {maintainVisibleContentPosition?.startRenderingFromBottom
            ? separator(info.index, true)
            : null}
          {renderSectionHeader?.({
            section: info.item.section,
            extraData: info.extraData
          }) || null}
          {maintainVisibleContentPosition?.startRenderingFromBottom
            ? null
            : separator(info.index, true)}
        </>
      )
    } else if (info.item.type === 'sectionFooter') {
      return (
        <>
          {maintainVisibleContentPosition?.startRenderingFromBottom
            ? separator(info.index, true)
            : null}
          {renderSectionFooter?.({
            section: info.item.section,
            extraData: info.extraData
          }) || null}
          {maintainVisibleContentPosition?.startRenderingFromBottom
            ? null
            : separator(info.index, true)}
        </>
      )
    } else {
      return (
        <>
          {maintainVisibleContentPosition?.startRenderingFromBottom
            ? separator(info.index, false)
            : null}
          {renderItem?.({ item: info.item.item })}
          {maintainVisibleContentPosition?.startRenderingFromBottom
            ? null
            : separator(info.index, false)}
        </>
      )
    }
  }

  const overrideItemLayoutWithSections = (layout, item, index, maxColumns, extra) => {
    overrideItemLayout?.(layout, item, index, maxColumns, extra)
    if (item.type === 'sectionHeader') {
      layout.span = maxColumns
    } else {
      layout.span = 1
    }
  }

  return (
    <FlashList
      {...props}
      ItemSeparatorComponent={null}
      data={data}
      renderItem={renderItemWithSections}
      overrideItemLayout={overrideItemLayoutWithSections}
      stickyHeaderIndices={
        stickySectionHeadersEnabled !== false ? stickyHeaderIndices : []
      }
      getItemType={(item) => item.type}
      maintainVisibleContentPosition={maintainVisibleContentPosition}
      horizontal={horizontal}
      numColumns={numColumns}
    />
  )
}
