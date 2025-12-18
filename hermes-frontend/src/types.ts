export enum TraceTypes {
    ENTER = 0,
    EXIT = 1,
    PANIC = 2,
    RESTART = 3,
}

export type TraceEntryEnter = {
    traceType: TraceTypes.ENTER;
    coreId: number;
    timestamp: number;
    traceId: number;
    funcCallId: number;
    argCount: number;
    funcArgs: number[];
    funcName: string;
};

export type TraceEntryExit = {
    traceType: TraceTypes.EXIT;
    coreId: number;
    timestamp: number;
    traceId: number;
    funcCallId: number;
    returnVal: number;
    funcName: string;
};

export type TraceEntryPanic = {
    traceType: TraceTypes.PANIC;
    coreId: number;
    timestamp: number;
    traceId: number;
    funcCallId: number;
    faultingPC: number;
    exceptionReason: string;
};

export type TraceEntryRestart = {
    traceType: TraceTypes.RESTART;
    timestamp: number;
    restartReason: string;
};

export type TraceEntry =
    | TraceEntryEnter
    | TraceEntryExit
    | TraceEntryPanic
    | TraceEntryRestart;
