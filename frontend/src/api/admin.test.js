import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client.js', () => ({ default: { post: vi.fn() } }))

const client = (await import('./client.js')).default
const { addAdmin } = await import('./admin.js')

describe('addAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the temporary password, which is beside the data, not in it', async () => {
    client.post.mockResolvedValue({
      data: { data: { id: 12, name: 'Rosa Lim' }, temporary_password: 'Kq7!mPz2Rt9@wXy4' },
    })

    expect(await addAdmin({ name: 'Rosa Lim', email: 'rosa@opendoor.test' })).toEqual({
      user: { id: 12, name: 'Rosa Lim' },
      temporaryPassword: 'Kq7!mPz2Rt9@wXy4',
    })
    expect(client.post).toHaveBeenCalledWith('/api/admin/users', { name: 'Rosa Lim', email: 'rosa@opendoor.test' })
  })
})
