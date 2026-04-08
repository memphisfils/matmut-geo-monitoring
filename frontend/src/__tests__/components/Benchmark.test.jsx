// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api', () => ({
  createBenchmark: vi.fn(),
  fetchMetrics: vi.fn(),
  runBenchmarkStream: vi.fn()
}));

let container;
let root;

describe('Benchmark', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('shows the active project benchmark immediately', async () => {
    const { default: Benchmark } = await import('../../components/Benchmark');

    await act(async () => {
      root.render(React.createElement(Benchmark, {
        config: {
          brand: 'matmut',
          sector: 'Assurance',
          competitors: ['AXA', 'MAIF'],
          prompts: ['Quelle assurance auto choisir ?', 'Quelle alternative a matmut ?'],
          models: ['qwen3.5']
        },
        data: {
          ranking: [
            { brand: 'matmut', global_score: 90.2, mention_rate: 100, share_of_voice: 43 },
            { brand: 'AXA', global_score: 47.0, mention_rate: 50, share_of_voice: 22 },
            { brand: 'MAIF', global_score: 29.1, mention_rate: 17, share_of_voice: 15 }
          ],
          metadata: {
            timestamp: '2026-04-01T10:00:00Z',
            llms_used: ['qwen3.5']
          }
        },
        sector: 'Assurance'
      }));
    });

    expect(container.textContent).toContain('matmut contre AXA / MAIF');
    expect(container.textContent).toContain('Projet actif');
    expect(container.textContent).toContain('Classement comparatif');
    expect(container.textContent).toContain('Relancer le benchmark');
  }, 15000);
});
