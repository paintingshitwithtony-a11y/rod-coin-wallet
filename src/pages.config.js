import SecuritySettings from './pages/SecuritySettings';
import Wallet from './pages/Wallet';
import __Layout from './Layout.jsx';


export const PAGES = {
    "SecuritySettings": SecuritySettings,
    "Wallet": Wallet,
}

export const pagesConfig = {
    mainPage: "Wallet",
    Pages: PAGES,
    Layout: __Layout,
};