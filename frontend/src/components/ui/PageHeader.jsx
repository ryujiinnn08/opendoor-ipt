import BackLink from './BackLink.jsx'
import PageHeading from './PageHeading.jsx'

/**
 * The top of a page: its heading, one plain sentence about what it is for, and the page's main
 * action. On phones the action sits under the intro; on wider screens it moves to the right.
 * `tabs` (a PageTabs) goes under them, for pages that are one tab of a section. `back`
 * ({ to, label }) puts a Back link above the heading, on pages inside a list.
 */
export default function PageHeader({ title, documentTitle, intro, actions, tabs, back }) {
  return (
    <>
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-prose">
          <PageHeading title={documentTitle}>{title}</PageHeading>
          {/* A short yellow stroke under every page heading (decoration; plain in Quiet mode). */}
          <span aria-hidden="true" className="od-highlight mt-2 block h-1 w-12 rounded-full bg-yellow" />
          {intro && <p className="mt-2 text-muted">{intro}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {tabs}
    </>
  )
}
