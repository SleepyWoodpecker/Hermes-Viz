package udpreader

import (
	"fmt"
	"log"
	"net"
)

const (
	RAW_PACKET_SIZE = 72
)

type UDPReader struct {
	*net.UDPConn
	MessageQueue 	chan<- [RAW_PACKET_SIZE]byte
}

func NewUDPReader(port string, messageQueue chan<- [RAW_PACKET_SIZE]byte) *UDPReader {
	udpAddr, err := net.ResolveUDPAddr("udp", port)
	if err != nil {
		log.Fatalf("Unable to create UDP address %v", err)
	}

	conn, err := net.ListenUDP("udp", udpAddr)
	if err != nil {
		log.Fatalf("Unable to listen to UDP address %v", err)
	}	

	log.Printf("UDP listener on port %s\n", port)

	return &UDPReader{
		conn,
	 	messageQueue,
	}
}

func (u *UDPReader) ReadPacket() error {
	count := 0
	buffer := [RAW_PACKET_SIZE]byte{} 

	for count < RAW_PACKET_SIZE {
		// should be alright to do this style of read since the connection should have its own receive buffer
		n, _, err := u.UDPConn.ReadFromUDP(buffer[count : ])

		if err != nil {
			return err
		}

		count += n
	}

	u.MessageQueue <- buffer

	return nil
}

func (u *UDPReader) Run() {
	for {
		err := u.ReadPacket()

		if err != nil {
			fmt.Printf("%v\n", err)
		}
	}
}