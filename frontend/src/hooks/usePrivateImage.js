import { useEffect, useState } from 'react'

/**
 * A private image (a profile photo) fetched with the session and shown from a blob: URL. `key`
 * changes when the image does (e.g., the photo's version); without a key nothing is fetched.
 * Only image types are shown, so a stored file can never render as a page.
 */
export default function usePrivateImage(load, key) {
  const [image, setImage] = useState(null) // { key, url }

  useEffect(() => {
    if (!key || typeof URL.createObjectURL !== 'function') return
    let active = true
    let url = null
    load()
      .then((blob) => {
        if (!active || !['image/jpeg', 'image/png'].includes(blob?.type)) return
        url = URL.createObjectURL(blob)
        setImage({ key, url })
      })
      .catch(() => {})
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [load, key])

  return key && image?.key === key ? image.url : null
}
