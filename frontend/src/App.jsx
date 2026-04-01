import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import AnalysisProgress from './components/AnalysisProgress';
import ExportButton from './components/ExportButton';
import {
  fetchMetrics, fetchExport, checkStatus, fetchHistory,
  runAnalysisStream, generateTrendHistory, DEMO_DATA_FACTORY, fetchSession,
  fetchCurrentUser, loginUser, signupUser, loginWithGoogle, getGoogleClientId, activateProject, fetchProjects, logoutUser
} from './services/api';
import './App.css';

const LandingPage = lazy(() => import('./components/LandingPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const WorkspaceHome = lazy(() => import('./components/WorkspaceHome'));
const ProjectsPanel = lazy(() => import('./components/ProjectsPanel'));
const Benchmark = lazy(() => import('./components/Benchmark'));
const AlertsPanel = lazy(() => import('./components/AlertsPanel'));
const AccountPanel = lazy(() => import('./components/AccountPanel'));
const PromptComparator = lazy(() => import('./components/PromptComparator'));
const DashboardOverviewTab = lazy(() => import('./components/tabs/DashboardOverviewTab'));
const HistoryTab = lazy(() => import('./components/tabs/HistoryTab'));
const KeywordsTab = lazy(() => import('./components/tabs/KeywordsTab'));
const SentimentTab = lazy(() => import('./components/tabs/SentimentTab'));
const LLMStatusTab = lazy(() => import('./components/tabs/LLMStatusTab'));
const ExportsTab = lazy(() => import('./components/tabs/ExportsTab'));

const DEFAULT_PREFERENCES = {
  autoOpenLatestProject: false,
  reduceMotion: false,
  showHints: true
};
const DEBUG_APP = import.meta.env.DEV && import.meta.env.VITE_DEBUG_UI === 'true';

function parseProjectList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return typeof value === 'string' ? value.split(',').map((item) => item.trim()) : [];
  }
}

function projectToConfig(project) {
  return {
    projectId: project.id || null,
    brand: project.brand,
    sector: project.sector,
    competitors: parseProjectList(project.competitors),
    prompts: parseProjectList(project.prompts),
    models: parseProjectList(project.models),
    products: [],
    setup_mode: 'assisted'
  };
}

function LazySectionFallback({ label = 'Chargement de la vue...' }) {
  return (
    <div className="loading-state app-lazy-state">
      <div className="loader" />
      <p>{label}</p>
    </div>
  );
}

function debugApp(...args) {
  if (DEBUG_APP) {
    console.log(...args);
  }
}

export default function App() {
  const [page, setPage] = useState('landing');

  const [config, setConfig] = useState(null);
  const [data, setData] = useState(null);
  const [trendHistory, setTrendHistory] = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [error, setError] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [completedPrompts, setCompletedPrompts] = useState([]);
  const [analysisModels, setAnalysisModels] = useState([]);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [authUser, setAuthUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    try {
      return {
        ...DEFAULT_PREFERENCES,
        ...(JSON.parse(window.localStorage.getItem('geo_preferences') || '{}'))
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });
  const googleClientId = getGoogleClientId();

  const applySessionState = useCallback(async (sessionData) => {
    if (sessionData?.user) {
      setAuthUser(sessionData.user);
    }

    if (sessionData?.has_session && sessionData.project && sessionData.results?.ranking?.length > 0) {
      const restoredConfig = projectToConfig(sessionData.project);

      setPage('app');
      setShowOnboarding(false);
      setConfig(restoredConfig);
      setData(sessionData.results);

      const historyData = await fetchHistory({
        brand: sessionData.project.brand,
        projectId: sessionData.active_project_id || sessionData.project.id
      });
      if (historyData && historyData.length > 0) {
        setTrendHistory(historyData);
      } else {
        setTrendHistory(generateTrendHistory(sessionData.results.ranking, sessionData.project.brand));
      }
      return true;
    }

    return false;
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!authUser) {
      setProjects([]);
      setProjectsLoading(false);
      return [];
    }

    setProjectsLoading(true);
    try {
      const nextProjects = await fetchProjects({ force: true });
      setProjects(nextProjects);
      return nextProjects;
    } catch (err) {
      console.error('[APP] refreshProjects error:', err);
      setProjects([]);
      return [];
    } finally {
      setProjectsLoading(false);
    }
  }, [authUser]);

  const loadDashboardData = useCallback(async (cfg) => {
    debugApp('[APP] loadDashboardData', cfg);
    try {
      const [result, historyData] = await Promise.all([
        fetchMetrics({ brand: cfg.brand, competitors: cfg.competitors, projectId: cfg.projectId }),
        fetchHistory({ brand: cfg.brand, projectId: cfg.projectId })
      ]);
      debugApp('[APP] fetchMetrics result', result?.metadata);
      setData(result);

      if (historyData && historyData.length > 0) {
        debugApp('[APP] Historique reel', historyData.length);
        setTrendHistory(historyData);
      } else {
        debugApp('[APP] Pas d historique, generation de donnees fake');
        setTrendHistory(generateTrendHistory(result?.ranking, cfg.brand));
      }
    } catch (err) {
      console.error('[APP] loadDashboardData error:', err);
      const demo = DEMO_DATA_FACTORY(cfg.brand, cfg.competitors);
      setData(demo);
      setTrendHistory(generateTrendHistory(demo.ranking, cfg.brand));
    }
  }, []);

  const handleOnboardingComplete = async (cfg) => {
    setConfig(cfg);
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);
    setCompletedPrompts([]);
    setAnalysisProgress(null);
    setError(null);

    try {
      for await (const event of runAnalysisStream({
        brand: cfg.brand,
        competitors: cfg.competitors,
        prompts: cfg.prompts,
        products: cfg.products,
        sector: cfg.sector,
        demo: false
      })) {
        if (event.type === 'start') {
          setAnalysisModels(event.models || []);
          setIsDemo(event.is_demo || false);
          debugApp('[APP] Streaming start', event.models, event.is_demo);
        }
        if (event.type === 'progress') {
          setAnalysisProgress(event);
          setCompletedPrompts((prev) => [...prev, event]);
          debugApp('[APP] Progress', event.current, event.total, event.brand_position);
        }
        if (event.type === 'complete') {
          debugApp('[APP] Streaming complete', event.is_demo, event.timestamp);
          setIsAnalysisComplete(true);
          setIsAnalyzing(false);
          await loadDashboardData(cfg);
          const nextProjects = await refreshProjects();
          const persistedProject = nextProjects.find((item) => item.brand === cfg.brand);
          if (persistedProject) {
            setConfig((current) => ({
              ...(current || cfg),
              projectId: persistedProject.id
            }));
          }
        }
        if (event.type === 'error') {
          throw new Error(event.message || 'Erreur analyse');
        }
      }
    } catch (err) {
      debugApp('[APP] Streaming fallback', err.message);
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      await loadDashboardData(cfg);
      const nextProjects = await refreshProjects();
      const persistedProject = nextProjects.find((item) => item.brand === cfg.brand);
      if (persistedProject) {
        setConfig((current) => ({
          ...(current || cfg),
          projectId: persistedProject.id
        }));
      }
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!config) return;
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);
    setCompletedPrompts([]);
    setAnalysisProgress(null);

    try {
      for await (const event of runAnalysisStream({
        brand: config.brand,
        competitors: config.competitors,
        prompts: config.prompts,
        sector: config.sector,
        demo: false
      })) {
        if (event.type === 'start') setAnalysisModels(event.models || []);
        if (event.type === 'progress') {
          setAnalysisProgress(event);
          setCompletedPrompts((prev) => [...prev, event]);
        }
        if (event.type === 'complete') {
          setIsAnalysisComplete(true);
          setIsAnalyzing(false);
          await loadDashboardData(config);
          await refreshProjects();
        }
      }
    } catch {
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      await loadDashboardData(config);
      await refreshProjects();
    }
  }, [config, loadDashboardData, refreshProjects]);

  const handleExport = useCallback(async () => {
    try {
      const report = await fetchExport({ brand: config?.brand, projectId: config?.projectId });
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geo-${config?.brand || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [config]);

  useEffect(() => {
    checkStatus().then((res) => setIsBackendOnline(res?.status === 'ok'));

    Promise.all([fetchCurrentUser({ force: true }), fetchSession({ force: true })]).then(async ([currentUser, currentSession]) => {
      if (currentUser?.authenticated) {
        setAuthUser(currentUser.user);
      }

      const restored = await applySessionState(currentSession);
      if (!restored && currentUser?.authenticated) {
        setShowOnboarding(false);
        setPage('app');
      }
    });
  }, [applySessionState]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    window.localStorage.setItem('geo_preferences', JSON.stringify(preferences));
    document.documentElement.classList.toggle('reduced-motion', preferences.reduceMotion);
  }, [preferences]);

  const handleAuthContinue = async ({ mode, fullName, email, password }) => {
    setAuthBusy(true);
    setAuthError('');

    try {
      const authResult = mode === 'signup'
        ? await signupUser({ name: fullName, email, password })
        : await loginUser({ email, password });

      setAuthUser(authResult.user || null);
      const currentSession = await fetchSession({ force: true });
      const restored = await applySessionState(currentSession);

      if (!restored) {
        setShowOnboarding(false);
        setPage('app');
      }
    } catch (err) {
      setAuthError(err.message || 'Connexion impossible');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleAuth = async (credential) => {
    if (!credential) {
      setAuthError('Credential Google manquante');
      return;
    }

    setAuthBusy(true);
    setAuthError('');

    try {
      const authResult = await loginWithGoogle(credential);
      setAuthUser(authResult.user || null);
      const currentSession = await fetchSession({ force: true });
      const restored = await applySessionState(currentSession);

      if (!restored) {
        setShowOnboarding(false);
        setPage('app');
      }
    } catch (err) {
      setAuthError(err.message || 'Connexion Google impossible');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
  };

  const resetWorkspace = useCallback(() => {
    setConfig(null);
    setData(null);
    setTrendHistory([]);
    setCompletedPrompts([]);
    setAnalysisProgress(null);
    setIsAnalysisComplete(false);
    setIsAnalyzing(false);
    setError(null);
    setActiveTab('dashboard');
    setShowOnboarding(false);
    setPage(authUser ? 'app' : 'landing');
  }, [authUser]);

  const handleCreateAnalysis = useCallback(() => {
    setConfig(null);
    setData(null);
    setTrendHistory([]);
    setActiveTab('dashboard');
    setShowOnboarding(true);
    setError(null);
    setCompletedPrompts([]);
    setAnalysisProgress(null);
    setIsAnalysisComplete(false);
  }, []);

  const handleProjectSelect = useCallback(async (project) => {
    const nextConfig = projectToConfig(project);
    setShowOnboarding(false);
    setConfig(nextConfig);
    setActiveTab('dashboard');
    setError(null);

    try {
      await activateProject(project.id);
      await loadDashboardData(nextConfig);
    } catch (err) {
      console.error('[APP] project activation error:', err);
      setError(err.message || 'Impossible de charger ce projet');
    }
  }, [loadDashboardData]);

  const handlePreferenceChange = useCallback((key) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('[APP] logout error:', err);
    } finally {
      setAuthUser(null);
      setConfig(null);
      setData(null);
      setProjects([]);
      setTrendHistory([]);
      setCompletedPrompts([]);
      setAnalysisProgress(null);
      setIsAnalysisComplete(false);
      setIsAnalyzing(false);
      setShowOnboarding(false);
      setActiveTab('dashboard');
      setError(null);
      setPage('landing');
    }
  }, []);

  useEffect(() => {
    if (!authUser || config || showOnboarding || projectsLoading || !preferences.autoOpenLatestProject) {
      return;
    }

    if (projects.length > 0) {
      handleProjectSelect(projects[0]);
    }
  }, [authUser, config, showOnboarding, projectsLoading, preferences.autoOpenLatestProject, projects, handleProjectSelect]);

  if (page === 'landing') {
    return (
      <Suspense fallback={<LazySectionFallback label="Chargement de l accueil..." />}>
        <LandingPage
          onStart={() => setPage('auth')}
          onLogin={() => setPage('auth')}
          onDemo={() => setPage('app')}
        />
      </Suspense>
    );
  }

  if (page === 'auth') {
    return (
      <Suspense fallback={<LazySectionFallback label="Chargement de la connexion..." />}>
        <AuthPage
          onBack={() => setPage('landing')}
          onContinue={handleAuthContinue}
          onGoogle={handleGoogleAuth}
          googleClientId={googleClientId}
          isSubmitting={authBusy}
          errorMessage={authError}
        />
      </Suspense>
    );
  }

  if (!config) {
    if (authUser && !showOnboarding) {
      return (
        <div className="app-layout">
          <div className="main-content" style={{ marginTop: 0 }}>
            <div className="page-content">
              <Suspense fallback={<LazySectionFallback label="Chargement de votre espace..." />}>
                <WorkspaceHome
                  user={authUser}
                  projects={projects}
                  loading={projectsLoading}
                  showHints={preferences.showHints}
                  onCreateAnalysis={handleCreateAnalysis}
                  onProjectSelect={handleProjectSelect}
                />
              </Suspense>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="app-layout">
        <div className="main-content onboarding-main-content" style={{ marginTop: 0 }}>
          <div className="page-content onboarding-page">
            {authUser && showOnboarding && (
              <div className="workspace-onboarding-head">
                <button className="workspace-back-link" onClick={() => setShowOnboarding(false)}>
                  Retour aux projets
                </button>
                <p>Nouvelle analyse pour {authUser.name || authUser.email}</p>
              </div>
            )}
            <div className="onboarding-stage">
              <Suspense fallback={<LazySectionFallback label="Chargement de l onboarding..." />}>
                <Onboarding onComplete={handleOnboardingComplete} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <TopNavbar
        brand={config.brand}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isAnalyzing}
        isBackendOnline={isBackendOnline}
        onReset={resetWorkspace}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        exportSlot={<ExportButton brand={config.brand} projectId={config.projectId} />}
      />

      <div className="app-body">
        <Sidebar
          brand={config.brand}
          sector={config.sector}
          isBackendOnline={isBackendOnline}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onReset={resetWorkspace}
        />

        <div className="main-content">
          <div className="page-content">
            {(isAnalyzing || (completedPrompts.length > 0 && !data)) && (
              <AnalysisProgress
                brand={config.brand}
                progress={analysisProgress}
                models={analysisModels}
                isComplete={isAnalysisComplete}
                isDemo={isDemo}
                completedPrompts={completedPrompts}
                promptTarget={config?.prompts?.length}
              />
            )}

            {error && !data && (
              <div className="error-state"><p>❌ {error}</p></div>
            )}

            {activeTab === 'dashboard' && data && data.ranking && (
              <Suspense fallback={<LazySectionFallback label="Chargement du dashboard..." />}>
                <DashboardOverviewTab config={config} data={data} trendHistory={trendHistory} />
              </Suspense>
            )}

            {activeTab === 'prompts' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des requetes..." />}>
                <PromptComparator brand={config.brand} projectId={config.projectId} />
              </Suspense>
            )}

            {activeTab === 'benchmark' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des benchmarks..." />}>
                <Benchmark sector={config.sector} />
              </Suspense>
            )}

            {activeTab === 'history' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des tendances..." />}>
                <HistoryTab config={config} trendHistory={trendHistory} />
              </Suspense>
            )}

            {activeTab === 'keywords' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des intentions..." />}>
                <KeywordsTab config={config} data={data} />
              </Suspense>
            )}

            {activeTab === 'sentiment' && (
              <Suspense fallback={<LazySectionFallback label="Chargement du sentiment..." />}>
                <SentimentTab config={config} data={data} />
              </Suspense>
            )}

            {activeTab === 'llm-status' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des modeles..." />}>
                <LLMStatusTab config={config} />
              </Suspense>
            )}

            {activeTab === 'exports' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des rapports..." />}>
                <ExportsTab config={config} />
              </Suspense>
            )}

            {activeTab === 'projects' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des projets..." />}>
                <ProjectsPanel
                  projects={projects}
                  loading={projectsLoading}
                  onProjectSelect={handleProjectSelect}
                  onCreateAnalysis={handleCreateAnalysis}
                />
              </Suspense>
            )}

            {activeTab === 'alerts' && (
              <Suspense fallback={<LazySectionFallback label="Chargement des alertes..." />}>
                <AlertsPanel brand={config.brand} />
              </Suspense>
            )}

            {activeTab === 'account' && (
              <Suspense fallback={<LazySectionFallback label="Chargement du compte..." />}>
                <AccountPanel
                  user={authUser}
                  projects={projects}
                  isBackendOnline={isBackendOnline}
                  preferences={preferences}
                  onPreferenceChange={handlePreferenceChange}
                  onOpenProjects={() => setActiveTab('projects')}
                  onCreateAnalysis={handleCreateAnalysis}
                  onLogout={handleLogout}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
