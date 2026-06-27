import { ref } from 'vue'

export const confirmDialogVisible = ref(false)
export const confirmDialogTitle = ref('Confirm')
export const confirmDialogMessage = ref('')
export const confirmDialogConfirmLabel = ref('Confirm')
export const confirmDialogCancelLabel = ref('Cancel')

let resolver: ((confirmed: boolean) => void) | null = null

export function openConfirmDialog(options: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}): Promise<boolean> {
  confirmDialogTitle.value = options.title
  confirmDialogMessage.value = options.message
  confirmDialogConfirmLabel.value = options.confirmLabel ?? 'Confirm'
  confirmDialogCancelLabel.value = options.cancelLabel ?? 'Cancel'
  confirmDialogVisible.value = true

  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function finishConfirmDialog(confirmed: boolean) {
  confirmDialogVisible.value = false
  resolver?.(confirmed)
  resolver = null
}
