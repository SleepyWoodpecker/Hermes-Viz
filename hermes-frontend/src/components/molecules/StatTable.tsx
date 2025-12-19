import type { StatEntryWithoutName } from "../../types";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Activity, BarChart3, Clock3, Flame } from "lucide-react";

interface StatTableProps {
    statMap: Map<string, StatEntryWithoutName>;
}

function formatDurationNs(ns: number): string {
    if (!Number.isFinite(ns) || ns < 0) return "-";

    // Treat incoming values as nanoseconds and scale to human-friendly units
    const micro = ns / 1_000;
    const milli = ns / 1_000_000;
    const seconds = ns / 1_000_000_000;

    if (seconds >= 1) {
        return `${seconds.toFixed(2)} s`;
    }
    if (milli >= 1) {
        return `${milli.toFixed(2)} ms`;
    }
    if (micro >= 1) {
        return `${micro.toFixed(2)} µs`;
    }

    return `${ns} ns`;
}

export default function StatTable({ statMap }: StatTableProps) {
    const entries = Array.from(statMap.entries());

    // Sort by hottest functions (max runtime) descending, then by calls made
    entries.sort(([, a], [, b]) => {
        if (b.maxRunTime !== a.maxRunTime) {
            return b.maxRunTime - a.maxRunTime;
        }
        return b.callsMade - a.callsMade;
    });

    const hasStats = entries.length > 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-400">
                        <BarChart3 className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold tracking-tight">
                            Function execution stats
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Live aggregate timings by function.
                        </p>
                    </div>
                </div>
                {hasStats && (
                    <Badge className="gap-1 bg-slate-900 text-xs text-slate-200">
                        <Activity className="h-3 w-3" />
                        {entries.length} tracked
                    </Badge>
                )}
            </CardHeader>
            <CardContent>
                {!hasStats ? (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-slate-900/40 text-xs text-muted-foreground">
                        <span className="mr-2 text-slate-500">
                            <Clock3 className="h-4 w-4" />
                        </span>
                        Waiting for function statistics...
                    </div>
                ) : (
                    <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                        <table className="min-w-full border-collapse text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur">
                                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2 text-left font-medium">
                                        Function
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        Calls
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        Avg runtime
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        Max runtime
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(([funcName, stat]) => {
                                    const {
                                        callsMade,
                                        averageRunTime,
                                        maxRunTime,
                                    } = stat;

                                    const isHot =
                                        maxRunTime === entries[0][1].maxRunTime;

                                    return (
                                        <tr
                                            key={funcName}
                                            className="border-b border-slate-800/50 last:border-0 hover:bg-slate-900/70"
                                        >
                                            <td className="max-w-[260px] px-3 py-2 align-middle">
                                                <div className="flex items-center gap-2">
                                                    {isHot ? (
                                                        <span className="rounded-full bg-amber-500/15 p-1 text-amber-400">
                                                            <Flame className="h-3 w-3" />
                                                        </span>
                                                    ) : (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                                                    )}
                                                    <code className="truncate rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                                                        {funcName}
                                                    </code>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right align-middle text-slate-200">
                                                {callsMade.toLocaleString()}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right align-middle text-slate-200">
                                                {formatDurationNs(
                                                    averageRunTime
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right align-middle text-slate-200">
                                                {formatDurationNs(maxRunTime)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
