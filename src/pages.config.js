import Wallet from './pages/Wallet';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Wallet": Wallet,
}

export const pagesConfig = {
    mainPage: "Wallet",
    Pages: PAGES,
    Layout: __Layout,
};