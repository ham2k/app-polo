// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { combineCallNotes } from './callNoteTools'

describe('combineCallNotes', () => {
  const wa1wInfo = { baseCall: 'W1AW', call: 'W1AW' }

  it('returns null when notes array is empty', () => {
    expect(combineCallNotes([], wa1wInfo)).toBeNull()
  })

  it('returns null when notes is null', () => {
    expect(combineCallNotes(null, wa1wInfo)).toBeNull()
  })

  it('returns null when no notes match the call', () => {
    const notes = [
      { call: 'K2ABC', note: '🎉 Different call' }
    ]
    expect(combineCallNotes(notes, wa1wInfo)).toBeNull()
  })

  describe('single note', () => {
    it('returns note with emoji', () => {
      const notes = [{ call: 'W1AW', note: '🍄 QRQ Crew #9' }]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('🍄 QRQ Crew #9')
      expect(result.emoji).toBe('🍄')
    })

    it('returns note without emoji and default star emoji', () => {
      const notes = [{ call: 'W1AW', note: 'Just text' }]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('Just text')
      expect(result.emoji).toBe('⭐️')
    })

    it('matches notes with undefined call', () => {
      const notes = [{ note: '🎉 Matches any call' }]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('🎉 Matches any call')
      expect(result.emoji).toBe('🎉')
    })

    it('matches baseCall', () => {
      const notes = [{ call: 'W1AW', note: '⚓ Base call match' }]
      const infoWithPrefix = { baseCall: 'W1AW', call: 'W1AW/P' }
      const result = combineCallNotes(notes, infoWithPrefix)
      expect(result.note).toBe('⚓ Base call match')
    })
  })

  describe('multiple notes', () => {
    it('combines emojis from multiple notes', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 DitDit Club' },
        { call: 'W1AW', note: '⚓ QRQ Crew #9' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('⚓🍄 DitDit Club')
      expect(result.emoji).toBe('🍄')
    })

    it('uses text from last note, stripped of its emoji', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 First note text' },
        { call: 'W1AW', note: '⚓ Last note text' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('⚓🍄 First note text')
    })

    it('deduplicates same emoji from multiple notes', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 Club A' },
        { call: 'W1AW', note: '🍄 Club B' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('🍄 Club A')
    })

    it('handles mix of notes with and without emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 Has emoji' },
        { call: 'W1AW', note: 'No emoji here' },
        { call: 'W1AW', note: '⚓ Also has emoji' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('⚓🍄 Has emoji')
    })
  })

  describe('emoji cap and overflow', () => {
    it('displays up to 4 emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 One' },
        { call: 'W1AW', note: '⚓ Two' },
        { call: 'W1AW', note: '🎉 Three' },
        { call: 'W1AW', note: '🐧 Four' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('🐧🎉⚓🍄 One')
    })

    it('shows +N overflow indicator when more than 4 emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 One' },
        { call: 'W1AW', note: '⚓ Two' },
        { call: 'W1AW', note: '🎉 Three' },
        { call: 'W1AW', note: '🐧 Four' },
        { call: 'W1AW', note: '🌊 Five' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('🐧🎉⚓🍄+1 One')
    })

    it('shows correct overflow count for many emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 One' },
        { call: 'W1AW', note: '⚓ Two' },
        { call: 'W1AW', note: '🎉 Three' },
        { call: 'W1AW', note: '🐧 Four' },
        { call: 'W1AW', note: '🌊 Five' },
        { call: 'W1AW', note: '❄️ Six' },
        { call: 'W1AW', note: '👑 Seven' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('🐧🎉⚓🍄+3 One')
    })
  })

  describe('multiple notes from multiple sources', () => {
    const ki2dInfo = { baseCall: 'KI2D', call: 'KI2D' }
    it('combines notes from multiple sources', () => {
      const notes = [
        { call: 'KI2D', note: '🌄 HVCDX Member', source: 'HVCDX Members' },
        { call: 'KI2D', note: '🤩 Ham2K PoLo Creator', source: 'Ham2K Notes' },
        { call: 'KI2D', note: '☕️ Ham2K Supporter', source: 'Ham2K Notes' }
      ]
      const result = combineCallNotes(notes, ki2dInfo)
      expect(result.note).toBe('🌄☕️🤩 Ham2K PoLo Creator')
      expect(result.emoji).toBe('🤩')
    })

    it('combines notes from multiple sources in different order', () => {
      const notes = [
        { call: 'KI2D', note: '🤩 Ham2K PoLo Creator', source: 'Ham2K Notes' },
        { call: 'KI2D', note: '☕️ Ham2K Supporter', source: 'Ham2K Notes' },
        { call: 'KI2D', note: '🌄 HVCDX Member', source: 'HVCDX Members' }
      ]
      const result = combineCallNotes(notes, ki2dInfo)
      expect(result.note).toBe('☕️🤩🌄 HVCDX Member')
      expect(result.emoji).toBe('🌄')
    })
  })

  describe('call matching', () => {
    it('filters out notes that do not match the call', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 Matches' },
        { call: 'K2XYZ', note: '⚓ Does not match' },
        { call: 'W1AW', note: '🎉 Also matches' }
      ]
      const result = combineCallNotes(notes, wa1wInfo)
      expect(result.note).toBe('🎉🍄 Matches')
    })
  })
})
