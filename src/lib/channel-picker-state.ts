import { ref } from 'vue'
import type { MidiChannelCandidate } from '@/lib/types'

export const channelPickerVisible = ref(false)
export const channelPickerCandidates = ref<MidiChannelCandidate[]>([])
export const channelPickerFilename = ref('')

let resolver: ((channels: number[] | null) => void) | null = null

export function openChannelPickerDialog(
  candidates: MidiChannelCandidate[],
  filename: string,
): Promise<number[] | null> {
  channelPickerCandidates.value = candidates
  channelPickerFilename.value = filename
  channelPickerVisible.value = true

  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function finishChannelPickerDialog(channels: number[] | null) {
  channelPickerVisible.value = false
  resolver?.(channels)
  resolver = null
}
