/**
 * Why a list is empty and what to do next, such as a "Clear all filters" button.
 */
export default function EmptyState({ action, children }) {
  return (
    <div className="rounded-lg border-2 border-border bg-surface p-6">
      <p className="max-w-prose text-lg">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
