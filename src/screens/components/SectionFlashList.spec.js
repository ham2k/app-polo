// Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
// SPDX-License-Identifier: MPL-2.0

import { buildSectionFlashListData } from './SectionFlashListTools'

describe('buildSectionFlashListData', () => {
  test('falls back to section data when no segment groups exist', () => {
    const result = buildSectionFlashListData({
      sections: [
        {
          day: 1000,
          data: [{ uuid: 'a' }, { uuid: 'b' }]
        }
      ],
      extraData: { selected: 'a' }
    })

    expect(summarizeFlashListData(result)).toMatchInlineSnapshot(`
      {
        "rows": [
          {
            "sectionDay": 1000,
            "type": "sectionHeader",
          },
          {
            "item": "a",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "item": "b",
            "sectionDay": 1000,
            "type": "row",
          },
        ],
        "stickyHeaderIndices": [
          0,
        ],
      }
    `)
  })

  test('promotes matching section rows to sticky context headers', () => {
    const result = buildSectionFlashListData({
      isStickyItem: ({ item }) => item.band === 'event' && (item.event?.event === 'start' || item.event?.event === 'break'),
      sections: [
        {
          day: 1000,
          data: [
            { uuid: 'start', band: 'event', event: { event: 'start' } },
            { uuid: 'a' },
            { uuid: 'note', band: 'event', event: { event: 'note' } },
            { uuid: 'break', band: 'event', event: { event: 'break' } },
            { uuid: 'b' }
          ]
        }
      ]
    })

    expect(summarizeFlashListData(result)).toMatchInlineSnapshot(`
      {
        "rows": [
          {
            "contextItem": "start",
            "normal": "context",
            "sectionDay": 1000,
            "sticky": "section+context",
            "type": "contextHeader",
          },
          {
            "item": "start",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "item": "a",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "item": "note",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "contextItem": "break",
            "normal": "context",
            "sectionDay": 1000,
            "sticky": "section+context",
            "type": "contextHeader",
          },
          {
            "item": "break",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "item": "b",
            "sectionDay": 1000,
            "type": "row",
          },
        ],
        "stickyHeaderIndices": [
          0,
          4,
        ],
      }
    `)
  })

  test('carries active context into the next section', () => {
    const result = buildSectionFlashListData({
      isStickyItem: ({ item }) => item.band === 'event' && (item.event?.event === 'start' || item.event?.event === 'break'),
      sections: [
        {
          day: 1000,
          data: [
            { uuid: 'start', band: 'event', event: { event: 'start' } },
            { uuid: 'a' }
          ]
        },
        {
          day: 2000,
          data: [
            { uuid: 'b' }
          ]
        }
      ]
    })

    expect(summarizeFlashListData(result)).toMatchInlineSnapshot(`
      {
        "rows": [
          {
            "contextItem": "start",
            "normal": "context",
            "sectionDay": 1000,
            "sticky": "section+context",
            "type": "contextHeader",
          },
          {
            "item": "start",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "item": "a",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "contextItem": "start",
            "normal": "section",
            "sectionDay": 2000,
            "sticky": "section+context",
            "type": "sectionHeader",
          },
          {
            "item": "b",
            "sectionDay": 2000,
            "type": "row",
          },
        ],
        "stickyHeaderIndices": [
          0,
          3,
        ],
      }
    `)
  })

  test('uses a new first-row context instead of carried section context', () => {
    const result = buildSectionFlashListData({
      isStickyItem: ({ item }) => item.band === 'event' && (item.event?.event === 'start' || item.event?.event === 'break'),
      sections: [
        {
          day: 1000,
          data: [
            { uuid: 'start', band: 'event', event: { event: 'start' } },
            { uuid: 'a' }
          ]
        },
        {
          day: 2000,
          data: [
            { uuid: 'break', band: 'event', event: { event: 'break' } },
            { uuid: 'b' }
          ]
        }
      ]
    })

    expect(summarizeFlashListData(result)).toMatchInlineSnapshot(`
      {
        "rows": [
          {
            "contextItem": "start",
            "normal": "context",
            "sectionDay": 1000,
            "sticky": "section+context",
            "type": "contextHeader",
          },
          {
            "item": "start",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "item": "a",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "contextItem": "break",
            "normal": "context",
            "sectionDay": 2000,
            "sticky": "section+context",
            "type": "contextHeader",
          },
          {
            "item": "break",
            "sectionDay": 2000,
            "type": "row",
          },
          {
            "item": "b",
            "sectionDay": 2000,
            "type": "row",
          },
        ],
        "stickyHeaderIndices": [
          0,
          3,
        ],
      }
    `)
  })

  test('supports adding the first break after single-segment QSOs', () => {
    const result = buildSectionFlashListData({
      isStickyItem: ({ item }) => item.band === 'event' && item.event?.event === 'break',
      sections: [
        {
          day: 1000,
          data: [
            { uuid: 'a' },
            { uuid: 'break', band: 'event', event: { event: 'break' } },
            { uuid: 'b' }
          ]
        }
      ]
    })

    expect(summarizeFlashListData(result)).toMatchInlineSnapshot(`
      {
        "rows": [
          {
            "sectionDay": 1000,
            "type": "sectionHeader",
          },
          {
            "item": "a",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "contextItem": "break",
            "normal": "context",
            "sectionDay": 1000,
            "sticky": "section+context",
            "type": "contextHeader",
          },
          {
            "item": "break",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "item": "b",
            "sectionDay": 1000,
            "type": "row",
          },
        ],
        "stickyHeaderIndices": [
          0,
          2,
        ],
      }
    `)
  })

  test('omits context header rows with no local QSOs before the next section', () => {
    const result = buildSectionFlashListData({
      isStickyItem: ({ item }) => item.band === 'event' && (item.event?.event === 'start' || item.event?.event === 'break'),
      sections: [
        {
          day: 1000,
          data: [
            { uuid: 'a' },
            { uuid: 'break', band: 'event', event: { event: 'break' } }
          ]
        },
        {
          day: 2000,
          data: [
            { uuid: 'b' }
          ]
        }
      ]
    })

    expect(summarizeFlashListData(result)).toMatchInlineSnapshot(`
      {
        "rows": [
          {
            "sectionDay": 1000,
            "type": "sectionHeader",
          },
          {
            "item": "a",
            "sectionDay": 1000,
            "type": "row",
          },
          {
            "contextItem": "break",
            "normal": "section",
            "sectionDay": 2000,
            "sticky": "section+context",
            "type": "sectionHeader",
          },
          {
            "item": "break",
            "sectionDay": 2000,
            "type": "row",
          },
          {
            "item": "b",
            "sectionDay": 2000,
            "type": "row",
          },
        ],
        "stickyHeaderIndices": [
          0,
          2,
        ],
      }
    `)
  })

  test('omits first-row context headers when that day has no local QSOs', () => {
    const result = buildSectionFlashListData({
      isStickyItem: ({ item }) => item.band === 'event' && (item.event?.event === 'start' || item.event?.event === 'break'),
      sections: [
        {
          day: 1000,
          data: [
            { uuid: 'break', band: 'event', event: { event: 'break' } }
          ]
        },
        {
          day: 2000,
          data: [
            { uuid: 'b' }
          ]
        }
      ]
    })

    expect(summarizeFlashListData(result)).toMatchInlineSnapshot(`
      {
        "rows": [
          {
            "contextItem": "break",
            "normal": "section",
            "sectionDay": 2000,
            "sticky": "section+context",
            "type": "sectionHeader",
          },
          {
            "item": "break",
            "sectionDay": 2000,
            "type": "row",
          },
          {
            "item": "b",
            "sectionDay": 2000,
            "type": "row",
          },
        ],
        "stickyHeaderIndices": [
          0,
        ],
      }
    `)
  })

  test('omits sticky indices when sticky section headers are disabled', () => {
    const result = buildSectionFlashListData({
      stickySectionHeadersEnabled: false,
      sections: [
        {
          day: 1000,
          data: [{ uuid: 'start', band: 'event', event: { event: 'start' } }]
        }
      ],
      isStickyItem: ({ item }) => item.band === 'event'
    })

    expect(result.stickyHeaderIndices).toEqual([])
  })
})

function summarizeFlashListData ({ data, stickyHeaderIndices }) {
  return {
    rows: data.map(row => compactObject({
      type: row.type,
      sectionDay: row.section?.day,
      contextItem: row.contextItem?.uuid,
      normal: row.type === 'contextHeader' ? 'context' : undefined,
      ...(row.type === 'sectionHeader' && row.contextItem ? { normal: 'section' } : {}),
      sticky: row.type === 'contextHeader' || (row.type === 'sectionHeader' && row.contextItem) ? 'section+context' : undefined,
      item: row.item?.uuid
    })),
    stickyHeaderIndices
  }
}

function compactObject (object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
}
