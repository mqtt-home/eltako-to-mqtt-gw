package eltako

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/mqtt-home/eltako-to-mqtt-gw/retry"
	"github.com/philipparndt/go-logger"
	"io"
	"net/http"
	"sync"
	"time"
)

func (s *ShadingActor) GetPosition() (int, error) {
	wg := sync.WaitGroup{}
	wg.Add(1)

	return retry.Times[int](3, func() (int, error) {
		return s.getPosition()
	})
}

func (s *ShadingActor) getPosition() (int, error) {
	device, err := s.findDeviceByInfo("currentPosition")
	if err != nil {
		return 0, err
	}

	s.mu.Lock()
	oldPosition := s.Position
	s.mu.Unlock()

	resp, err := s.client.Get("/devices/" + device.DeviceGuid + "/infos/currentPosition")
	if err != nil {
		return 0, err
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("failed to get position, status code: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}

	position, ok := result["value"].(float64)
	if !ok {
		return 0, fmt.Errorf("position not found in response")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.Position = int(position)

	if s.Position != oldPosition {
		s.Tilted = false
	}

	return s.Position, nil
}

func (s *ShadingActor) SetPosition(position int) (bool, error) {
	if position < 0 || position > 100 {
		return false, fmt.Errorf("invalid position")
	}

	return retry.Times[bool](3, func() (bool, error) {
		return s.setPosition(position)
	})
}

func (s *ShadingActor) setPosition(position int) (bool, error) {
	device, err := s.findDeviceByFunctionName("targetPosition")
	if err != nil {
		return false, err
	}

	body, err := json.Marshal(Command{
		Type:       "number",
		Identifier: "targetPosition",
		Value:      position,
	})
	if err != nil {
		return false, err
	}

	s.mu.Lock()
	s.Tilted = false
	s.mu.Unlock()

	resp, err := s.client.Put("/devices/"+device.DeviceGuid+"/functions/targetPosition", bytes.NewReader(body))
	if err != nil {
		return false, err
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(resp.Body)

	if resp.StatusCode != http.StatusAccepted {
		return false, fmt.Errorf("failed to set position, status code: %d", resp.StatusCode)
	}

	return true, nil
}

func (s *ShadingActor) WaitForPosition(waitGroup *sync.WaitGroup, position int, timeout int) error {
	if position < 0 || position > 100 {
		return fmt.Errorf("invalid position")
	}

	waitGroup.Add(1)

	go func() {
		defer waitGroup.Done()
		startTime := time.Now()

		for {
			currentPosition, err := s.GetPosition()
			if err != nil {
				logger.Error("Failed to get position", err)
				return
			}
			if currentPosition == position {
				logger.Debug(fmt.Sprintf("Position %d reached", position))
				return
			}

			logger.Debug(fmt.Sprintf("Waiting for position %d (current: %d)", position, currentPosition))
			if time.Since(startTime).Seconds() > float64(timeout) {
				logger.Error("Timeout waiting for position")
				return
			}

			time.Sleep(500 * time.Millisecond)
		}
	}()

	return nil
}

func (s *ShadingActor) SetAndWaitForPosition(waitGroup *sync.WaitGroup, position int, timeout int) error {
	if position < 0 || position > 100 {
		return fmt.Errorf("invalid position")
	}

	_, err := s.SetPosition(position)
	if err != nil {
		return err
	}

	return s.WaitForPosition(waitGroup, position, timeout)
}
