import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import WalletDashboard from './WalletDashboard';
import RawUTXOInspector from './RawUTXOInspector';

export default function WalletDashboardWithUTXO({ account, onLogout }) {
  const [showUtxos, setShowUtxos] = useState(false);
  const [panelTarget, setPanelTarget] = useState(null);

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

      let panel = document.getElementById('raw-utxo-dashboard-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'raw-utxo-dashboard-panel';
        panel.className = 'mt-6 w-full';
        tabsList.parentElement?.insertAdjacentElement('afterend', panel);
      }
      setPanelTarget(panel);
    };

    const timer = setTimeout(setupUtxoPanel, 500);
    const observer = new MutationObserver(setupUtxoPanel);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.getElementById('raw-utxo-dashboard-shortcut')?.remove();
      document.getElementById('raw-utxo-dashboard-panel')?.remove();
    };
  }, []);

  useEffect(() => {
    const shortcut = document.getElementById('raw-utxo-dashboard-shortcut');
    const normalTabs = Array.from(shortcut?.parentElement?.querySelectorAll('button') || []).filter((button) => button !== shortcut);
    const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

    shortcut?.setAttribute('data-state', showUtxos ? 'active' : 'inactive');
    panels.forEach((panel) => {
      panel.hidden = showUtxos;
      panel.style.display = showUtxos ? 'none' : '';
    });

    if (panelTarget) {
      panelTarget.hidden = !showUtxos;
      panelTarget.style.display = showUtxos ? 'block' : 'none';
    }

    const closeUtxos = () => {
      setShowUtxos(false);
      if (panelTarget) {
        panelTarget.hidden = true;
        panelTarget.style.display = 'none';
      }
    };

    normalTabs.forEach((button) => button.addEventListener('pointerdown', closeUtxos, true));
    normalTabs.forEach((button) => button.addEventListener('click', closeUtxos, true));

    return () => {
      panels.forEach((panel) => {
        panel.hidden = false;
        panel.style.display = '';
      });
      normalTabs.forEach((button) => button.removeEventListener('pointerdown', closeUtxos, true));
      normalTabs.forEach((button) => button.removeEventListener('click', closeUtxos, true));
    };
  }, [showUtxos, panelTarget]);

  return (
    <>
      <WalletDashboard account={account} onLogout={onLogout} />
      {panelTarget && showUtxos && createPortal(
        <RawUTXOInspector account={account} />,
        panelTarget
      )}
    </>
  );
}