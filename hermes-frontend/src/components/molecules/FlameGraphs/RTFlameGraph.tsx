import {
    useEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from "react";
import type { TraceEntryCallStack } from "../../../types";
import { getColor } from "../../../util";
import Tooltip from "../../atoms/Tooltip";

interface ExecutionFlameGraphProps {
    traces: TraceEntryCallStack[];
    connected: boolean;
}

const GAP_THRESHOLD_MULTIPLIER = 5;
const AXIS_HEIGHT = 30;
// Reserve left area for core label and other UI
const CORE_LABEL_MARGIN = 40;

export default function RTExecutionFlameGraph({
    traces,
    connected,
}: ExecutionFlameGraphProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Two separate canvas refs
    const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const uiCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const coreLabelCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Data Refs
    const latestTracesRef = useRef<TraceEntryCallStack[]>(traces);
    const traceStartTimeRef = useRef<bigint | undefined>(undefined);
    const dimensionsRef = useRef({ width: 0, height: 0 });
    const recordStartTimeRef = useRef<number>(Date.now());

    // animation frameIds
    const timerAnimationRef = useRef<number | null>(null);
    const flameGraphAnimationRef = useRef<number | null>(null);
    const coreLabelAnimationRef = useRef<number | null>(null);

    const coreNumbersPresent = useRef<number[]>([]);

    // hover map
    const drawnShapeMap = useRef<Map<string, TraceEntryCallStack>>(new Map());
    const [inspectedFunction, setInspectedFunction] =
        useState<TraceEntryCallStack | null>(null);

    // 1. Sync Data
    useEffect(() => {
        latestTracesRef.current = traces;
        if (!traceStartTimeRef.current && traces.length > 0) {
            let min = BigInt(traces[0].startTime);
            traces.forEach((t) => {
                if (BigInt(t.startTime) < min) min = BigInt(t.startTime);
                console.log(t.coreId);
            });
            traceStartTimeRef.current = min;
        }
        if (traces.length > 0) {
            const coreNumberSet: Set<number> = new Set();
            traces.forEach((t) => coreNumberSet.add(t.coreId));
            coreNumbersPresent.current = Array.from(coreNumberSet).sort(
                (a, b) => a - b
            );
        }
    }, [traces]);

    // 2. Resize Observer (Resizes BOTH canvases for High DPI)
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Logical dimensions (CSS pixels)
                const { width, height } = entry.contentRect;
                dimensionsRef.current = { width, height };

                const dpr = window.devicePixelRatio || 1;

                // Helper to resize canvas for High DPI
                const resizeCanvas = (canvas: HTMLCanvasElement | null) => {
                    if (canvas) {
                        // Set physical pixel dimensions (for sharpness)
                        canvas.width = width * dpr;
                        canvas.height = height * dpr;

                        // Set CSS dimensions (for layout size)
                        canvas.style.width = `${width}px`;
                        canvas.style.height = `${height}px`;
                    }
                };

                resizeCanvas(graphCanvasRef.current);
                resizeCanvas(uiCanvasRef.current);
                resizeCanvas(coreLabelCanvasRef.current);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // =========================================================
    // LOOP 1: THE UI LOOP (Timer Only)
    // =========================================================
    useEffect(() => {
        if (!connected) {
            if (timerAnimationRef.current) {
                cancelAnimationFrame(timerAnimationRef.current);
                timerAnimationRef.current = null;
            }
            return;
        }

        const canvas = uiCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const renderUI = () => {
            const { width, height } = dimensionsRef.current;
            const dpr = window.devicePixelRatio || 1;

            // 1. Reset Transform & Clear
            // We reset to identity matrix to clear the full physical canvas safely
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 2. Apply High DPI Scale
            // All subsequent drawing commands will now use Logical Pixels
            ctx.scale(dpr, dpr);

            // Draw Timer
            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "right";
            ctx.textBaseline = "top";

            const elapsed = Date.now() - recordStartTimeRef.current;

            if (width > 0) {
                ctx.fillText(`Time since start: ${elapsed} ms`, width - 10, 5);
            }

            timerAnimationRef.current = requestAnimationFrame(renderUI);
        };

        renderUI();
        return () => {
            if (timerAnimationRef.current) {
                cancelAnimationFrame(timerAnimationRef.current!);
                timerAnimationRef.current = null;
            }
        };
    }, [connected]);

    useEffect(() => {
        if (!connected) {
            if (coreLabelAnimationRef.current)
                cancelAnimationFrame(coreLabelAnimationRef.current);
            return;
        }

        const canvas = coreLabelCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const ROW_HEIGHT = coreNumbersPresent.current.length === 2 ? 20 : 40;
        const Y_OFFSET = ROW_HEIGHT;

        const renderUI = () => {
            const { width, height } = dimensionsRef.current;
            const dpr = window.devicePixelRatio || 1;

            // 1. Reset Transform & Clear
            // We reset to identity matrix to clear the full physical canvas safely
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 2. Apply High DPI Scale
            // All subsequent drawing commands will now use Logical Pixels
            ctx.scale(dpr, dpr);

            if (coreNumbersPresent.current.length === 2) {
                ctx.save();
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 10px monospace";
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillText("Core 0", 5, Y_OFFSET + ROW_HEIGHT);
                ctx.fillText("Core 1", 5, Y_OFFSET + ROW_HEIGHT + height / 2);

                ctx.fillStyle = "#808080";
                ctx.fillRect(15, height / 2, width, 1);

                ctx.restore();
            } else if (coreNumbersPresent.current.length === 1) {
                ctx.save();
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 10px monospace";
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillText(
                    `Core ${coreNumbersPresent.current[0]}`,
                    5,
                    Y_OFFSET + ROW_HEIGHT
                );

                ctx.restore();
            }

            coreLabelAnimationRef.current = requestAnimationFrame(renderUI);
        };

        renderUI();
        return () => {
            if (coreLabelAnimationRef.current) {
                cancelAnimationFrame(coreLabelAnimationRef.current!);
                coreLabelAnimationRef.current = null;
            }
        };
    }, [connected]);

    // =========================================================
    // LOOP 2: THE GRAPH LOOP (Heavy Data Visualization)
    // =========================================================
    useEffect(() => {
        if (!connected) {
            if (flameGraphAnimationRef.current) {
                cancelAnimationFrame(flameGraphAnimationRef.current);
                timerAnimationRef.current = null; // Typo in original: should likely clear flameGraphAnimationRef
                flameGraphAnimationRef.current = null;
            }
            return;
        }

        const canvas = graphCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        const renderGraph = () => {
            const traces = latestTracesRef.current;
            const { width, height } = dimensionsRef.current;
            const dpr = window.devicePixelRatio || 1;

            if (width === 0 || height === 0 || traces.length === 0) {
                flameGraphAnimationRef.current =
                    requestAnimationFrame(renderGraph);
                return;
            }

            const graphHeight = height - AXIS_HEIGHT;

            // 1. High DPI Setup & Clear
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear physical area
            ctx.scale(dpr, dpr); // Scale coordinate system

            // 2. Draw Background (using logical dimensions)
            ctx.fillStyle = "#1e1e1e";
            ctx.fillRect(0, 0, width, height);

            // 3. Smart Pruning Logic
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

            // 4. Viewport Math
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
                minStart - BigInt(Math.floor(renderWindow * 0.05));
            const usableWidth = Math.max(0, width - CORE_LABEL_MARGIN);
            const xDiv = usableWidth / renderWindow;

            // 5. Render Bars
            const renderMap = new Map();
            const ROW_HEIGHT =
                coreNumbersPresent.current.length === 2 ? 20 : 40;
            const Y_OFFSET = ROW_HEIGHT;

            visibleTraces.forEach((rect) => {
                const rectStart = Number(BigInt(rect.startTime) - renderStart);
                const rectEnd = Number(BigInt(rect.endTime) - renderStart);

                if (rectEnd < 0) return;

                const x = CORE_LABEL_MARGIN + rectStart * xDiv;
                const w = Math.max((rectEnd - rectStart) * xDiv, 1);
                if (x + w < CORE_LABEL_MARGIN || x > width) return;

                let y = Y_OFFSET + (rect.depth - 1) * ROW_HEIGHT;
                if (
                    coreNumbersPresent.current.length === 2 &&
                    rect.coreId === 1
                ) {
                    console.log("HELLO");
                    y += height / 2;
                }

                ctx.fillStyle = getColor(rect.funcName, rect.depth);
                ctx.fillRect(x, y, w, ROW_HEIGHT - 2);

                // Store coords in Logical Pixels, so mouse events match automatically
                renderMap.set(`${x},${y},${x + w},${y + ROW_HEIGHT - 2}`, rect);

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

            drawnShapeMap.current = renderMap;

            // 6. Render Axis
            ctx.save();
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 1; // 1 logical pixel = 2 physical pixels on Retina (crisp)
            ctx.beginPath();
            ctx.moveTo(CORE_LABEL_MARGIN, graphHeight);
            ctx.lineTo(width, graphHeight);
            ctx.stroke();

            const NUM_TICKS = 5;
            ctx.fillStyle = "#aaa";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            for (let i = 0; i <= NUM_TICKS; i++) {
                const ratio = i / NUM_TICKS;
                const x = CORE_LABEL_MARGIN + usableWidth * ratio;
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

            flameGraphAnimationRef.current = requestAnimationFrame(renderGraph);
        };

        renderGraph();
        return () => {
            if (flameGraphAnimationRef.current) {
                cancelAnimationFrame(flameGraphAnimationRef.current);
                flameGraphAnimationRef.current = null;
            }
        };
    }, [connected]);

    const handleMouseMove = (e: ReactMouseEvent) => {
        // offsetX is in CSS pixels, which matches our scaled context coords
        const mouseXLocation = e.nativeEvent.offsetX;
        const mouseYLocation = e.nativeEvent.offsetY;

        for (const [key, value] of drawnShapeMap.current) {
            const [x, y, xEnd, yEnd] = key.split(",");

            if (
                mouseXLocation >= Number(x) &&
                mouseXLocation <= Number(xEnd) &&
                mouseYLocation >= Number(y) &&
                mouseYLocation <= Number(yEnd)
            ) {
                setInspectedFunction(value);
                break;
            } else {
                setInspectedFunction(null);
            }
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: "400px",
                backgroundColor: "#1e1e1e",
            }}
        >
            <canvas
                ref={graphCanvasRef}
                style={{
                    display: "block",
                    position: "absolute",
                    top: 0,
                    left: 0,
                }}
                onMouseMove={handleMouseMove}
            />
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
            <canvas
                ref={coreLabelCanvasRef}
                style={{
                    display: "block",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                }}
            />
            {inspectedFunction && (
                <Tooltip inspectedFunction={inspectedFunction} />
            )}
        </div>
    );
}
