import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store/useStore";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SavePage from "./pages/SavePage";
import SyncPage from "./pages/SyncPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
    const { loadConfig, refreshStatus, initWorkspace } = useStore();


    useEffect(() => {
        (async () => {
            await initWorkspace();
            await loadConfig();
            await refreshStatus();
        })();
    }, [initWorkspace, loadConfig, refreshStatus]);

    return (
        <BrowserRouter>
            <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden transition-colors duration-300">

                <Sidebar />


                <div className="flex flex-col flex-1 overflow-hidden">
                    <main className="flex-1 overflow-y-auto">
                        <Routes>
                            <Route
                                path="/"
                                element={<Navigate to="/login" replace />}
                            />
                            <Route path="/login" element={<LoginPage />} />
                            <Route
                                path="/dashboard"
                                element={<DashboardPage />}
                            />
                            <Route path="/save" element={<SavePage />} />
                            <Route path="/sync" element={<SyncPage />} />
                            <Route path="/history" element={<HistoryPage />} />
                        </Routes>
                    </main>


                    <StatusBar />
                </div>
            </div>
        </BrowserRouter>
    );
}
