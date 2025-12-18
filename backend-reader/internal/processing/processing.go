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
	RESTART
)

// esp32 restart reasons
const (
    ESP_RST_UNKNOWN = iota    //!< Reset reason can not be determined
    ESP_RST_POWERON    //!< Reset due to power-on event
    ESP_RST_EXT        //!< Reset by external pin (not applicable for ESP32)
    ESP_RST_SW         //!< Software reset via esp_restart
    ESP_RST_PANIC      //!< Software reset due to exception/panic
    ESP_RST_INT_WDT    //!< Reset (software or hardware) due to interrupt watchdog
    ESP_RST_TASK_WDT   //!< Reset due to task watchdog
    ESP_RST_WDT        //!< Reset due to other watchdogs
    ESP_RST_DEEPSLEEP  //!< Reset after exiting deep sleep mode
    ESP_RST_BROWNOUT   //!< Brownout reset (software or hardware)
    ESP_RST_SDIO       //!< Reset over SDIO
    ESP_RST_USB        //!< Reset by USB peripheral
    ESP_RST_JTAG       //!< Reset by JTAG
    ESP_RST_EFUSE      //!< Reset due to efuse error
    ESP_RST_PWR_GLITCH //!< Reset due to power glitch detected
    ESP_RST_CPU_LOCKUP //!< Reset due to CPU lock up (double exception)
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

type TraceFunctionRestartEntry struct {
	TraceFunctionGeneralEntry
	RestartReason	uint32
}

// make another type to account for the fact that the arguments could be floats
type FormattedTraceFunctionEnterEntry struct {
	TraceFunctionGeneralEntry
	ArgCount	uint8			`json:"argCount"`
    FuncArgs    [4]interface{} 	`json:"funcArgs"`
    FuncName    string			`json:"funcName"`
}

type FormattedTraceFunctionExitEntry struct {
	TraceFunctionGeneralEntry
    ReturnVal   interface{}			`json:"returnVal"`
    FuncName    string				`json:"funcName"`
}

type FormattedTraceFunctionPanicEntry struct {
	TraceFunctionGeneralEntry
	FaultingPC 			uint32 		`json:"faultingPC"`
	ExceptionReason 	string		`json:"exceptionReason"`
}

type FormattedTraceFunctionRestartEntry struct {
	TraceType		uint32			`json:"traceType"`
	RestartReason	string			`json:"restartReason"`
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
	case RESTART:
		entry := TraceFunctionRestartEntry{}
		if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
			fmt.Printf("Error reading restart entry: %v\n", err)
			return
		}
		p.processRestart(&entry)
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
		FuncName: string(entry.FuncName[:]),
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
		FuncName: string(entry.FuncName[:]),
	}

	p.SocketManager.Broadcast(dataToSend)
}

func (p *Processor) processPanic(entry *TraceFunctionPanicEntry) {
	dataToSend := FormattedTraceFunctionPanicEntry{
		TraceFunctionGeneralEntry: TraceFunctionGeneralEntry{
			TraceType: entry.TraceType,
			CoreId: entry.CoreId,
			Timestamp: entry.Timestamp,
			TraceId: entry.TraceId,
			FuncNumId: entry.FuncNumId,
		},
		FaultingPC: entry.FaultingPC,
		ExceptionReason: string(entry.ExceptionReason[:]),
	}
	p.SocketManager.Broadcast(dataToSend)
}

func (p *Processor) processRestart(entry *TraceFunctionRestartEntry) {
	dataToSend := FormattedTraceFunctionRestartEntry{
		TraceType: RESTART,
		RestartReason: getResetReason(entry.RestartReason),
	}
	p.SocketManager.Broadcast(dataToSend)
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

func getResetReason(reason uint32) string {
	switch reason {
	case ESP_RST_UNKNOWN:
		return "Unknown reset reason"
	case ESP_RST_POWERON:
		return "Power-on reset"
	case ESP_RST_EXT:
		return "External pin reset"
	case ESP_RST_SW:
		return "Software reset via esp_restart"
	case ESP_RST_PANIC:
		return "Software reset due to exception/panic"
	case ESP_RST_INT_WDT:
		return "Interrupt watchdog reset"
	case ESP_RST_TASK_WDT:
		return "Task watchdog reset"
	case ESP_RST_WDT:
		return "Other watchdog reset"
	case ESP_RST_DEEPSLEEP:
		return "Wakeup from deep sleep"
	case ESP_RST_BROWNOUT:
		return "Brownout reset (voltage dip)"
	case ESP_RST_SDIO:
		return "Reset over SDIO"
	case ESP_RST_USB:
		return "Reset by USB peripheral"
	case ESP_RST_JTAG:
		return "Reset by JTAG"
	case ESP_RST_EFUSE:
		return "Reset due to efuse error"
	case ESP_RST_PWR_GLITCH:
		return "Power glitch detected"
	case ESP_RST_CPU_LOCKUP:
		return "CPU lock up (double exception)"
	default:
		return "Invalid reset reason"
	}
}