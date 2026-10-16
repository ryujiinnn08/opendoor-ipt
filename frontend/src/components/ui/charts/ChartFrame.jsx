import { useId } from 'react'

/**
 * A chart's frame (UI_FEEDBACK_WAVE_B_PLAN B3, dataviz skill): a figure whose caption holds the
 * title and the one-line takeaway, a legend in words for two or more series, the drawing (hidden
 * from screen readers), and "Show as table" with the same numbers. Nothing depends on colour alone.
 *
 * table: { columns: [label, ...], rows: [[rowLabel, ...values]] }
 */
export default function ChartFrame({ title, summary, series = [], table, children, className = '' }) {
  const id = useId()

  return (
    <figure aria-labelledby={`${id}-title`} className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
      <figcaption>
        <h3 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted">{summary}</p>
      </figcaption>

      {series.length > 1 && (
        <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {series.map((item) => (
            <li key={item.key} className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div aria-hidden="true" className="mt-3">
        {children}
      </div>

      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-primary underline-offset-4 hover:underline">
          Show as table
        </summary>
        <div className="overflow-x-auto">
          <table className="mt-1 w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-border text-left">
                {table.columns.map((column, index) => (
                  <th key={column} scope="col" className={`py-2 pr-4 font-bold ${index > 0 ? 'text-right' : ''}`}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map(([label, ...values]) => (
                <tr key={label} className="border-b border-border last:border-b-0">
                  <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                    {label}
                  </th>
                  {values.map((value, index) => (
                    <td key={index} className="py-1.5 pr-4 text-right tabular-nums">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
