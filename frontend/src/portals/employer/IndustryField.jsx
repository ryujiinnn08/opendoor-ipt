import FormField from '../../components/ui/FormField.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import { OTHER_INDUSTRY } from '../../lib/industry.js'

/**
 * Industry as a real list: a <select> of the job categories plus "Others", which shows a text
 * field for the person's own industry. A <select> can always be changed; the old <input list>
 * only suggested the option already typed in.
 */
export default function IndustryField({ values, categories, errors, onChange }) {
  const other = values.industry === OTHER_INDUSTRY

  return (
    <>
      <SelectField
        id="industry"
        label="Industry"
        hint="Choose the closest one, or Others to type your own."
        placeholder="Choose an industry"
        options={[
          ...categories.map((category) => ({ value: category.name, label: category.name })),
          { value: OTHER_INDUSTRY, label: 'Others' },
        ]}
        value={values.industry}
        onChange={(event) => onChange({ industry: event.target.value })}
        error={other ? undefined : errors.industry}
      />
      {other && (
        <FormField
          id="industryOther"
          label="Your industry"
          hint="For example, Agriculture or Logistics."
          value={values.industryOther}
          onChange={(event) => onChange({ industryOther: event.target.value })}
          error={errors.industryOther ?? errors.industry}
          maxLength={100}
        />
      )}
    </>
  )
}
