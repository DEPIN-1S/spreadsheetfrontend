import { useState } from "react";
import Sidebar from "./Components/Sidebar";
import MyFiles from "./Pages/MyFiles";
import SharedWithMe from "./Pages/SharedWithMe";
import Users from "./Pages/Users";
import Messages from "./Pages/Messages";
import DocumentEditor from "./Pages/DocumentEditor";
import AuditLogs from "./Pages/AuditLogs";
import Login from "./Pages/Login";
import { ClipboardProvider } from "./context/ClipboardContext";

function App() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activePath, setActivePath] = useState(() => {
        // If user has a valid token, go to my-files; otherwise show login
        return localStorage.getItem('accessToken') ? '/my-files' : '/login';
    });
    const [currentDocName, setCurrentDocName] = useState("");
    const [returnPath, setReturnPath] = useState('/my-files');
    const [myFilesCurrentFolderId, setMyFilesCurrentFolderId] = useState(null);
    const [myFilesPath, setMyFilesPath] = useState([{ id: null, title: "My Files" }]);

    const toggleCollapse = () => setIsCollapsed((prev) => !prev);

    const isEditor = activePath === "/document-editor";
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
                        />
                    )}
                    {activePath === "/users" && (
                        <Users setMobileOpen={setMobileOpen} />
                    )}
                    {activePath === "/audit" && (
                        <AuditLogs setMobileOpen={setMobileOpen} />
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
                </div>
            </div>
        </ClipboardProvider>
    );
}

export default App;
