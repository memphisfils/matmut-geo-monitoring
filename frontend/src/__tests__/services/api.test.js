import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('API Service cache behavior', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('caches current user responses until force refresh', async () => {
    fetch
      .mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: true, user: { id: 1, email: 'a@example.com' } })
      })

    const api = await import('../../services/api')

    const first = await api.fetchCurrentUser()
    const second = await api.fetchCurrentUser()
    const forced = await api.fetchCurrentUser({ force: true })

    expect(first).toEqual(second)
    expect(forced).toEqual(first)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('clears auth cache after logout', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: { id: 1, email: 'a@example.com' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false, user: null })
      })

    const api = await import('../../services/api')

    await api.fetchCurrentUser()
    await api.logoutUser()
    const currentUser = await api.fetchCurrentUser()

    expect(currentUser).toEqual({ authenticated: false, user: null })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('caches project list and refreshes after activation', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 1, brand: 'Brand A' }])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 1, brand: 'Brand A' }, { id: 2, brand: 'Brand B' }])
      })

    const api = await import('../../services/api')

    const first = await api.fetchProjects()
    const cached = await api.fetchProjects()
    await api.activateProject(1)
    const refreshed = await api.fetchProjects()

    expect(first).toEqual(cached)
    expect(refreshed).toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
