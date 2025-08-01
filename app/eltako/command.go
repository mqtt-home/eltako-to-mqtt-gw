package eltako

import (
	"github.com/mqtt-home/eltako-to-mqtt-gw/commands"
	"github.com/philipparndt/go-logger"
	"sync"
)

func (s *ShadingActor) Apply(command commands.LLCommand) {

	switch command.Action {
	case commands.LLActionSet:
		_, err := s.SetPosition(command.Position)
		if err != nil {
			logger.Error("Failed setting position", err)
		} else {
			logger.Info("Set position to", command.Position)
		}
	case commands.LLActionTilt:
		s.Tilt(command.Position)
	}
}

func (s *ShadingActor) Tilt(position int) {
	if s.Tilted && s.TiltPosition == position {
		logger.Info("Ignoring tilt command, already tilted correctly", s)
		return
	}

	logger.Debug("Tilt command received", s, "to position", position)

	wg := sync.WaitGroup{}

	startPosition, err := s.getPosition()
	if err != nil {
		logger.Error("Tilt failed; error getting position", err)
		return
	}

	err = s.SetAndWaitForPosition(&wg, position, 60)
	if err != nil {
		logger.Error("Tilt failed; error setting position", err)
		return
	}
	wg.Wait()

	offset := 0
	if startPosition < position {
		offset = -int(s.Config.TiltDownPercentage)
	} else {
		offset = int(s.Config.TiltUpPercentage)
	}

	_, err = s.SetPosition(position + offset)
	if err != nil {
		logger.Error("Tilt failed; error setting tilt position", err)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.Tilted = true
	s.TiltPosition = position
	logger.Debug("Tilt command executed successfully", s, "to position", position, "with offset", offset)

}
