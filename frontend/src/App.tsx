import { Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/pages/Dashboard";
import { Screen } from "@/pages/Screen";
import { Stream } from "@/pages/Stream";
import { Batch } from "@/pages/Batch";
import { History } from "@/pages/History";

export default function App() {
  return (
    <div className="flex min-h-screen bg-ecg-bg text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/screen" element={<Screen />} />
            <Route path="/stream" element={<Stream />} />
            <Route path="/batch" element={<Batch />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
