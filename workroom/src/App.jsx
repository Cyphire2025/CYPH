import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import WorkroomPage from "./pages/workroom";
import WorkroomComplete from "./pages/WorkroomComplete";
import WorkroomPayment from "./pages/WorkroomPayment";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Cyphire Workroom</h1>
        <p className="mt-3 text-sm text-slate-600">
          Open your workroom link to start realtime collaboration.
        </p>
        <button
          onClick={() => navigate("/workroom/demo123")}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Open demo room
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workroom/:workroomId" element={<WorkroomPage />} />
        <Route path="/workroom/:workroomId/complete" element={<WorkroomComplete />} />
        <Route path="/workroom/:workroomId/payment" element={<WorkroomPayment />} />
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
              <h1 className="text-2xl font-semibold">404 | Page not found</h1>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
