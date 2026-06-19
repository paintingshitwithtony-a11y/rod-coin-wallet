import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import WalletDashboard from './WalletDashboard';
import RawUTXOInspector from './RawUTXOInspector';

export default function WalletDashboardWithUTXO({ account, onLogout }) {
  const [showUtxos, setShowUtxos] = useState(false);
  const [panelTarget, setPanelTarget] = useState(null);

  useEffect(() => {
    const setupUtxoPanel = () => {
      const messagesTab = Array.from(document.querySelectorAll('button')).find((button) => 
        button.textContent?.trim() === 'Messages'
      );
      if (!messagesTab) return;

      const tabsList = messagesTab.parentElement;
      if (!tabsList) return;

      // Restore UTXOs button in top navigation
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
    };
  }, []);

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