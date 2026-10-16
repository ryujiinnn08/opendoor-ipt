import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import { getProfile, removePhoto, removeResume, saveProfile, uploadPhoto, uploadResume } from '../../api/candidate.js'
import { useAuth } from '../../auth/authContext.js'
import EntryList from '../../components/candidate/EntryList.jsx'
import PhotoField from '../../components/candidate/PhotoField.jsx'
import ResumeUpload from '../../components/candidate/ResumeUpload.jsx'
import Button from '../../components/ui/Button.jsx'
import CheckboxField from '../../components/ui/CheckboxField.jsx'
import ErrorSummary from '../../components/ui/ErrorSummary.jsx'
import FormField from '../../components/ui/FormField.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import useFormErrors from '../../hooks/useFormErrors.js'
import { summaryFrom } from '../../lib/errorSummary.js'
import { EMPLOYMENT_TYPES, WORK_SETUPS } from '../../lib/postingOptions.js'
import { DISABILITY_TYPES, EDUCATION_LEVELS } from '../../lib/profileOptions.js'
import PageTabs from '../../components/ui/PageTabs.jsx'
import { PROFILE_TABS } from '../../lib/sectionTabs.js'

const SAVED = 'Your profile is saved.'
const DISABILITY_HINT =
  'Optional. OpenDoor never uses this to match or filter jobs. Employers see it only if you tick the box below and apply to one of their jobs.'
const TEXT_FIELDS = ['name', 'headline', 'city', 'province', 'contact_number', 'about', 'skills', 'trainings', 'languages', 'disability_type']
const EXPERIENCE_FIELDS = ['job_title', 'company', 'started_on', 'ended_on', 'description']
const EDUCATION_FIELDS = ['level', 'school', 'course', 'year_finished']

let nextKey = 0
const withKey = (item) => ({ ...item, _key: `entry-${nextKey++}` })
const blankExperience = () => withKey({ job_title: '', company: '', started_on: '', ended_on: '', is_current: false, description: '' })
const blankEducation = () => withKey({ level: '', school: '', course: '', year_finished: '', is_studying: false })
const withoutKey = ({ _key, ...item }) => item

/** The form's values: '' instead of null, entries with keys for React. */
function valuesFrom(profile) {
  const text = Object.fromEntries(TEXT_FIELDS.map((field) => [field, profile[field] ?? '']))
  const blankToEmpty = (item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value ?? '']))
  return {
    ...text,
    show_disability: profile.show_disability,
    show_photo_to_employers: Boolean(profile.show_photo_to_employers),
    open_to_work_setups: profile.open_to_work_setups ?? [],
    open_to_employment_types: profile.open_to_employment_types ?? [],
    experiences: profile.experiences.map((item) => withKey(blankToEmpty(item))),
    educations: profile.educations.map((item) => withKey({ ...blankToEmpty(item), year_finished: String(item.year_finished ?? '') })),
  }
}

/** Every field id in page order, so the error summary lists problems top to bottom. */
function fieldOrder(values) {
  return [
    ...TEXT_FIELDS.slice(0, 5),
    'about',
    ...values.experiences.flatMap((_, index) => EXPERIENCE_FIELDS.map((field) => `experiences-${index}-${field}`)),
    ...values.educations.flatMap((_, index) => EDUCATION_FIELDS.map((field) => `educations-${index}-${field}`)),
    'skills',
    'trainings',
    'languages',
    'disability_type',
  ]
}

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className="border-t border-border py-8 first:border-t-0">
      <h2 id={`${id}-heading`} tabIndex={-1} className="mb-4 text-2xl font-bold outline-none focus-visible:outline-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * My profile (plan PHASE_3 §4.1): one column of sections. Save profile saves everything except
 * the résumé, which uploads on its own. Every field is optional except the name.
 */
export default function ProfilePage() {
  const { refresh } = useAuth()
  const announce = useAnnounce()
  const { hash } = useLocation()
  const [profile, setProfile] = useState(null)
  const [values, setValues] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { errors, generalError, focusKey, show, clear } = useFormErrors()

  useEffect(() => {
    let active = true
    getProfile()
      .then((loaded) => {
        if (!active) return
        setProfile(loaded)
        setValues(valuesFrom(loaded))
        setLoadError(null)
      })
      .catch((error) => active && setLoadError(generalErrorFrom(error) ?? 'Something went wrong. Please try again.'))
    return () => {
      active = false
    }
  }, [attempt])

  // A link such as the dashboard's "Skills" (#profile-skills) starts at that section once it exists.
  const loaded = values !== null
  useEffect(() => {
    if (!loaded || !hash) return
    const heading = document.getElementById(`${hash.slice(1)}-heading`)
    heading?.scrollIntoView?.({ block: 'start' })
    heading?.focus()
  }, [loaded, hash])

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }
  const toggleOpenTo = (field, value, on) => {
    setValues((current) => ({ ...current, [field]: on ? [...current[field], value] : current[field].filter((item) => item !== value) }))
    setSaved(false)
  }
  const setEntries = (field) => (items) => {
    // Entry errors are tied to positions; after an entry is added or removed they would point at
    // the wrong one, so they are cleared until the next save.
    if (items.length !== values[field].length) clear()
    setValues((current) => ({ ...current, [field]: items }))
    setSaved(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    if (!values.name.trim()) return show({ name: 'Enter your full name.' })

    setSaving(true)
    try {
      const nameChanged = values.name.trim() !== profile.name
      const updated = await saveProfile({
        ...Object.fromEntries(TEXT_FIELDS.map((field) => [field, values[field]])),
        show_disability: values.show_disability,
        show_photo_to_employers: values.show_photo_to_employers,
        open_to_work_setups: values.open_to_work_setups,
        open_to_employment_types: values.open_to_employment_types,
        // A hidden field (the end month of a current job, the year of current studies) isn't sent.
        experiences: values.experiences.map((item) => ({ ...withoutKey(item), ended_on: item.is_current ? null : item.ended_on })),
        educations: values.educations.map((item) => ({ ...withoutKey(item), year_finished: item.is_studying ? null : item.year_finished })),
      })
      clear()
      setProfile(updated)
      setSaved(true)
      announce(SAVED)
      // The portal header shows the account name.
      if (nameChanged) refresh?.()
    } catch (error) {
      // "experiences.0.ended_on" → the field "experiences-0-ended_on".
      const fieldErrors = Object.fromEntries(Object.entries(fieldErrorsFrom(error)).map(([field, message]) => [field.replaceAll('.', '-'), message]))
      show(fieldErrors, Object.keys(fieldErrors).length ? null : generalErrorFrom(error))
    } finally {
      setSaving(false)
    }
  }

  const resumeAction = useCallback(async (action) => {
    try {
      setProfile(await action())
    } catch (error) {
      throw new Error(fieldErrorsFrom(error).resume ?? generalErrorFrom(error) ?? 'Something went wrong. Please try again.')
    }
  }, [])

  const experienceFields = (item, index, change) => {
    const fieldId = (field) => `experiences-${index}-${field}`
    const field = (name, props) => ({
      id: fieldId(name),
      value: item[name],
      onChange: (event) => change(name, event.target.value),
      error: errors[fieldId(name)],
      ...props,
    })
    return (
      <>
        <FormField {...field('job_title')} label="Job title" maxLength={150} />
        <FormField {...field('company')} label="Company or employer" maxLength={150} />
        <FormField {...field('started_on')} label="Started" hint="Month and year, such as 2023-06" type="month" />
        <CheckboxField
          id={fieldId('is_current')}
          label="I work here now"
          checked={item.is_current}
          onChange={(event) => change('is_current', event.target.checked)}
        />
        {!item.is_current && <FormField {...field('ended_on')} label="Ended" hint="Month and year, such as 2024-12" type="month" />}
        <FormField {...field('description')} as="textarea" rows={3} label="What you did" optional maxLength={2000} />
      </>
    )
  }

  const educationFields = (item, index, change) => {
    const fieldId = (field) => `educations-${index}-${field}`
    return (
      <>
        <SelectField
          id={fieldId('level')}
          label="Level"
          placeholder="Choose a level"
          options={EDUCATION_LEVELS}
          value={item.level}
          onChange={(event) => change('level', event.target.value)}
          error={errors[fieldId('level')]}
        />
        <FormField
          id={fieldId('school')}
          label="School"
          value={item.school}
          onChange={(event) => change('school', event.target.value)}
          error={errors[fieldId('school')]}
          maxLength={200}
        />
        <FormField
          id={fieldId('course')}
          label="Course or strand"
          optional
          value={item.course}
          onChange={(event) => change('course', event.target.value)}
          error={errors[fieldId('course')]}
          maxLength={150}
        />
        <CheckboxField
          id={fieldId('is_studying')}
          label="Still studying"
          checked={item.is_studying}
          onChange={(event) => change('is_studying', event.target.checked)}
        />
        {!item.is_studying && (
          <FormField
            id={fieldId('year_finished')}
            label="Year finished"
            optional
            inputMode="numeric"
            value={item.year_finished}
            onChange={(event) => change('year_finished', event.target.value)}
            error={errors[fieldId('year_finished')]}
            maxLength={4}
            inputClassName="max-w-32"
          />
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My profile"
        intro="Your job application profile. Every part is optional, but employers learn more about you from a fuller profile."
        tabs={<PageTabs label="Profile" items={PROFILE_TABS} />}
      />

      {loadError && (
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Button variant="secondary" className="mt-3" onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </Button>
        </Notice>
      )}

      {!values && !loadError && <LoadingMessage>Loading your profile…</LoadingMessage>}

      {values && (
        <form onSubmit={handleSubmit} noValidate className="mt-8 max-w-3xl">
          <ErrorSummary errors={summaryFrom(errors, fieldOrder(values), generalError)} focusKey={focusKey} />

          <Section id="profile-photo" title="Photo">
            <PhotoField
              name={values.name || profile.name}
              profile={profile}
              onUpload={async (file) => setProfile(await uploadPhoto(file))}
              onRemove={async () => setProfile(await removePhoto())}
            />
          </Section>

          <Section id="profile-basic" title="Basic information">
            <FormField id="name" label="Full name" value={values.name} onChange={update('name')} error={errors.name} maxLength={255} autoComplete="name" />
            <FormField
              id="headline"
              label="Headline"
              optional
              hint='Such as "Bookkeeper with 3 years of experience"'
              value={values.headline}
              onChange={update('headline')}
              error={errors.headline}
              maxLength={150}
              inputClassName="max-w-xl"
            />
            <FormField id="city" label="City or municipality" optional value={values.city} onChange={update('city')} error={errors.city} maxLength={100} />
            <FormField id="province" label="Province" optional value={values.province} onChange={update('province')} error={errors.province} maxLength={100} />
            <FormField
              id="contact_number"
              label="Contact number"
              optional
              hint="Such as 0917 123 4567"
              type="tel"
              autoComplete="tel"
              value={values.contact_number}
              onChange={update('contact_number')}
              error={errors.contact_number}
              maxLength={30}
            />
            <p className="font-bold">Email</p>
            <p>{profile.email}</p>
            <p className="text-muted">The email you log in with. It can't be changed here.</p>
          </Section>

          <Section id="profile-about" title="About me">
            <FormField
              id="about"
              as="textarea"
              rows={5}
              label="A short summary in your own words"
              optional
              value={values.about}
              onChange={update('about')}
              error={errors.about}
              maxLength={2000}
              inputClassName="max-w-2xl"
            />
          </Section>

          <Section id="profile-experience" title="Work experience">
            <EntryList
              id="experiences"
              itemLabel="Work experience"
              addLabel="Add work experience"
              items={values.experiences}
              onChange={setEntries('experiences')}
              newItem={blankExperience}
              firstFieldId={(index) => `experiences-${index}-job_title`}
              renderFields={experienceFields}
            />
          </Section>

          <Section id="profile-education" title="Education">
            <EntryList
              id="educations"
              itemLabel="Education"
              addLabel="Add education"
              items={values.educations}
              onChange={setEntries('educations')}
              newItem={blankEducation}
              firstFieldId={(index) => `educations-${index}-level`}
              renderFields={educationFields}
            />
          </Section>

          <Section id="profile-skills" title="Skills">
            <FormField
              id="skills"
              as="textarea"
              rows={3}
              label="Your skills"
              optional
              hint="Separate them with commas, such as Microsoft Excel, bookkeeping"
              value={values.skills}
              onChange={update('skills')}
              error={errors.skills}
              maxLength={1000}
              inputClassName="max-w-2xl"
            />
          </Section>

          <Section id="profile-trainings" title="Trainings and certifications">
            <FormField
              id="trainings"
              as="textarea"
              rows={3}
              label="Your trainings and certifications"
              optional
              hint='One per line, such as "TESDA Bookkeeping NC III, 2024"'
              value={values.trainings}
              onChange={update('trainings')}
              error={errors.trainings}
              maxLength={2000}
              inputClassName="max-w-2xl"
            />
          </Section>

          <Section id="profile-languages" title="Languages">
            <FormField
              id="languages"
              label="Languages you speak or sign"
              optional
              hint="Such as Filipino, English, Filipino Sign Language"
              value={values.languages}
              onChange={update('languages')}
              error={errors.languages}
              maxLength={255}
              inputClassName="max-w-xl"
            />
          </Section>

          <Section id="profile-open-to" title="Open to">
            <p className="max-w-prose text-muted">The kinds of work you want. Find jobs starts with these filters, and you can switch them off there.</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {[
                ['open_to_work_setups', 'Work setup', WORK_SETUPS],
                ['open_to_employment_types', 'Employment type', EMPLOYMENT_TYPES],
              ].map(([field, legend, options]) => (
                <fieldset key={field}>
                  <legend className="font-semibold">{legend}</legend>
                  <div className="mt-1">
                    {options.map((option) => (
                      <CheckboxField
                        key={option.value}
                        id={`${field}-${option.value}`}
                        label={option.label}
                        checked={values[field].includes(option.value)}
                        onChange={(event) => toggleOpenTo(field, option.value, event.target.checked)}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </Section>

          <Section id="profile-resume" title="Résumé">
            <p className="mb-4 max-w-prose">
              OpenDoor makes a résumé from this profile.{' '}
              <Link to="/candidate/profile/resume" className="font-bold text-primary underline underline-offset-4 hover:no-underline">
                View My résumé
              </Link>
            </p>
            <ResumeUpload
              resume={profile.resume}
              onUpload={(file) => resumeAction(() => uploadResume(file))}
              onRemove={() => resumeAction(removeResume)}
            />
          </Section>

          <Section id="profile-private" title="Private">
            <SelectField
              id="disability_type"
              label="Disability type (optional)"
              hint={DISABILITY_HINT}
              placeholder="Not stated"
              options={DISABILITY_TYPES}
              value={values.disability_type}
              onChange={update('disability_type')}
              error={errors.disability_type}
            />
            <CheckboxField
              id="show_disability"
              label="Show my disability type to employers I apply to"
              checked={values.show_disability}
              onChange={update('show_disability')}
            />
            <CheckboxField
              id="show_photo_to_employers"
              label="Show my photo to employers I apply to"
              hint="Off unless you turn it on. A photo can show things about you that employers don't need to decide, so OpenDoor keeps it to you by default."
              checked={values.show_photo_to_employers}
              onChange={update('show_photo_to_employers')}
            />
          </Section>

          {saved && (
            <Notice tone="success" className="mb-6">
              <p>{SAVED}</p>
              <Link to="/candidate/profile/resume" className={TEXT_LINK}>
                View My résumé
              </Link>
            </Notice>
          )}
          <Button type="submit" loading={saving} loadingText="Saving…">
            Save profile
          </Button>
        </form>
      )}
    </>
  )
}
