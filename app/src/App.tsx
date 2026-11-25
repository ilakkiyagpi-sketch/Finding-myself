import { useState } from 'react';
import { DataProvider, useStore } from './lib/store';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import CheckIn from './screens/CheckIn';
import Journal from './screens/Journal';
import Self from './screens/Self';
import Rhythm from './screens/Rhythm';
import More from './screens/More';

export type Tab = 'home' | 'checkin' | 'journal' | 'self' | 'rhythm' | 'more';

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏡' },
  { key: 'journal', label: 'Journal', icon: '✍️' },
  { key: 'self', label: 'Self', icon: '🪞' },
  { key: 'rhythm', label: 'Rhythm', icon: '🌱' },
  { key: 'more', label: 'More', icon: '☁️' },
];

function Shell() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('home');

  if (!data.profile) return <Onboarding />;

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <main>
        {tab === 'home' && <Home go={go} />}
        {tab === 'checkin' && <CheckIn done={() => go('home')} />}
        {tab === 'journal' && <Journal />}
        {tab === 'self' && <Self />}
        {tab === 'rhythm' && <Rhythm />}
        {tab === 'more' && <More />}
      </main>
      {tab !== 'checkin' && (
        <nav className="bottom-nav" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.key} className={tab === n.key ? 'on' : ''} onClick={() => go(n.key)} aria-current={tab === n.key ? 'page' : undefined}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
