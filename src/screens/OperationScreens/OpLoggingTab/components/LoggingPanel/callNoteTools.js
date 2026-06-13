// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import emojiRegex from 'emoji-regex'

const EMOJI_REGEX = emojiRegex()

export const MAX_DISPLAY_EMOJIS = 4

/**
 * Combines notes from multiple callsign notes files into a single display string.
 * Collects unique leading emojis from all notes and uses the text from the last note.
 *
 * The `notes` array is expected to be sorted by source priority, and for each source,
 * by note order.
 *
 * Later sources are considered more important than earlier sources,
 * but within a source, the earlier notes are considered more important than later notes.
 * (this could have been simpler, but as usual, "historical reasons" get in the way)
 *
 * @param {Array} notes - Array of note objects with { source, call, note } properties
 * @param {Object} theirInfo - Call info with { baseCall, call } properties
 * @returns {{ note: string, emoji: string } | null} Combined note and first emoji, or null if no matches
 */
export function combineCallNotes (notes, theirInfo) {
  const matchingNotes = (notes || []).filter(
    note => note?.call === undefined || note?.call === theirInfo.baseCall || note?.call === theirInfo?.call
  )

  if (matchingNotes.length === 0) {
    return null
  }

  // Capture the order of sources
  const uniqueSources = new Set(matchingNotes.map(note => note.source))
  const sourceOrder = Array.from(uniqueSources)
    .map((source, index) => ({ source, index }))
    .reduce((acc, r) => { acc[r.source] = r.index; return acc }, {})

  // Reorder notes by source order and then reverse "within source" order
  const sortedNotes = matchingNotes.map((note, index) => ({ note, index }))
    .sort((a, b) => (sourceOrder[a.note.source] - sourceOrder[b.note.source]) || (b.index - a.index))
    .map(r => r.note)

  // Collect unique emojis from all notes
  const emojis = []
  for (const note of sortedNotes) {
    if (note.note) {
      const matches = note.note.match(EMOJI_REGEX)
      if (matches && matches[0] && !emojis.includes(matches[0])) {
        emojis.push(matches[0])
      }
    }
  }

  // Get the text from the last note's text, strip its leading emoji
  const lastNote = sortedNotes[sortedNotes.length - 1]
  let noteText = lastNote.note || ''
  const lastNoteEmojiMatch = noteText.match(EMOJI_REGEX)
  if (lastNoteEmojiMatch && noteText.startsWith(lastNoteEmojiMatch[0])) {
    noteText = noteText.slice(lastNoteEmojiMatch[0].length).trimStart()
  }

  // Combine emojis (capped) with the stripped note text
  // But we reverse the order to show the most important emoji last,
  // next to the corresponding `noteText`
  const displayEmojis = emojis.reverse().slice(0, MAX_DISPLAY_EMOJIS)
  const emojiStr = displayEmojis.reverse().join('')
  const overflowIndicator = emojis.length > MAX_DISPLAY_EMOJIS ? `+${emojis.length - MAX_DISPLAY_EMOJIS}` : ''
  const combinedNote = emojiStr ? `${emojiStr}${overflowIndicator} ${noteText}` : noteText

  return {
    note: combinedNote,
    emoji: displayEmojis.length > 0 ? displayEmojis[displayEmojis.length - 1] : '⭐️'
  }
}
