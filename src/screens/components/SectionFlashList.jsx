// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

/*
 * Based on https://github.com/hareruya-maro/react-native-flash-section-list
 * Released by Haruya Nakamura under the ISC license
 *
*/

import { FlashList } from '@shopify/flash-list'
import React from 'react'

import { buildSectionFlashListData } from './SectionFlashListTools'

export function SectionFlashList ({
  sections, extraData, stickySectionHeadersEnabled,
  SectionSeparatorComponent,
  ItemSeparatorComponent,
  maintainVisibleContentPosition,
  horizontal, numColumns,
  renderSectionHeader,
  renderSectionFooter,
  renderItem,
  isStickyItem,
  overrideItemLayout,
  ...props
}) {
  const { data, stickyHeaderIndices } = buildSectionFlashListData({ sections, extraData, stickySectionHeadersEnabled, isStickyItem })

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
            contextItem: info.item.contextItem,
            headerType: info.item.type,
            target: info.target,
            extraData: info.extraData
          }) || null}
          {maintainVisibleContentPosition?.startRenderingFromBottom
            ? null
            : separator(info.index, true)}
        </>
      )
    } else if (info.item.type === 'contextHeader') {
      return (
        <>
          {renderSectionHeader?.({
            section: info.item.section,
            contextItem: info.item.contextItem,
            headerType: info.item.type,
            target: info.target,
            extraData: info.extraData
          }) || null}
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
    if (item.type === 'sectionHeader' || item.type === 'contextHeader') {
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
      stickyHeaderConfig={{ hideRelatedCell: true, ...props.stickyHeaderConfig }}
      getItemType={(item) => item.type}
      maintainVisibleContentPosition={maintainVisibleContentPosition}
      horizontal={horizontal}
      numColumns={numColumns}
    />
  )
}
