// The Get started card's "Hide this", saved in this browser only, per person (UI_FEEDBACK_WAVE_B_PLAN B4).
const PREFIX = 'opendoor-get-started:'

export function isGetStartedHidden(key) {
  try {
    return window.localStorage.getItem(PREFIX + key) === 'hidden'
  } catch {
    return false
  }
}

export function hideGetStarted(key) {
  try {
    window.localStorage.setItem(PREFIX + key, 'hidden')
  } catch {
    // Not saved; hidden for this visit only.
  }
}

/** Whether the "You're all set" celebration was already shown to this person (shown once). */
export function wasCelebrated(key) {
  try {
    return window.localStorage.getItem(`${PREFIX}${key}:celebrated`) === '1'
  } catch {
    return true
  }
}

export function markCelebrated(key) {
  try {
    window.localStorage.setItem(`${PREFIX}${key}:celebrated`, '1')
  } catch {
    // Not remembered; it may show once more.
  }
}

/** Brings back every Get started card hidden in this browser (Account → Display). */
export function showGetStartedAgain() {
  try {
    Object.keys(window.localStorage)
      .filter((name) => name.startsWith(PREFIX))
      .forEach((name) => window.localStorage.removeItem(name))
  } catch {
    // Storage blocked: nothing was hidden.
  }
}
