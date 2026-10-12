// The profile sections the dashboard asks for (F2.5) and the Apply page warns about, with
// where each one is filled in.
export const PROFILE_SECTIONS = {
  headline: { label: 'Headline', to: '/candidate/profile#profile-basic' },
  location: { label: 'City or municipality and province', to: '/candidate/profile#profile-basic' },
  contact_number: { label: 'Contact number', to: '/candidate/profile#profile-basic' },
  education: { label: 'Education', to: '/candidate/profile#profile-education' },
  skills: { label: 'Skills', to: '/candidate/profile#profile-skills' },
  needs: { label: 'Accommodation needs', to: '/candidate/needs' },
}

/** The empty sections of a profile (CandidateProfileResource), in the dashboard's order. Needs aren't in it. */
export function emptyProfileSections(profile) {
  const empty = {
    headline: !profile.headline,
    location: !profile.city || !profile.province,
    contact_number: !profile.contact_number,
    education: !profile.educations?.length,
    skills: !profile.skills,
  }
  return Object.keys(empty).filter((key) => empty[key])
}
