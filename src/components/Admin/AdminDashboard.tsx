import React, { useState, useEffect, useRef } from "react";
import "./AdminDashboard.css";

const AdminDashboard: React.FC = () => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "cli" | "env">("logs");
  const [logs, setLogs] = useState<string[]>([]);
  const [cliInput, setCliInput] = useState("");
  const [cliOutput, setCliOutput] = useState("");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || "";

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/check`, {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setIsAuthenticated(true);
        fetchLogs();
      } else {
        alert("Invalid password");
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to server");
    }
  };

  const fetchLogs = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/logs`, {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEnv = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/env`, {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        const data = await res.json();
        setEnvVars(data.env);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ command: cliInput }),
      });
      const data = await res.json();
      setCliOutput(
        (prev) =>
          `> ${cliInput}\n${data.output || data.error || "No output"}\n\n${prev}`
      );
      setCliInput("");
    } catch (e: any) {
      setCliOutput((prev) => `> ${cliInput}\nError: ${e.message}\n\n${prev}`);
    } finally {
      setLoading(false);
    }
  };

  // Poll logs
  useEffect(() => {
    if (isAuthenticated && activeTab === "logs") {
      fetchLogs();
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  // Load Env on tab switch
  useEffect(() => {
    if (isAuthenticated && activeTab === "env") {
      fetchEnv();
    }
  }, [isAuthenticated, activeTab]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <h2>Admin Access</h2>
        <input
          type="password"
          placeholder="Enter Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkAuth()}
        />
        <button onClick={checkAuth}>Login</button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <div className="admin-tabs">
          <button
            className={activeTab === "logs" ? "active" : ""}
            onClick={() => setActiveTab("logs")}
          >
            Logs
          </button>
          <button
            className={activeTab === "cli" ? "active" : ""}
            onClick={() => setActiveTab("cli")}
          >
            CLI
          </button>
          <button
            className={activeTab === "env" ? "active" : ""}
            onClick={() => setActiveTab("env")}
          >
            Env Vars
          </button>
          <button onClick={() => setIsAuthenticated(false)}>Logout</button>
        </div>
      </div>

      <div className="admin-content">
        {activeTab === "logs" && (
          <div className="logs-view">
            {logs.map((log, i) => (
              <div key={i} className="log-entry">
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {activeTab === "cli" && (
          <div className="cli-view">
            <div className="cli-output">
              <pre>{cliOutput}</pre>
            </div>
            <form onSubmit={runCommand} className="cli-input-form">
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                placeholder="Enter command (e.g., ls -la)"
                disabled={loading}
              />
              <button type="submit" disabled={loading}>
                {loading ? "Running..." : "Run"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "env" && (
          <div className="env-view">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(envVars).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="env-value">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
