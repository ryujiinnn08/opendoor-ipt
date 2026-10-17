/**
 * Something is loading: two turning squares in OpenDoor's violet instead of the words. The words
 * (`children`) are still the status screen readers hear, so nothing is lost for them. With Reduce
 * motion the squares stand still; in Windows high-contrast mode they take the system colour.
 */
export default function LoadingMessage({ children = 'Loading…' }) {
  return (
    <div role="status" className="my-6 flex justify-center">
      <span aria-hidden="true" className="od-loader" />
      <span className="sr-only">{children}</span>
    </div>
  )
}
