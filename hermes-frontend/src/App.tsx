import { useEffect, useRef, useState } from "react";
import ExecutionLog from "./components/molecules/ExecutionLog";
import type { TraceEntry } from "./types";

const webSocketUrl = "ws://localhost:8080/data";

// NOTE: this should have a global state that it passes to all its children
function App() {
    const webSocketRef = useRef<WebSocket | null>(null);
    const [executionLogs, setExecutionLogs] = useState<TraceEntry[]>([]);

    useEffect(() => {
        webSocketRef.current = new WebSocket(webSocketUrl);

        webSocketRef.current.onopen = (e) => {
            console.log("Connection with backend established");
        };

        webSocketRef.current.onmessage = (e) => {
            setExecutionLogs((executionLogs) => [
                ...executionLogs,
                JSON.parse(e.data),
            ]);
        };

        // enable dark theme for the app by adding the `dark` class to the document root
        document.documentElement.classList.add("dark");

        return () => {
            if (webSocketRef.current) {
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
            document.documentElement.classList.remove("dark");
        };
    }, []);
    return (
        <div className="p-8 min-h-screen">
            Hello world
            <ExecutionLog executionLog={executionLogs} />
        </div>
    );
}

export default App;
