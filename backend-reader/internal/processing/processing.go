package processing

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"math"
	"strings"
	"unsafe"
)

const (
	RAW_PACKET_SIZE = 72
	IS_FLOAT = 0b01
	IS_SIGNED = 0b10
)

// entry type enum
const (
    ENTER = iota
    EXIT
    PANIC
)

// alignment is based on the largest single type
// in this case, align everything to 4 bytes
type TraceFunctionGeneralEntry struct {
	TraceType   uint32 	`json:"traceType"`
    CoreId      uint32	`json:"coreId"`
    Timestamp   uint32	`json:"timestamp"`
    TraceId    	uint32	`json:"traceId"`
	FuncNumId	uint32	`json:"funcCallId"`
}

type TraceFunctionEnterEntry struct {
    TraceFunctionGeneralEntry
    ValueTypes  uint8
    ArgCount    uint8
	_ 			[2]uint8
    FuncArgs    [4]uint32
    FuncName    [16]byte
}

type TraceFunctionExitEntry struct {
    TraceFunctionGeneralEntry
    ValueTypes  uint8
    _           [3]uint8
    ReturnVal   uint32
    _           [3]uint32
    FuncName    [16]byte
}

type TraceFunctionPanicEntry struct {
	TraceFunctionGeneralEntry
	FaultingPC 			uint32 		`json:"faultingPC"`
	ExceptionReason 	[48]byte	`json:"exceptionReason"`
}

// make another type to account for the fact that the arguments could be floats
type FormattedTraceFunctionEnterEntry struct {
	TraceFunctionGeneralEntry
	ArgCount	uint8
    FuncArgs    [4]interface{} 	`json:"funcArgs"`
    FuncName    [16]byte		`json:"funcName"`
}

type FormattedTraceFunctionExitEntry struct {
	TraceFunctionGeneralEntry
    ReturnVal   interface{}			`json:"returnVal"`
    FuncName    [16]byte		`json:"funcName"`
}

type Processor struct {
	MessageQueue <-chan [RAW_PACKET_SIZE]byte
	PortName 	string
	SocketManager *SocketManager
}

func NewProcessor(portname string, messageQueue <-chan [RAW_PACKET_SIZE]byte, sm *SocketManager) *Processor {
	return &Processor{
		MessageQueue: messageQueue,
		PortName: portname,
		SocketManager: sm,
	}
}

func (p *Processor) Process() {
	tempBuf := <-p.MessageQueue
	
	// try to access the first byte of the message
	// which would give you information on what type of entry it is
	typePointer := unsafe.Pointer(&tempBuf[0])

	streamReader := bytes.NewReader(tempBuf[:])
	switch *(*uint32)(typePointer) {
	case ENTER:
		entry := TraceFunctionEnterEntry{}
		if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
			if !strings.Contains(err.Error(), "EOF") {
				fmt.Printf("Error reading ENTER entry: %v\n", err)
				return
			}
		}
		p.processEntry(&entry)
	case EXIT:
		entry := TraceFunctionExitEntry{}
		if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
			if !strings.Contains(err.Error(), "EOF") {
				fmt.Printf("Error reading EXIT entry: %v\n", err)
				return
			}
		}
		p.processExit(&entry)
	case PANIC:
		entry := TraceFunctionPanicEntry{}
		if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
			fmt.Printf("Error reading PANIC entry: %v\n", err)
			return
		}
		p.processPanic(&entry)
	default:
		fmt.Println("Unsure")
	}
}

func (p *Processor) Run() {
	for {
		p.Process()
	}
}

func (p *Processor) processEntry(entry *TraceFunctionEnterEntry) {
	buffer := [4]interface{}{}	
	formatFuncArgsFromBuffer(&buffer, entry.FuncArgs, entry.ValueTypes)
	dataToSend := FormattedTraceFunctionEnterEntry{
		TraceFunctionGeneralEntry: TraceFunctionGeneralEntry{
			TraceType: entry.TraceType,
			CoreId: entry.CoreId,
			Timestamp: entry.Timestamp,
			TraceId: entry.TraceId,
			FuncNumId: entry.FuncNumId,
		},
		ArgCount: entry.ArgCount,
		FuncArgs: buffer,
		FuncName: entry.FuncName,
	}

	p.SocketManager.Broadcast(dataToSend)
}

func (p *Processor) processExit(entry *TraceFunctionExitEntry) {
	formattedReturnVal := formatFuncArg(entry.ReturnVal, entry.ValueTypes, 0)
	dataToSend := FormattedTraceFunctionExitEntry{
		TraceFunctionGeneralEntry: TraceFunctionGeneralEntry{
			TraceType: entry.TraceType,
			CoreId: entry.CoreId,
			Timestamp: entry.Timestamp,
			TraceId: entry.TraceId,
			FuncNumId: entry.FuncNumId,
		},
		ReturnVal: formattedReturnVal,
		FuncName: entry.FuncName,
	}

	p.SocketManager.Broadcast(dataToSend)
}

func (p *Processor) processPanic(entry *TraceFunctionPanicEntry) {
	p.SocketManager.Broadcast(entry)
}

func formatFuncArgsFromBuffer(buffer *[4]interface{}, funcArgs [4]uint32, valueTypes uint8) {
	for idx, arg := range funcArgs {
		returnVal := formatFuncArg(arg, valueTypes, idx)
		buffer[idx] = returnVal
	}
}

func formatFuncArg(funcArg uint32, valueType uint8, idx int) interface{} {
	dataFlags := (valueType & (11 << (idx * 2))) >> (idx * 2)
	switch dataFlags {
	case IS_FLOAT:
		return math.Float32frombits(funcArg)
	case IS_SIGNED:
		return *(*int32)(unsafe.Pointer(&funcArg))
	default:
		return funcArg
	}
}
