import React, { useEffect, useState } from 'react';
import WalletDashboard from './WalletDashboard';
import RawUTXOInspector from './RawUTXOInspector';

export default function WalletDashboardWithUTXO({ account, onLogout }) {
  const [showUtxos, setShowUtxos] = useState(false);

  useEffect(() => {
    const setupUtxoPanel = () => {
      const messagesTab = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Messages');
      if (!messagesTab) return;

      const tabsList = messagesTab.parentElement;
      if (!tabsList) return;

      let button = document.getElementById('raw-utxo-dashboard-shortcut');
      if (!button) {
        button = document.createElement('button');
        button.id = 'raw-utxo-dashboard-shortcut';
        button.type = 'button';
        button.textContent = 'UTXOs';
        button.className = messagesTab.className;
        button.addEventListener('click', () => setShowUtxos(true));
        tabsList.insertBefore(button, messagesTab);
      }
    };

    const timer = setTimeout(setupUtxoPanel, 500);
    const observer = new MutationObserver(setupUtxoPanel);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.getElementById('raw-utxo-dashboard-shortcut')?.remove();
    };
  }, []);

  useEffect(() => {
    const shortcut = document.getElementById('raw-utxo-dashboard-shortcut');
    const originalTabs = Array.from(shortcut?.parentElement?.querySelectorAll('button') || []).filter((button) => button !== shortcut);
    const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

    shortcut?.setAttribute('data-state', showUtxos ? 'active' : 'inactive');
    panels.forEach((panel) => {
      panel.style.display = showUtxos ? 'none' : '';
    });

    const closeUtxos = () => setShowUtxos(false);
    originalTabs.forEach((button) => button.addEventListener('click', closeUtxos));

    return () => {
      panels.forEach((panel) => {
        panel.style.display = '';
      });
      originalTabs.forEach((button) => button.removeEventListener('click', closeUtxos));
    };
  }, [showUtxos]);

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <WalletDashboard account={account} onLogout={onLogout} />
      </div>
      {showUtxos && (
        <div className="w-96 flex-shrink-0 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <RawUTXOInspector account={account} />
        </div>
      )}
    </div>
  );
}