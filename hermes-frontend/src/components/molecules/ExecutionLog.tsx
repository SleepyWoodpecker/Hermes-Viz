import { AlertTriangle, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { TraceTypes, type TraceEntry } from "../../types";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";

interface ExecutionLogProps {
    executionLog: TraceEntry[];
}

export default function ExecutionLog({ executionLog }: ExecutionLogProps) {
    return (
        <Card>
            <CardHeader>Trace log</CardHeader>
            <CardContent>
                {executionLog.length === 0 ? (
                    <div>Waiting for logs...</div> // TODO: could make this a loading skeleton
                ) : (
                    <div className="flex flex-col gap-2">
                        {executionLog.map((sample) => (
                            <ExecutionLogCard entry={sample} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ExecutionLogCardProps {
    entry: TraceEntry;
}

function ExecutionLogCard({ entry }: ExecutionLogCardProps) {
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

        return (
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
                        {timestamp}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.EXIT) {
        const { coreId, timestamp, traceId, funcCallId, returnVal, funcName } =
            entry;
        return (
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
                        {timestamp}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.PANIC) {
        const { timestamp, faultingPC, exceptionReason, traceId } = entry;

        return (
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
                        {timestamp}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.RESTART) {
        const { restartReason, timestamp } = entry;
        return (
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
                    <div className="text-sm text-muted-foreground">
                        {timestamp}
                    </div>
                </div>
            </div>
        );
    }
}
