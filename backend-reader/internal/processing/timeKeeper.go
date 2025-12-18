package processing

import (
	"time"
)

type TimeKeeper struct {
	ProgStartTime 	int64
	BoardStartTime	uint32
}

func NewTimeKeeper() *TimeKeeper {
	return &TimeKeeper{
		ProgStartTime: time.Now().UnixNano(),
		BoardStartTime: 0,
	}
}

func (t *TimeKeeper) GetTimestampToSend(boardTime uint32) int64 {
	// if there has not been a global time, set that first
	if t.BoardStartTime == 0 {	
		// perform conversion from milliseconds into nanoseconds
		t.BoardStartTime = boardTime * 1000000
	}

	return t.ProgStartTime + (int64(boardTime) - int64(t.BoardStartTime) * 1000000)
}

func (t *TimeKeeper) HandleBoardReset() {
	t.BoardStartTime = 0
	t.ProgStartTime = time.Now().UnixNano()
}