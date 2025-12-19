import { AlertTriangle, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { TraceTypes, type TrackedTraceEntry } from "../../types";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useRef, type RefObject } from "react";

interface ExecutionLogProps {
    executionLog: TrackedTraceEntry[];
}

export default function ExecutionLog({ executionLog }: ExecutionLogProps) {
    const seenLogsRef = useRef<Set<string>>(new Set());
    return (
        <Card>
            <CardHeader>Trace log</CardHeader>
            <CardContent>
                {executionLog.length === 0 ? (
                    <div>Waiting for logs...</div> // TODO: could make this a loading skeleton
                ) : (
                    <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto pr-1">
                        {executionLog.map((sample) => {
                            return (
                                <ExecutionLogCard
                                    entry={sample}
                                    key={`${sample.packetId}`}
                                    seenSet={seenLogsRef}
                                />
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ExecutionLogCardProps {
    entry: TrackedTraceEntry;
    seenSet: RefObject<Set<string>>;
}

function ExecutionLogCard({ entry, seenSet }: ExecutionLogCardProps) {
    let dispEl = <div></div>;

    if (entry.traceType === TraceTypes.ENTER) {
        const {
            coreId,
            timestamp,
            argCount,
            funcArgs,
            funcName,
            traceId,
            funcCallId,
        } = entry;

        dispEl = (
            <div className="flex items-center justify-between w-full gap-8 p-4 border rounded-lg border-border bg-card h-20">
                <div className="flex items-center gap-4">
                    <span className="text-yellow-400">
                        <ArrowLeft />
                    </span>
                    <Badge className="px-3 py-1 w-20">CALL</Badge>
                    <div className="flex flex-col">
                        <code className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm text-center">
                            {funcName}
                        </code>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                            Trace #{traceId} · Call #{funcCallId}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-row items-center gap-1">
                        <p className="text-xs text-muted-foreground/80">
                            Args:
                        </p>
                        <div className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm">
                            [
                            {funcArgs
                                .slice(0, argCount)
                                .map((arg, idx, arr) => (
                                    <code key={idx} className="mx-0.5">
                                        {`${arg}${
                                            idx < arr.length - 1 ? "," : ""
                                        }`}
                                    </code>
                                ))}
                            ]
                        </div>
                    </div>
                    <div className="px-3 py-1 rounded-md border border-border text-sm">
                        Core: {coreId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {formatNanoTo24HourLocale(timestamp)}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.EXIT) {
        const { coreId, timestamp, traceId, funcCallId, returnVal, funcName } =
            entry;
        dispEl = (
            <div className="flex items-center justify-between w-full gap-8 p-4 border rounded-lg border-border bg-card h-20">
                <div className="flex items-center gap-4">
                    <span className="text-green-400">
                        <ArrowRight />
                    </span>
                    <Badge className="px-3 py-1 w-20">RETURN</Badge>
                    <div className="flex flex-col">
                        <code className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm text-center">
                            {funcName}
                        </code>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                            Trace #{traceId} · Call #{funcCallId}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-row items-center gap-1">
                        <p className="text-xs text-muted-foreground/80">
                            Return:
                        </p>
                        <div className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm">
                            <code>{returnVal}</code>
                        </div>
                    </div>
                    <div className="px-3 py-1 rounded-md border border-border text-sm">
                        Core: {coreId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {formatNanoTo24HourLocale(timestamp)}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.PANIC) {
        const { timestamp, faultingPC, exceptionReason, traceId } = entry;
        console.log(timestamp);

        if (!seenSet.current.has(entry.packetId)) {
            toast("Board Panic", {
                icon: <AlertTriangle className="text-red-500" />,
                style: {
                    background: "rgba(69, 10, 10, 0.2)", // bg-red-950/20
                    color: "#e5e7eb",
                    border: "1px solid rgba(239, 68, 68, 0.5)", // border-red-500/50
                    borderRadius: "12px",
                },
            });
        }

        dispEl = (
            <div className="flex items-center justify-between w-full gap-8 p-4 border rounded-lg border-red-500/50 bg-red-950/20 hover:bg-red-950/30 h-20">
                <div className="flex items-center gap-4">
                    <span className="text-red-400">
                        <AlertTriangle />
                    </span>
                    <Badge className="px-3 py-1 w-20">PANIC</Badge>
                    <div className="flex flex-col justify-center items-center">
                        <code className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm text-center">
                            {exceptionReason}
                        </code>
                        <p className="text-xs text-muted-foreground/80">
                            Trace #{traceId}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-row items-center gap-1">
                        <p className="text-xs text-muted-foreground/80">
                            Faulting PC:
                        </p>
                        <div className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm">
                            <code>0x{faultingPC.toString(16)}</code>
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {formatNanoTo24HourLocale(timestamp)}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.RESTART) {
        const { restartReason, timestamp, coreId } = entry;

        if (!seenSet.current.has(entry.packetId)) {
            toast("Board Restarted", {
                icon: <RotateCcw className="text-orange-500" />,
                style: {
                    background: "rgba(69, 26, 3, 0.2)", // bg-orange-950/20
                    color: "#e5e7eb",
                    border: "1px solid rgba(249, 115, 22, 0.5)", // border-orange-500/50
                    borderRadius: "12px",
                },
            });
        }

        dispEl = (
            <div className="flex items-center justify-between w-full gap-8 p-4 border rounded-lg border-orange-500/50 bg-orange-950/20 hover:bg-orange-950/30 h-20">
                <div className="flex items-center gap-4">
                    <span className="text-orange-400">
                        <RotateCcw />
                    </span>
                    <Badge className="px-3 py-1 w-20">RESTART</Badge>
                    <div className="flex flex-col justify-center items-center">
                        <code className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm text-center">
                            {restartReason}
                        </code>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 rounded-md border border-border text-sm">
                        Core: {coreId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {formatNanoTo24HourLocale(timestamp)}
                    </div>
                </div>
            </div>
        );
    }

    seenSet.current.add(entry.packetId);
    return dispEl;
}

function formatNanoTo24HourLocale(nanosecondTimestamp: string) {
    const nano = BigInt(nanosecondTimestamp);
    const milliseconds = nano / BigInt(1000000);
    const dateObj = new Date(Number(milliseconds));

    // Use 'en-GB' locale which defaults to 24-hour time (e.g., 14:00:00)
    // 'hour12: false' option can be specified for clarity
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    return formattedTime;
}
