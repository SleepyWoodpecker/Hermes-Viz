import { useEffect, useRef, useState } from "react";
import type { TraceEntryCallStack } from "../../types";
import { getColor } from "../../util";

interface ExecutionFlameGraphProps {
    traces: TraceEntryCallStack[];
}

const ROW_HEIGHT = 40;
const Y_OFFSET = 20;
const GAP_THRESHOLD_MULTIPLIER = 5;
const AXIS_HEIGHT = 30;

export default function ExecutionFlameGraph({
    traces,
}: ExecutionFlameGraphProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Two separate canvas refs
    const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const uiCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Data Refs
    const latestTracesRef = useRef<TraceEntryCallStack[]>(traces);
    const traceStartTimeRef = useRef<bigint | undefined>(undefined);
    const dimensionsRef = useRef({ width: 0, height: 0 });
    const recordStartTimeRef = useRef<number>(Date.now());

    // 1. Sync Data
    useEffect(() => {
        latestTracesRef.current = traces;
        if (!traceStartTimeRef.current && traces.length > 0) {
            let min = BigInt(traces[0].startTime);
            traces.forEach((t) => {
                if (BigInt(t.startTime) < min) min = BigInt(t.startTime);
            });
            traceStartTimeRef.current = min;
        }
    }, [traces]);

    // 2. Resize Observer (Resizes BOTH canvases)
    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                dimensionsRef.current = { width, height };

                // Resize Graph Canvas
                if (graphCanvasRef.current) {
                    graphCanvasRef.current.width = width;
                    graphCanvasRef.current.height = height;
                }
                // Resize UI Canvas
                if (uiCanvasRef.current) {
                    uiCanvasRef.current.width = width;
                    uiCanvasRef.current.height = height;
                }
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // =========================================================
    // LOOP 1: THE UI LOOP (Timer Only)
    // =========================================================
    useEffect(() => {
        const canvas = uiCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let frameId: number;

        const renderUI = () => {
            const { width, height } = dimensionsRef.current;

            // Clear the UI canvas completely
            ctx.clearRect(0, 0, width, height);

            // Draw Timer
            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "right";
            ctx.textBaseline = "top";

            const elapsed = Date.now() - recordStartTimeRef.current;

            // Draw in top-right corner
            if (width > 0) {
                ctx.fillText(`Time since start: ${elapsed} ms`, width - 10, 5);
            }
            ctx.restore();

            frameId = requestAnimationFrame(renderUI);
        };

        renderUI();
        return () => cancelAnimationFrame(frameId);
    }, []); // Empty dependency array -> Runs forever, independently

    // =========================================================
    // LOOP 2: THE GRAPH LOOP (Heavy Data Visualization)
    // =========================================================
    useEffect(() => {
        const canvas = graphCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        let frameId: number;

        const renderGraph = () => {
            const traces = latestTracesRef.current;
            const { width, height } = dimensionsRef.current;

            // Guard: If hidden or empty, just wait
            if (width === 0 || height === 0 || traces.length === 0) {
                frameId = requestAnimationFrame(renderGraph);
                return;
            }

            const graphHeight = height - AXIS_HEIGHT;

            // 1. Clear Background
            ctx.fillStyle = "#1e1e1e";
            ctx.fillRect(0, 0, width, height);

            // 2. Smart Pruning Logic
            let keepStartIndex = 0;
            let activeWorkSum = 0n;
            for (let i = traces.length - 1; i > 0; i--) {
                const current = traces[i];
                const prev = traces[i - 1];
                const duration =
                    BigInt(current.endTime) - BigInt(current.startTime);
                activeWorkSum += duration > 0n ? duration : 0n;
                if (
                    BigInt(current.startTime) - BigInt(prev.endTime) >
                    activeWorkSum * BigInt(GAP_THRESHOLD_MULTIPLIER)
                ) {
                    keepStartIndex = i;
                    break;
                }
            }

            const visibleTraces = traces.slice(keepStartIndex);

            // 3. Viewport Math
            let minStart = BigInt(visibleTraces[0].startTime);
            let maxEnd = BigInt(visibleTraces[0].endTime);
            visibleTraces.forEach((t) => {
                const s = BigInt(t.startTime);
                const e = BigInt(t.endTime);
                if (s < minStart) minStart = s;
                if (e > maxEnd) maxEnd = e;
            });

            const renderWindow = Number(
                maxEnd -
                    minStart +
                    (maxEnd - minStart === 0n
                        ? 100n
                        : (maxEnd - minStart) / 20n)
            );
            const renderStart =
                minStart - BigInt(Math.floor(renderWindow * 0.05)); // 5% padding left
            const xDiv = width / renderWindow;

            // 4. Render Bars
            visibleTraces.forEach((rect) => {
                const rectStart = Number(BigInt(rect.startTime) - renderStart);
                const rectEnd = Number(BigInt(rect.endTime) - renderStart);

                if (rectEnd < 0 || rectStart > width) return;

                const x = rectStart * xDiv;
                const w = Math.max((rectEnd - rectStart) * xDiv, 1);
                const y = Y_OFFSET + rect.depth * ROW_HEIGHT;

                ctx.fillStyle = getColor(rect.funcName, rect.depth);
                ctx.fillRect(x, y, w, ROW_HEIGHT - 2);

                if (w > 30) {
                    const cleanName = rect.funcName.replace(/\u0000/g, "");
                    ctx.fillStyle = "#000";
                    ctx.font = "10px monospace";
                    ctx.textBaseline = "middle";
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, y, w, ROW_HEIGHT - 2);
                    ctx.clip();
                    ctx.fillText(cleanName, x + 5, y + ROW_HEIGHT / 2);
                    ctx.restore();
                }
            });

            // 5. Render Axis
            ctx.save();
            ctx.strokeStyle = "#444";
            ctx.beginPath();
            ctx.moveTo(0, graphHeight);
            ctx.lineTo(width, graphHeight);
            ctx.stroke();

            const NUM_TICKS = 5;
            ctx.fillStyle = "#aaa";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            for (let i = 0; i <= NUM_TICKS; i++) {
                const ratio = i / NUM_TICKS;
                const x = width * ratio;
                const tickTime =
                    renderStart + BigInt(Math.floor(renderWindow * ratio));
                const label = `${(tickTime / 1_000_000n) % 60n}.${(
                    tickTime % 1_000_000n
                )
                    .toString()
                    .padStart(6, "0")}s`;

                ctx.fillStyle = "#444";
                ctx.fillRect(x, graphHeight, 1, 5);
                if (i === 0) ctx.textAlign = "left";
                else if (i === NUM_TICKS) ctx.textAlign = "right";
                else ctx.textAlign = "center";
                ctx.fillStyle = "#aaa";
                ctx.fillText(label, x, graphHeight + 8);
            }
            ctx.restore();

            frameId = requestAnimationFrame(renderGraph);
        };

        renderGraph();
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative", // Needed for absolute positioning children
                width: "100%",
                height: "100%",
                minHeight: "400px",
                backgroundColor: "#1e1e1e",
            }}
        >
            {/* 1. Bottom Layer: The Graph */}
            <canvas
                ref={graphCanvasRef}
                style={{
                    display: "block",
                    position: "absolute",
                    top: 0,
                    left: 0,
                }}
            />

            {/* 2. Top Layer: The UI (Transparent background) */}
            <canvas
                ref={uiCanvasRef}
                style={{
                    display: "block",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}
