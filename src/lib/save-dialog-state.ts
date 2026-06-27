import { ref } from 'vue'

export const saveDialogVisible = ref(false)
export const saveDialogTitle = ref('Save As')
export const saveDialogSuggestedName = ref('')
export const saveDialogHint = ref('')

let resolver: ((filename: string | null) => void) | null = null

export function openSaveAsDialog(
  suggestedName: string,
  title: string,
  hint = '',
): Promise<string | null> {
  saveDialogSuggestedName.value = suggestedName
  saveDialogTitle.value = title
  saveDialogHint.value = hint
  saveDialogVisible.value = true

  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function confirmSaveAsDialog(filename: string) {
  saveDialogVisible.value = false
  resolver?.(filename)
  resolver = null
}

export function cancelSaveAsDialog() {
  saveDialogVisible.value = false
  resolver?.(null)
  resolver = null
}
