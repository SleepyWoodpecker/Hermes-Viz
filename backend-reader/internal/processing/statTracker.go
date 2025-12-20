package processing

import (
	"strconv"
	"sync"
)

type FunctionStats struct {
	CallsMade		int64		`json:"callsMade"`
	AverageRunTime	float64		`json:"averageRunTime"`
	MaxRunTime		int64		`json:"maxRunTime"`
}

type StatTracker struct {
	mu			sync.Mutex
	StatMap		map[string]*FunctionStats
}

type FormattedFunctionStats struct {
	FunctionStats
	FuncName	string `json:"funcName"`
}

func NewStatTracker() *StatTracker {
	return &StatTracker{
		StatMap: make(map[string]*FunctionStats),
	}
}

func (s *StatTracker) AddStats(entry *FormattedCompletedFunctionCall) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// record funcRunTime in microseconds
	endTime, _ := strconv.ParseInt(entry.EndTime, 10, 64)
	startTime, _ := strconv.ParseInt(entry.StartTime, 10, 64)
	funcRunTime := (endTime - startTime)
	
	if record, ok := s.StatMap[entry.FuncName]; ok {
		record.AverageRunTime = record.AverageRunTime * float64(record.CallsMade) + float64(funcRunTime)

		record.CallsMade++
		record.AverageRunTime /= float64(record.CallsMade)
		record.MaxRunTime = max(funcRunTime, record.MaxRunTime)
	} else {
		s.StatMap[entry.FuncName] = &FunctionStats{
			CallsMade: 1,
			AverageRunTime: float64(funcRunTime),
			MaxRunTime: funcRunTime,
		}
	}
}

func (s *StatTracker) GetStats() *[]FormattedFunctionStats {
	s.mu.Lock()
	defer s.mu.Unlock()

	funcStatArr := make([]FormattedFunctionStats, 0, len(s.StatMap))
	for funcName, funcStats := range s.StatMap {
		funcStatArr = append(funcStatArr, 
			FormattedFunctionStats{
				FunctionStats: FunctionStats{
					CallsMade: funcStats.CallsMade,
					AverageRunTime: funcStats.AverageRunTime,
					MaxRunTime: funcStats.MaxRunTime,
				},
				FuncName: funcName,
			},
		)
	}

	return &funcStatArr
}