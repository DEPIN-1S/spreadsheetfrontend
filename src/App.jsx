import { useState, useEffect } from "react";
import Sidebar from "./Components/Sidebar";
import MyFiles from "./Pages/MyFiles";
import SharedWithMe from "./Pages/SharedWithMe";
import Users from "./Pages/Users";
import Messages from "./Pages/Messages";
import DocumentEditor from "./Pages/DocumentEditor";
import InventoryDocumentEditor from "./Pages/InventoryDocumentEditor";
import AuditLogs from "./Pages/AuditLogs";
import Login from "./Pages/Login";
import RetailInventory from "./Pages/RetailInventory";
import Downloads from "./Pages/Downloads";
import RetailBilling from "./Pages/RetailBilling";
import RetailParties from "./Pages/RetailParties";
import RetailInvoices from "./Pages/RetailInvoices";
import GenerateRetailInvoice from "./Pages/GenerateRetailInvoice";
import WholesaleBilling from "./Pages/WholesaleBilling";
import WholesaleParties from "./Pages/WholesaleParties";
import WholesaleInvoices from "./Pages/WholesaleInvoices";
import GenerateWholesaleInvoice from "./Pages/GenerateWholesaleInvoice";
import BillingHistory from "./Pages/BillingHistory";
import InvoiceList from "./Pages/InvoiceList";
import Ledger from "./Pages/Ledger";
import InvoiceGenerator from "./Pages/InvoiceGenerator";
import BusinessDetails from "./Pages/BusinessDetails";
import { ClipboardProvider } from "./context/ClipboardContext";



const NAV_STORAGE_KEY = "datsheets_nav";

const readStoredNav = () => {
    try {
        return JSON.parse(sessionStorage.getItem(NAV_STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
};

function App() {
    const storedNav = readStoredNav();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activePath, setActivePath] = useState(() => {
        if (!localStorage.getItem("accessToken")) return "/login";
        return storedNav.activePath || "/my-files";
    });
    const [currentDocName, setCurrentDocName] = useState(() => storedNav.currentDocName || "");
    const [returnPath, setReturnPath] = useState(() => storedNav.returnPath || "/my-files");
    const [myFilesCurrentFolderId, setMyFilesCurrentFolderId] = useState(storedNav.myFilesCurrentFolderId ?? null);
    const [myFilesPath, setMyFilesPath] = useState(() => storedNav.myFilesPath || [{ id: null, title: "My Files" }]);
    // BUG #12: lift SharedWithMe folder state so it persists on tab switch
    const [sharedCurrentFolderId, setSharedCurrentFolderId] = useState(null);
    const [sharedPath, setSharedPath] = useState([{ id: null, title: "Shared with me" }]);
    const [currentBusiness, setCurrentBusiness] = useState(() => storedNav.currentBusiness || null);

    useEffect(() => {
        if (activePath === "/login") {
            sessionStorage.removeItem(NAV_STORAGE_KEY);
            return;
        }
        sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
            activePath,
            currentDocName,
            returnPath,
            myFilesCurrentFolderId,
            myFilesPath,
            currentBusiness
        }));
    }, [activePath, currentDocName, returnPath, myFilesCurrentFolderId, myFilesPath, currentBusiness]);

    const toggleCollapse = () => setIsCollapsed((prev) => !prev);

    const isEditor = activePath === "/document-editor" || activePath === "/inventory-document-editor";
    const isLogin = activePath === "/login";

    return (
        <ClipboardProvider>
            <div className="flex min-h-screen bg-gray-50">
                {!isEditor && !isLogin && (
                    <Sidebar
                        isCollapsed={isCollapsed}
                        toggleCollapse={toggleCollapse}
                        mobileOpen={mobileOpen}
                        setMobileOpen={setMobileOpen}
                        activePath={activePath}
                        setActivePath={setActivePath}
                    />
                )}
                {/* Main content offset by sidebar width */}
                <div
                    className={`flex-1 overflow-hidden transition-all duration-300 ${(!isEditor && !isLogin) ? (isCollapsed ? "lg:ml-20" : "lg:ml-64") : "max-w-[100vw]"}`}
                >
                    {activePath === "/login" && <Login setActivePath={setActivePath} />}
                    {activePath === "/my-files" && (
                        <MyFiles
                            setMobileOpen={setMobileOpen}
                            setActivePath={setActivePath}
                            setCurrentDocName={setCurrentDocName}
                            setReturnPath={setReturnPath}
                            currentFolderId={myFilesCurrentFolderId}
                            setCurrentFolderId={setMyFilesCurrentFolderId}
                            path={myFilesPath}
                            setPath={setMyFilesPath}
                        />
                    )}
                    {activePath === "/shared" && (
                        <SharedWithMe
                            setMobileOpen={setMobileOpen}
                            setActivePath={setActivePath}
                            setCurrentDocName={setCurrentDocName}
                            setReturnPath={setReturnPath}
                            currentFolderId={sharedCurrentFolderId}
                            setCurrentFolderId={setSharedCurrentFolderId}
                            path={sharedPath}
                            setPath={setSharedPath}
                        />
                    )}
                    {activePath === "/users" && (
                        <Users setMobileOpen={setMobileOpen} />
                    )}
                    {activePath === "/audit" && (
                        <AuditLogs setMobileOpen={setMobileOpen} />
                    )}
                    {activePath === "/inventory/files" && (
                        <RetailInventory 
                            setMobileOpen={setMobileOpen} 
                            setActivePath={setActivePath}
                            setCurrentDocName={setCurrentDocName}
                            setReturnPath={setReturnPath}
                        />
                    )}
                    {activePath === "/downloads/transactions" && (
                        <Downloads setMobileOpen={setMobileOpen} />
                    )}
                    {activePath === "/inventory/retail-billing" && (
                        <RetailBilling setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/retail-parties" && (
                        <RetailParties setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/retail-invoices" && (
                        <RetailInvoices setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/retail-invoices/generate" && (
                        <GenerateRetailInvoice setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/wholesale-billing" && (
                        <WholesaleBilling setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/wholesale-parties" && (
                        <WholesaleParties setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/wholesale-invoices" && (
                        <WholesaleInvoices setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/wholesale-invoices/generate" && (
                        <GenerateWholesaleInvoice setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/invoice-list" && (
                        <InvoiceList setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/transaction-history" && (
                        <BillingHistory setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/inventory/ledger" && (
                        <Ledger setMobileOpen={setMobileOpen} setActivePath={setActivePath} />
                    )}
                    {activePath === "/invoice-generator" && (
                        <InvoiceGenerator setMobileOpen={setMobileOpen} setActivePath={setActivePath} setCurrentBusiness={setCurrentBusiness} />
                    )}
                    {activePath === "/business-details" && (
                        <BusinessDetails business={currentBusiness} setActivePath={setActivePath} setMobileOpen={setMobileOpen} setCurrentBusiness={setCurrentBusiness} />
                    )}
                    {activePath === "/messages" && (
                        <Messages setMobileOpen={setMobileOpen} />
                    )}
                    {activePath === "/document-editor" && (
                        <DocumentEditor
                            docName={currentDocName}
                            setActivePath={setActivePath}
                            returnPath={returnPath}
                        />
                    )}
                    {activePath === "/inventory-document-editor" && (
                        <InventoryDocumentEditor
                            docName={currentDocName}
                            setActivePath={setActivePath}
                            returnPath={returnPath}
                        />
                    )}
                </div>
            </div>
        </ClipboardProvider>
    );
}

export default App;
