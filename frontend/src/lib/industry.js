// The employer Industry field's values (IndustryField): a job category or "Others" with the
// person's own words, saved as one string.

// The "Others" choice. Not a category name, so a category called "Others" can't clash with it.
export const OTHER_INDUSTRY = '__other__'

/**
 * A stored industry as the form's two values: a category from the list, or "Others" with the
 * person's own words. Industries are saved as plain text, so nothing is lost either way.
 */
export function splitIndustry(industry, categories) {
  // Already split (effects can run twice): leave the person's words alone.
  if (industry === OTHER_INDUSTRY) return {}
  if (!industry || categories.some((category) => category.name === industry)) return { industry, industryOther: '' }
  return { industry: OTHER_INDUSTRY, industryOther: industry }
}

/** The text to save: the chosen category, or what the person typed under "Others". */
export function joinIndustry({ industry, industryOther }) {
  return industry === OTHER_INDUSTRY ? industryOther.trim() : industry
}

/** Client-side errors for the industry, keyed like the fields. */
export function industryErrors({ industry, industryOther }) {
  if (!industry) return { industry: "Choose the company's industry." }
  if (industry === OTHER_INDUSTRY && !industryOther.trim()) return { industryOther: "Enter the company's industry." }
  return {}
}

/** Where the error summary should send focus for an industry error. */
export function industryErrorId({ industry }) {
  return industry === OTHER_INDUSTRY ? 'industryOther' : 'industry'
}
