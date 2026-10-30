import { useState } from 'react';
import CommunityAiSupport from './CommunityAiSupport';
import TelegramSupport from './TelegramSupport';
import { useLanguage } from '../context/LanguageContext';

export default function SupportDock({ publicMode = false, alwaysShow = false }) {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const isKhmer = language === 'km';
  const label = isKhmer ? 'បើកឧបករណ៍ជំនួយ' : 'Open support tools';
  const closeLabel = isKhmer ? 'បិទឧបករណ៍ជំនួយ' : 'Close support tools';

  return <>
    <CommunityAiSupport publicMode={publicMode} dockOpen={expanded} />
    <TelegramSupport alwaysShow={alwaysShow} publicMode={publicMode} dockOpen={expanded} />
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      aria-expanded={expanded}
      aria-label={expanded ? closeLabel : label}
      title={expanded ? closeLabel : label}
      className={`support-dock-toggle ${expanded ? 'is-open' : ''}`}
    >
      <span aria-hidden="true">▦</span>
    </button>
  </>;
}
