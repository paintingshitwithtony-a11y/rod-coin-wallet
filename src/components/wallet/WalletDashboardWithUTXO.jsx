import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import WalletDashboard from './WalletDashboard';
import RawUTXOInspector from './RawUTXOInspector';

export default function WalletDashboardWithUTXO({ account, onLogout }) {
  const [showUtxos, setShowUtxos] = useState(false);
  const [panelTarget, setPanelTarget] = useState(null);

  // Disabled UTXOs shortcut button to clean up bottom bar
  useEffect(() => {
    // Removed dynamic "UTXOs" button creation
    return () => {
      document.getElementById('raw-utxo-dashboard-shortcut')?.remove();
      document.getElementById('raw-utxo-dashboard-panel')?.remove();
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