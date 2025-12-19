export enum TraceTypes {
    ENTER = 0,
    EXIT = 1,
    PANIC = 2,
    RESTART = 3,
    FLAME_GRAPH_ENTRY = 4,
    STAT_UPDATES = 5,
}

export type TraceEntryEnter = {
    traceType: TraceTypes.ENTER;
    coreId: number;
    timestamp: string;
    traceId: number;
    funcCallId: number;
    argCount: number;
    funcArgs: number[];
    funcName: string;
    packetId: string;
};

export type TraceEntryExit = {
    traceType: TraceTypes.EXIT;
    coreId: number;
    timestamp: string;
    traceId: number;
    funcCallId: number;
    returnVal: number;
    funcName: string;
    packetId: string;
};

export type TraceEntryPanic = {
    traceType: TraceTypes.PANIC;
    coreId: number;
    timestamp: string;
    traceId: number;
    funcCallId: number;
    faultingPC: number;
    exceptionReason: string;
    packetId: string;
};

export type TraceEntryRestart = {
    traceType: TraceTypes.RESTART;
    coreId: number;
    timestamp: string;
    restartReason: string;
    packetId: string;
};

export type StatEntry = {
    callsMade: number;
    averageRunTime: number;
    maxRunTime: number;
    funcName: string;
};

export type StatEntryWithoutName = Omit<StatEntry, "funcName">;

export type TraceEntryStat = {
    traceType: TraceTypes.STAT_UPDATES;
    statMap: StatEntry[];
};

export type TraceEntry =
    | TraceEntryEnter
    | TraceEntryExit
    | TraceEntryPanic
    | TraceEntryRestart
    | TraceEntryStat;

export type TrackedTraceEntry = TraceEntry;
