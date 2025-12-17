package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"log"
	"unsafe"

	"go.bug.st/serial"
)

const PORT_NAME = "/dev/cu.usbserial-0001"
const MSG_SIZE = 68 + 2

const (
    ENTER = iota
    EXIT
    PANIC
)

// alignment is based on the largest single type
// in this case, align everything to 4 bytes
type TraceFunctionGeneralEntry struct {
	TraceType   uint32
    CoreId      uint8
	_ 			[3]uint8
    Timestamp   uint32
    Trace_id    uint32
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
	FaultingPC 			uint32
	ExceptionReason 	[48]byte
}

func main() {
	mode := &serial.Mode{
		BaudRate: 115200,
	}

	port, err := serial.Open(PORT_NAME, mode)
	if err != nil {
		log.Fatalf("Unable to open serial port %v\n", err)
	}
    defer port.Close()

	port.ResetInputBuffer()
	sync(port)

	for {
		count := 0
		tempBuf := [MSG_SIZE]byte{}

		for count < MSG_SIZE {
			n, err := port.Read(tempBuf[count:])
			if err != nil {
				fmt.Printf("error in reader, %v\n", err)
				sync(port)
			}
			count += n
		}

        if !bytes.Equal(tempBuf[len(tempBuf) - 2 : ], []byte{'\r', '\n'}) {
            fmt.Printf("Control sequence at the end incorrect, %v\n", tempBuf[len(tempBuf) - 2 : ])
			sync(port)
            continue
        }

        // try to access the first byte of the message
        // which would give you information on what type of entry it is
        typePointer := unsafe.Pointer(&tempBuf[0])

        var traceEntry any
        streamReader := bytes.NewReader(tempBuf[:len(tempBuf) - 2])
        switch *(*uint32)(typePointer) {
        case ENTER:
			entry := TraceFunctionEnterEntry{}
            if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
				fmt.Printf("Error reading ENTER entry: %v\n", err)
			}
			traceEntry = entry
        case EXIT:
            entry := TraceFunctionExitEntry{}
            if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
				fmt.Printf("Error reading EXIT entry: %v\n", err)
			}
			traceEntry = entry
        case PANIC:
            entry := TraceFunctionPanicEntry{}
            if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
				fmt.Printf("Error reading PANIC entry: %v\n", err)
			}
			traceEntry = entry
        default:
            fmt.Println("Unsure")
        }

		fmt.Printf("Got: %+v\n", traceEntry)
	}
}

func sync(p serial.Port) {
	twoBytes := [2]byte{ 0x0, 0x0 }
	oneByte := [1]byte{}

	for !bytes.Equal(twoBytes[:], []byte{'\r', '\n'}) {
		_, err := p.Read(oneByte[:])
		if err != nil {
			fmt.Printf("Error while resyncing serial port %v", err)
		}

		// update the two byte sequence
		twoBytes[0] = twoBytes[1]
		twoBytes[1] = oneByte[0]
	}
}