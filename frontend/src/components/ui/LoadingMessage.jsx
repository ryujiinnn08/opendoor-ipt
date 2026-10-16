export default function LoadingMessage({ children = 'Loading…' }) {
  return (
    <p role="status" className="my-4 rounded-lg border-2 border-accent bg-info-soft p-4 font-bold text-accent">
      {children}
    </p>
  )
}
