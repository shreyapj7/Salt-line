
import { useEffect } from 'react';
import {
  BookOpen,
  ClipboardList,
  Compass,
  Info,
  LayoutDashboard,
  MessageSquareText,
  Radio,
  ShieldAlert,
  Settings,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

export type AppPage =
  | 'Overview'
  | 'Groundwater Map'
  | 'Vulnerable Locations'
  | 'Sensor Monitoring'
  | 'Public Complaints'
  | 'Reports & Field Actions'
  | 'Help & Methodology'
  | 'Evidence & Activity'
  | 'Settings'
  | 'About SALT-LINE';

type NavigationItem = {
  labelKey: string;
  page: AppPage;
  icon: LucideIcon;
};

interface AppSidebarProps {
  activePage: AppPage;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: AppPage) => void;
}

const primaryItems: NavigationItem[] = [
  { labelKey: 'page.overview', page: 'Overview', icon: LayoutDashboard },
  { labelKey: 'page.groundwaterMap', page: 'Groundwater Map', icon: Compass },
  { labelKey: 'page.vulnerableLocations', page: 'Vulnerable Locations', icon: ShieldAlert },
  { labelKey: 'page.sensorMonitoring', page: 'Sensor Monitoring', icon: Radio },
  { labelKey: 'page.publicComplaints', page: 'Public Complaints', icon: MessageSquareText },
  { labelKey: 'page.reportsFieldActions', page: 'Reports & Field Actions', icon: ClipboardList },
  { labelKey: 'page.helpMethodology', page: 'Help & Methodology', icon: BookOpen },
];

const secondaryItems: NavigationItem[] = [
  { labelKey: 'page.evidenceActivity', page: 'Evidence & Activity', icon: ClipboardList },
  { labelKey: 'page.settings', page: 'Settings', icon: Settings },
  { labelKey: 'page.about', page: 'About SALT-LINE', icon: Info },
];

export default function AppSidebar({
  activePage,
  isOpen,
  onClose,
  onNavigate,
}: AppSidebarProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const renderItems = (items: NavigationItem[]) => (
    <nav className="space-y-1">
      {items.map(({ labelKey, page, icon: Icon }) => {
        const isActive = activePage === page;

        return (
          <button
            key={page}
            type="button"
            onClick={() => {
              onNavigate(page);
              onClose();
            }}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-3 text-left text-[12px] transition-colors ${
              isActive
                ? 'border-teal-300 bg-teal-850/70 text-teal-300 shadow-[inset_0_0_18px_rgba(36,75,99,0.06)]'
                : 'border-transparent text-ink-300 hover:border-teal-400/50 hover:bg-ink-850/80 hover:text-ink-100'
            }`}
          >
            <Icon
              size={16}
              className={`shrink-0 ${
                isActive
                  ? 'text-teal-300'
                  : 'text-ink-400 group-hover:text-teal-300'
              }`}
            />
            <span>{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 border-b border-ink-700 px-5 py-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-300/35 bg-teal-850 text-teal-300">
          <Waves size={21} />
        </div>

        <div className="min-w-0 leading-tight">
          <div className="text-sm font-bold tracking-[0.16em] text-ink-100">
            SALT-LINE
          </div>
          <div className="mt-1 text-[10px] text-ink-400">
            {t('app.tagline')}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          {t('nav.workspace')}
        </div>
        {renderItems(primaryItems)}
      </div>

      <div className="border-t border-ink-700 px-3 py-4">
        <div className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          {t('nav.platform')}
        </div>
        {renderItems(secondaryItems)}
      </div>
    </>
  );

  return (
    <div
      id="app-navigation"
      className={`fixed inset-0 z-[1300] transition-[visibility] duration-200 ${
        isOpen ? 'visible' : 'invisible delay-200'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label={t('nav.closeNavigation')}
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 h-full w-full bg-black/60 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.dashboardNavigation')}
        className={`absolute inset-y-0 left-0 flex h-full w-72 max-w-[88vw] flex-col border-r border-ink-700 bg-ink-900 shadow-[12px_0_40px_rgba(41,45,39,0.16)] transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </div>
  );
}
