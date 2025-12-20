import { useEffect, useRef } from "react";
import type { TraceEntryCallStack } from "../../types";
import { getColor } from "../../util";

interface ExecutionFlameGraphProps {
    traces: TraceEntryCallStack[];
}

// x rendering
const WINDOW_SIZE_MICROS = 2_000_000;

// y rendering
const ROW_HEIGHT = 40;
const Y_OFFSET = 20; // Start from bottom

export default function ExecutionFlameGraph({
    traces,
}: ExecutionFlameGraphProps) {
    // normalize all the other times so we dont run into problems trying to render them
    const traceStartTime = useRef<bigint | undefined>(undefined);
    const progStartTime = useRef<bigint | undefined>(undefined);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // initialize all the start times together
    useEffect(() => {
        if (
            !traceStartTime.current &&
            !progStartTime.current &&
            traces.length
        ) {
            let curr = BigInt(traces[0].startTime);
            traces.forEach((trace) => {
                const currentTimestamp = BigInt(trace.startTime);
                if (currentTimestamp < curr) {
                    curr = currentTimestamp;
                }
            });

            traceStartTime.current = curr;

            progStartTime.current = BigInt(Date.now()) * 1_000n;
        }
    }, [traces]);

    useEffect(() => {
        if (!traceStartTime.current || !progStartTime.current) return;

        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d", {
            alpha: false,
        });
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(
                0,
                0,
                canvasRef.current!.width,
                canvasRef.current!.height
            );
            ctx.fillStyle = "#1e1e1e";
            ctx.fillRect(
                0,
                0,
                canvasRef.current!.width,
                canvasRef.current!.height
            );

            const xDiv = canvasRef.current!.width / WINDOW_SIZE_MICROS;

            const windowEnd = Number(
                BigInt(Date.now()) * 1_000n - progStartTime.current!
            );
            const windowStart = windowEnd - WINDOW_SIZE_MICROS;

            traces.forEach((rect) => {
                // these are the normalized start times in microseconds
                const rectStartTime = Number(
                    BigInt(rect.startTime) - traceStartTime.current!
                );
                const rectEndTime = Number(
                    BigInt(rect.endTime) - traceStartTime.current!
                );

                if (rectEndTime < windowStart || rectStartTime > windowEnd) {
                    console.log("nope");
                    return;
                }

                const x = (rectStartTime - windowStart) * xDiv;
                const w = Math.max((rectEndTime - rectStartTime) * xDiv, 50);

                const y = Y_OFFSET + rect.depth * ROW_HEIGHT;

                ctx.fillStyle = getColor(rect.funcName, rect.depth);
                ctx.fillRect(x, y, w, ROW_HEIGHT - 2);

                // Draw Text (Function Name)
                if (w > 30) {
                    // Only draw text if wide enough
                    ctx.fillStyle = "#000";
                    ctx.font = "10px monospace";
                    ctx.fillText(`${rect.funcName}`, x + 4, y + 20);
                }
            });

            animationFrameId = window.requestAnimationFrame(render);
        };

        render();

        return () => window.cancelAnimationFrame(animationFrameId);
    }, [traces]);

    return (
        <div>
            <canvas ref={canvasRef} width={1000} height={400} />
        </div>
    );
}
