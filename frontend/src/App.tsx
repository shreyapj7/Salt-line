import { useState } from 'react';
import { I18nProvider } from '@/i18n/I18nContext';
import { useLiveData } from '@/hooks/useLiveData';
import AppSidebar, { type AppPage } from '@/components/AppSidebar';
import OverviewPage from '@/pages/OverviewPage';
import GeospatialExplorerPage from '@/pages/GeospatialExplorerPage';
import VulnerabilityAssessmentPage from '@/pages/VulnerabilityAssessmentPage';
import AdaptiveMonitoringPage from '@/pages/AdaptiveMonitoringPage';
import SensorMonitoringPage from '@/pages/SensorMonitoringPage';
import CommunityReportsPage from '@/pages/CommunityReportsPage';
import EvidenceActivityPage from '@/pages/EvidenceActivityPage';
import MethodologyPage from '@/pages/MethodologyPage';
import SettingsPage from '@/pages/SettingsPage';
import AboutPage from '@/pages/AboutPage';
import LandingPage from '@/pages/LandingPage';
import TopNav from '@/components/TopNav';
import type { Basemap } from '@/components/MapPanel';
import type { MonitoringLocation } from '@/types';
import type { LayerId } from '@/map/layers';

function Dashboard({ onBackToHome }: { onBackToHome: () => void }) {
  const [activePage, setActivePage] = useState<AppPage>('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoRefreshMs, setAutoRefreshMs] = useState<number>(60000);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.42);
  const live = useLiveData(autoRefreshMs);

  const [basemap, setBasemap] = useState<Basemap>('satellite');
  const [visibleLayers, setVisibleLayers] = useState<Set<LayerId>>(
    () => new Set<LayerId>(['stations', 'community']),
  );
  const [activeOverlay, setActiveOverlay] = useState<LayerId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [rightOpen, setRightOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<'right' | null>(null);

  const toggleVectorLayer = (id: 'boundary' | 'stations' | 'community') => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectLocation = (loc: MonitoringLocation) => {
    setSelectedId(loc.id);
    setRightOpen(true);
    if (window.innerWidth < 1280) {
      setMobileDrawer('right');
    }
  };

  const openLocationInExplorer = (loc: MonitoringLocation) => {
    handleSelectLocation(loc);
    setActivePage('Groundwater Map');
  };

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-100 font-sans overflow-hidden">
      <TopNav
        live={live}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        autoRefreshMs={autoRefreshMs}
        onSetAutoRefreshMs={setAutoRefreshMs}
        overlayOpacity={overlayOpacity}
        onSetOverlayOpacity={setOverlayOpacity}
        onBackToHome={onBackToHome}
      />

      <div className="flex-1 flex min-h-0 relative">
        <AppSidebar
          activePage={activePage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={setActivePage}
        />

        {activePage === 'Groundwater Map' ? (
          <GeospatialExplorerPage
            live={live}
            basemap={basemap}
            onSetBasemap={setBasemap}
            visibleLayers={visibleLayers}
            onToggleVectorLayer={toggleVectorLayer}
            activeOverlay={activeOverlay}
            onSetActiveOverlay={setActiveOverlay}
            overlayOpacity={overlayOpacity}
            onSetOverlayOpacity={setOverlayOpacity}
            selectedId={selectedId}
            onSelectLocation={handleSelectLocation}
            rightOpen={rightOpen}
            mobileDrawer={mobileDrawer}
            onSetMobileDrawer={setMobileDrawer}
            onCloseLocation={() => {
              setSelectedId(null);
              setRightOpen(false);
            }}
          />
        ) : activePage === 'Overview' ? (
          <OverviewPage
            live={live}
            selectedId={selectedId}
            onNavigate={setActivePage}
            onOpenLocation={openLocationInExplorer}
          />
        ) : activePage === 'Vulnerable Locations' ? (
          <VulnerabilityAssessmentPage live={live} onOpenLocation={openLocationInExplorer} />
        ) : activePage === 'Reports & Field Actions' ? (
          <AdaptiveMonitoringPage
            live={live}
            selectedId={selectedId}
            onSelectLocation={(location) => setSelectedId(location.id)}
            onOpenLocation={openLocationInExplorer}
            onViewEvidence={() => setActivePage('Evidence & Activity')}
          />
        ) : activePage === 'Sensor Monitoring' ? (
          <SensorMonitoringPage live={live} onOpenLocation={openLocationInExplorer} />
        ) : activePage === 'Public Complaints' ? (
          <CommunityReportsPage live={live} onOpenLocation={openLocationInExplorer} />
        ) : activePage === 'Evidence & Activity' ? (
          <EvidenceActivityPage live={live} onOpenLocation={openLocationInExplorer} />
        ) : activePage === 'Help & Methodology' ? (
          <MethodologyPage />
        ) : activePage === 'Settings' ? (
          <SettingsPage
            autoRefreshMs={autoRefreshMs}
            onSetAutoRefreshMs={setAutoRefreshMs}
            overlayOpacity={overlayOpacity}
            onSetOverlayOpacity={setOverlayOpacity}
          />
        ) : (
          <AboutPage />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [dashboardOpen, setDashboardOpen] = useState(false);

  return (
    <I18nProvider>
      {dashboardOpen ? (
        <Dashboard onBackToHome={() => setDashboardOpen(false)} />
      ) : (
        <LandingPage onOpenDashboard={() => setDashboardOpen(true)} />
      )}
    </I18nProvider>
  );
}
