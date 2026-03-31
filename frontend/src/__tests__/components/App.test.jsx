// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  fetchMetrics: vi.fn(),
  fetchExport: vi.fn(),
  checkStatus: vi.fn(),
  fetchHistory: vi.fn(),
  runAnalysisStream: vi.fn(),
  generateTrendHistory: vi.fn(() => []),
  DEMO_DATA_FACTORY: vi.fn(() => ({ ranking: [] })),
  fetchSession: vi.fn(),
  fetchCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  signupUser: vi.fn(),
  loginWithGoogle: vi.fn(),
  getGoogleClientId: vi.fn(() => ''),
  activateProject: vi.fn(),
  fetchProjects: vi.fn(),
  logoutUser: vi.fn()
}))

vi.mock('../../services/api', () => apiMocks)

vi.mock('../../components/LandingPage', () => ({
  default: ({ onStart }) => React.createElement('button', { onClick: onStart }, 'landing-page')
}))

vi.mock('../../components/AuthPage', () => ({
  default: () => React.createElement('div', null, 'auth-page')
}))

vi.mock('../../components/Onboarding', () => ({
  default: ({ onComplete }) => React.createElement(
    'div',
    null,
    React.createElement('div', null, 'onboarding-view'),
    React.createElement('button', {
      onClick: () => onComplete({
        brand: 'Nova',
        sector: 'Assurance',
        competitors: [],
        prompts: []
      })
    }, 'complete-onboarding')
  )
}))

vi.mock('../../components/WorkspaceHome', () => ({
  default: ({ projects, onCreateAnalysis, onProjectSelect }) => React.createElement(
    'div',
    null,
    React.createElement('div', null, `workspace-home:${projects.length}`),
    React.createElement('button', { onClick: onCreateAnalysis }, 'workspace-create'),
    React.createElement('button', { onClick: () => projects[0] && onProjectSelect(projects[0]) }, 'workspace-open')
  )
}))

vi.mock('../../components/ProjectsPanel', () => ({
  default: ({ projects }) => React.createElement('div', null, `projects-panel:${projects.length}`)
}))

vi.mock('../../components/Benchmark', () => ({
  default: () => React.createElement('div', null, 'benchmark-view')
}))

vi.mock('../../components/AlertsPanel', () => ({
  default: () => React.createElement('div', null, 'alerts-view')
}))

vi.mock('../../components/AccountPanel', () => ({
  default: ({ onLogout }) => React.createElement(
    'div',
    null,
    React.createElement('div', null, 'account-view'),
    React.createElement('button', { onClick: onLogout }, 'account-logout')
  )
}))

vi.mock('../../components/PromptComparator', () => ({
  default: () => React.createElement('div', null, 'prompt-view')
}))

vi.mock('../../components/Sidebar', () => ({
  default: ({ onTabChange }) => React.createElement(
    'div',
    null,
    React.createElement('button', { onClick: () => onTabChange('account') }, 'nav-account'),
    React.createElement('button', { onClick: () => onTabChange('projects') }, 'nav-projects')
  )
}))

vi.mock('../../components/TopNavbar', () => ({
  default: () => React.createElement('div', null, 'top-navbar')
}))

vi.mock('../../components/AnalysisProgress', () => ({
  default: () => React.createElement('div', null, 'analysis-progress')
}))

vi.mock('../../components/ExportButton', () => ({
  default: () => React.createElement('button', null, 'export-button')
}))

vi.mock('../../components/tabs/DashboardOverviewTab', () => ({
  default: () => React.createElement('div', null, 'dashboard-overview')
}))

vi.mock('../../components/tabs/HistoryTab', () => ({
  default: () => React.createElement('div', null, 'history-tab')
}))

vi.mock('../../components/tabs/KeywordsTab', () => ({
  default: () => React.createElement('div', null, 'keywords-tab')
}))

vi.mock('../../components/tabs/SentimentTab', () => ({
  default: () => React.createElement('div', null, 'sentiment-tab')
}))

vi.mock('../../components/tabs/LLMStatusTab', () => ({
  default: () => React.createElement('div', null, 'llm-tab')
}))

vi.mock('../../components/tabs/ExportsTab', () => ({
  default: () => React.createElement('div', null, 'exports-tab')
}))

let container
let root

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function clickButton(label) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent === label)
  if (!button) throw new Error(`Button not found: ${label}`)
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('App critical flows', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.resetModules()
    localStorage.clear()
    Object.values(apiMocks).forEach((mock) => {
      if (typeof mock.mockReset === 'function') mock.mockReset()
    })

    apiMocks.checkStatus.mockResolvedValue({ status: 'ok' })
    apiMocks.fetchExport.mockResolvedValue({})
    apiMocks.fetchHistory.mockResolvedValue([])
    apiMocks.fetchMetrics.mockResolvedValue({
      ranking: [{ brand: 'Matmut', global_score: 82 }],
      category_data: {},
      insights: {},
      metadata: { brand: 'Matmut' }
    })
    apiMocks.fetchProjects.mockResolvedValue([])
    apiMocks.fetchCurrentUser.mockResolvedValue({ authenticated: false, user: null })
    apiMocks.fetchSession.mockResolvedValue({ has_session: false })
    apiMocks.activateProject.mockResolvedValue({ status: 'success' })
    apiMocks.logoutUser.mockResolvedValue({ authenticated: false })
    apiMocks.runAnalysisStream.mockImplementation(async function* () {
      yield { type: 'start', models: ['demo'], is_demo: true }
      yield { type: 'complete', is_demo: true, timestamp: new Date().toISOString() }
    })

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('shows the connected workspace when a user is authenticated without restored session', async () => {
    apiMocks.fetchCurrentUser.mockResolvedValue({
      authenticated: true,
      user: { id: 1, name: 'Alice', email: 'alice@example.com' }
    })
    apiMocks.fetchProjects.mockResolvedValue([{ id: 7, brand: 'Matmut' }])

    const { default: App } = await import('../../App')

    await act(async () => {
      root.render(React.createElement(App))
    })
    await flush()
    await flush()

    expect(container.textContent).toContain('workspace-home:1')
  })

  it('opens onboarding from the connected workspace', async () => {
    apiMocks.fetchCurrentUser.mockResolvedValue({
      authenticated: true,
      user: { id: 1, name: 'Alice', email: 'alice@example.com' }
    })
    apiMocks.fetchProjects.mockResolvedValue([{ id: 7, brand: 'Matmut' }])

    const { default: App } = await import('../../App')

    await act(async () => {
      root.render(React.createElement(App))
    })
    await flush()
    await flush()

    clickButton('workspace-create')
    await flush()

    expect(container.textContent).toContain('onboarding-view')
  })

  it('auto-opens the latest project when the preference is enabled', async () => {
    localStorage.setItem('geo_preferences', JSON.stringify({
      autoOpenLatestProject: true,
      reduceMotion: false,
      showHints: true
    }))
    apiMocks.fetchCurrentUser.mockResolvedValue({
      authenticated: true,
      user: { id: 1, name: 'Alice', email: 'alice@example.com' }
    })
    apiMocks.fetchProjects.mockResolvedValue([{ id: 7, brand: 'Matmut', sector: 'Assurance', competitors: [], prompts: [] }])

    const { default: App } = await import('../../App')

    await act(async () => {
      root.render(React.createElement(App))
    })
    await flush()
    await flush()
    await flush()

    expect(apiMocks.activateProject).toHaveBeenCalledWith(7)
    expect(container.textContent).toContain('dashboard-overview')
  })

  it('logs out from the account tab and returns to the public page', async () => {
    apiMocks.fetchCurrentUser.mockResolvedValue({
      authenticated: true,
      user: { id: 1, name: 'Alice', email: 'alice@example.com' }
    })
    apiMocks.fetchSession.mockResolvedValue({
      has_session: true,
      active_project_id: 7,
      project: { id: 7, brand: 'Matmut', sector: 'Assurance', competitors: [], prompts: [] },
      results: { ranking: [{ brand: 'Matmut', global_score: 82 }], category_data: {}, insights: {} },
      user: { id: 1, name: 'Alice', email: 'alice@example.com' }
    })
    apiMocks.fetchProjects.mockResolvedValue([{ id: 7, brand: 'Matmut' }])

    const { default: App } = await import('../../App')

    await act(async () => {
      root.render(React.createElement(App))
    })
    await flush()
    await flush()

    clickButton('nav-account')
    await flush()
    clickButton('account-logout')
    await flush()

    expect(apiMocks.logoutUser).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('landing-page')
  })
})
