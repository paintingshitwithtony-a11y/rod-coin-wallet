import React, { useEffect, useRef } from 'react';
import WalletDashboard from './WalletDashboard';
import RawUTXOInspector from './RawUTXOInspector';

export default function WalletDashboardWithUTXO({ account, onLogout }) {
  const inspectorRef = useRef(null);

  const scrollToInspector = () => {
    inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const addUtxoShortcut = () => {
      const messagesTab = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Messages');
      if (!messagesTab || document.getElementById('raw-utxo-dashboard-shortcut')) return;

      const button = document.createElement('button');
      button.id = 'raw-utxo-dashboard-shortcut';
      button.type = 'button';
      button.textContent = 'UTXOs';
      button.className = messagesTab.className;
      button.addEventListener('click', scrollToInspector);
      messagesTab.parentElement?.insertBefore(button, messagesTab);
    };

    const timer = setTimeout(addUtxoShortcut, 500);
    const observer = new MutationObserver(addUtxoShortcut);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.getElementById('raw-utxo-dashboard-shortcut')?.remove();
    };
  }, []);

  return (
    <>
      <WalletDashboard account={account} onLogout={onLogout} />
      <section ref={inspectorRef} className="mt-8 scroll-mt-24">
        <RawUTXOInspector account={account} />
      </section>
    </>
  );
}