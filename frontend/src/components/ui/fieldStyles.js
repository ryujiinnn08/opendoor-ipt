// The Figma Field, Checkbox and Radio components (UI_REVAMP_PLAN §4.2): 48 px fields with an
// 8 px radius and a 3:1 border; the error state is a red border plus the message above it.
export function inputClasses(hasError, extra = '') {
  return [
    'block min-h-12 w-full rounded-md border-2 bg-surface px-4 py-3 text-text placeholder:text-muted',
    hasError ? 'border-danger' : 'border-input',
    extra,
  ].join(' ')
}

// The hint between the label and the field.
export const HINT = 'mt-1 text-sm text-muted'

// 26 px boxes drawn over the real inputs, so they stay native and keyboard-operable. In Windows
// high-contrast mode the browser's own control comes back.
export const CHECKBOX =
  'peer col-start-1 row-start-1 size-6.5 shrink-0 cursor-pointer appearance-none rounded-[6px] border-2 border-input bg-surface checked:border-primary checked:bg-primary forced-colors:appearance-auto'

export const RADIO =
  'size-6.5 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-input bg-surface checked:border-[7px] checked:border-primary forced-colors:appearance-auto'

export function describedBy(...ids) {
  const joined = ids.filter(Boolean).join(' ')
  return joined || undefined
}
