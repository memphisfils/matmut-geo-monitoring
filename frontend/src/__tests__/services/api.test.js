import { describe, it, expect, vi } from 'vitest'

describe('API Service', () => {
  it('should export required functions', async () => {
    const api = await import('../../services/api')
    
    expect(api.fetchMetrics).toBeDefined()
    expect(api.fetchExport).toBeDefined()
    expect(api.checkStatus).toBeDefined()
    expect(api.runAnalysisStream).toBeDefined()
  })
})
