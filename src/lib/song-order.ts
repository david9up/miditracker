export function moveSongOrderSlot(order: number[], from: number, to: number): number[] {
  if (from === to || from < 0 || from >= order.length || to < 0 || to >= order.length) {
    return order
  }

  const next = [...order]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

export function removeSongOrderSlot(order: number[], index: number): number[] {
  if (order.length <= 1 || index < 0 || index >= order.length) {
    return order
  }

  return order.filter((_, slot) => slot !== index)
}

export function insertSongOrderSlot(order: number[], index: number, patternIndex: number): number[] {
  const next = [...order]
  const clampedIndex = Math.max(0, Math.min(next.length, index))
  next.splice(clampedIndex, 0, patternIndex)
  return next
}

export function appendSongOrderSlot(order: number[], patternIndex: number): number[] {
  return [...order, patternIndex]
}

export function adjustOrderIndexAfterMove(
  selectedIndex: number,
  from: number,
  to: number,
): number {
  if (selectedIndex === from) return to
  if (from < selectedIndex && to >= selectedIndex) return selectedIndex - 1
  if (from > selectedIndex && to <= selectedIndex) return selectedIndex + 1
  return selectedIndex
}
