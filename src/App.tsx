import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Game from "./components/Game";
import AdminDashboard from "./components/Admin/AdminDashboard";
import "./App.css";

function App() {
  const enableAdmin =
    import.meta.env.VITE_ENABLE_ADMIN === "true" ||
    import.meta.env.VITE_ENABLE_ADMIN === "1";

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Game />} />
          {enableAdmin && <Route path="/admin" element={<AdminDashboard />} />}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
