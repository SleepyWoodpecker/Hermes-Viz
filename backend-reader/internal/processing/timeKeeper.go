package processing

import (
	"time"
)

type TimeKeeper struct {
	ProgStartTime 	int64
	BoardStartTime	int64
}

func NewTimeKeeper() *TimeKeeper {
	return &TimeKeeper{
		ProgStartTime: time.Now().UnixMicro(),
		BoardStartTime: 0,
	}
}

func (t *TimeKeeper) GetTimestampToSend(boardTime uint32) int64 {
	expandedBoardTime := int64(boardTime)
	// if there has not been a global time, set that first
	if t.BoardStartTime == 0 {	
		// perform conversion from milliseconds into microseconds
		t.BoardStartTime = expandedBoardTime
	}

	return t.ProgStartTime + (expandedBoardTime - t.BoardStartTime)
}

func (t *TimeKeeper) HandleBoardReset() {
	t.BoardStartTime = 0
	t.ProgStartTime = time.Now().UnixMicro()
}