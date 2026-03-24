import { describe, it, expect } from 'vitest'

describe('Benchmark Component', () => {
  it('should be importable', async () => {
    const Benchmark = await import('../../components/Benchmark')
    expect(Benchmark.default).toBeDefined()
  })
})
