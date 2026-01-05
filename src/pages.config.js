import Wallet from './pages/Wallet';
import SecuritySettings from './pages/SecuritySettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Wallet": Wallet,
    "SecuritySettings": SecuritySettings,
}

export const pagesConfig = {
    mainPage: "Wallet",
    Pages: PAGES,
    Layout: __Layout,
};