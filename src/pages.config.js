import RPCMonitor from './pages/RPCMonitor';
import SecuritySettings from './pages/SecuritySettings';
import Wallet from './pages/Wallet';
import Analytics from './pages/Analytics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "RPCMonitor": RPCMonitor,
    "SecuritySettings": SecuritySettings,
    "Wallet": Wallet,
    "Analytics": Analytics,
}

export const pagesConfig = {
    mainPage: "Wallet",
    Pages: PAGES,
    Layout: __Layout,
};