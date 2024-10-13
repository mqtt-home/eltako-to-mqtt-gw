package eltako

import (
	"fmt"
	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/mqtt"
	"time"
)

func (s *ShadingActor) schedulePolling(pollingInterval int) {
	errorCtr := 0
	interval := time.Duration(pollingInterval) * time.Millisecond
	logger.Info(fmt.Sprintf("Starting polling of %s with interval %s", s, interval))
	for {
		position, err := s.getPosition()

		if err != nil {
			errorCtr++
			if errorCtr >= 5 {
				logger.Error("PANIC: Failed to poll position", err)
				panic(err)
			}
		} else {
			errorCtr = 0
			mqtt.PublishJSON(s.DisplayName(), PositionMessage{position})
			time.Sleep(interval)
		}
	}
}

func (s *ShadingActor) scheduleUpdateToken() {
	interval := time.Duration(60) * time.Minute
	logger.Info(fmt.Sprintf("Scheduling token update of %s with interval %s", s, interval))
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
