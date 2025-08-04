package eltako

import (
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/mqtt"
)

// PositionChangeEvent is sent to the global channel when an actor's position changes
// You can extend this struct with more fields if needed
// e.g. Tilt, Serial, etc.
type PositionChangeEvent struct {
	ActorName string
	Position  int
}

var PositionChangeChan = make(chan PositionChangeEvent, 100)

func (s *ShadingActor) schedulePolling(wg *sync.WaitGroup, pollingInterval int) {
	errorCtr := 0
	interval := time.Duration(pollingInterval) * time.Millisecond
	logger.Info(fmt.Sprintf("Starting polling of %s with interval %s", s, interval))
	wg.Done()
	lastPosition := s.Position
	for {
		position, err := s.getPosition()

		if err != nil {
			errorCtr++
			if errorCtr >= 5 {
				logger.Panic("Failed to poll position", err)
			}
		} else {
			logger.Debug("Polled position", s.Name, strconv.Itoa(position)+"%")
			errorCtr = 0
			if position != lastPosition {
				lastPosition = position
				s.Position = position
				mqtt.PublishJSON(s.DisplayName(), PositionMessage{position})
				// Send to global channel
				PositionChangeChan <- PositionChangeEvent{ActorName: s.Name, Position: position}
			}
			time.Sleep(interval)
		}
	}
}

func (s *ShadingActor) scheduleUpdateToken(wg *sync.WaitGroup) {
	interval := time.Duration(60) * time.Minute
	logger.Info(fmt.Sprintf("Scheduling token update of %s with interval %s", s.Name, interval))
	wg.Done()
	for {
		logger.Debug("Updating token")
		err := s.UpdateToken()
		if err != nil {
			logger.Error("Failed updating token", err)
		}

		logger.Debug("Token update done, sleeping for 60 minutes")
		time.Sleep(interval)
	}
}
