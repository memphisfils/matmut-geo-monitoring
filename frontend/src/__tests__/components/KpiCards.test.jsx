import { describe, it, expect } from 'vitest'

describe('KpiCards Component', () => {
  it('should be importable', async () => {
    const KpiCards = await import('../../components/KpiCards')
    expect(KpiCards.default).toBeDefined()
  })
})
