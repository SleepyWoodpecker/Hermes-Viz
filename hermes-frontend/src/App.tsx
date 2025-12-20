import { useEffect, useRef, useState } from "react";
import ExecutionLog from "./components/molecules/ExecutionLog";
import {
    TraceTypes,
    type StatEntryWithoutName,
    type TraceEntryCallStack,
    type TrackedTraceEntry,
} from "./types";
import { Toaster } from "sonner";
import StatTable from "./components/molecules/StatTable";
import ExecutionFlameGraph from "./components/molecules/FlameGraph";

const webSocketUrl = "ws://localhost:8080/data";
const MAX_EXECUTION_LOGS = 250;

// NOTE: this should have a global state that it passes to all its children
function App() {
    const webSocketRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<TrackedTraceEntry[]>([]);
    const [stats, setStats] = useState<Map<string, StatEntryWithoutName>>(
        new Map()
    );
    const [flameGraphLogs, setFlameGraphLogs] = useState<TraceEntryCallStack[]>(
        []
    );

    useEffect(() => {
        document.documentElement.classList.add("dark");
        return () => {
            document.documentElement.classList.remove("dark");
        };
    }, []);

    useEffect(() => {
        if (connected) {
            webSocketRef.current = new WebSocket(webSocketUrl);

            webSocketRef.current.onopen = () => {
                console.log("Connection with backend established");
            };

            webSocketRef.current.onmessage = (e) => {
                const parsed: TrackedTraceEntry = JSON.parse(e.data);

                if (parsed.traceType === TraceTypes.STAT_UPDATES) {
                    const newStatMap = new Map();

                    parsed.statMap.forEach(
                        ({
                            funcName,
                            callsMade,
                            averageRunTime,
                            maxRunTime,
                        }) => {
                            newStatMap.set(funcName, {
                                callsMade,
                                averageRunTime,
                                maxRunTime,
                            });
                        }
                    );
                    setStats(newStatMap);
                } else if (parsed.traceType === TraceTypes.FLAME_GRAPH_ENTRY) {
                    setFlameGraphLogs((logs) => {
                        return [...logs, parsed];
                    });
                } else {
                    setExecutionLogs((prevExecutionLogs) => {
                        const nextLogs: TrackedTraceEntry[] = [
                            parsed,
                            ...prevExecutionLogs,
                        ];

                        if (nextLogs.length > MAX_EXECUTION_LOGS) {
                            nextLogs.length = MAX_EXECUTION_LOGS;
                        }

                        return nextLogs;
                    });
                }
            };
        } else {
            if (webSocketRef.current) {
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
        }

        return () => {
            if (webSocketRef.current) {
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
        };
    }, [connected]);

    const statusDotClass = connected ? "bg-emerald-400" : "bg-red-500";
    const statusTextClass = connected ? "text-emerald-400" : "text-red-400";
    const statusLabel = connected ? "Board connected" : "Disconnected";

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
                <header className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Execution Viewer
                        </h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Live trace stream of execution from board.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-medium">
                            <span
                                className={`h-2 w-2 rounded-full ${statusDotClass}`}
                            />
                            <span className={statusTextClass}>
                                {statusLabel}
                            </span>
                        </div>
                        <div className="inline-flex items-center gap-2">
                            <button
                                onClick={() => setConnected(true)}
                                className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 shadow-sm transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={connected}
                            >
                                Connect
                            </button>
                            <button
                                onClick={() => setConnected(false)}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={!connected}
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
                    <div className="flex flex-col gap-4">
                        {/* <StatTable statMap={stats} />
                        <ExecutionLog executionLog={executionLogs} /> */}
                        <ExecutionFlameGraph traces={flameGraphLogs} />
                    </div>
                </main>
            </div>

            <Toaster position="top-center" />
        </div>
    );
}

export default App;
