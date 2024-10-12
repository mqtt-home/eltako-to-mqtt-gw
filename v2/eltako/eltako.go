package eltako

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/mqtt-home/eltako-to-mqtt-gw/config"
	"github.com/philipparndt/go-logger"
	"io"
	"net/http"
	"time"
)

type ShadingActor struct {
	device  config.Device
	client  *HTTPClient
	Devices []Device
}

func NewShadingActor(device config.Device) *ShadingActor {
	client := NewHTTPClient("https://" + device.Ip + ":443/api/v0")
	actor := &ShadingActor{
		device: device,
		client: client,
	}
	err := actor.init()
	if err != nil {
		panic(err)
	}
	return actor
}

func (s *ShadingActor) init() error {
	err := s.UpdateToken()
	if err != nil {
		return err
	}
	devices, err := s.getDevices()
	s.Devices = devices
	return nil
}

func (s *ShadingActor) UpdateToken() error {
	usernamePassword := map[string]string{
		"user":     s.device.Username,
		"password": s.device.Password,
	}

	body, err := json.Marshal(usernamePassword)
	if err != nil {
		return err
	}

	resp, err := s.client.Post("/login", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to update token, status code: %d", resp.StatusCode)
	}

	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	token, ok := result["apiKey"]
	if !ok {
		return fmt.Errorf("apiKey not found in response")
	}

	s.client.SetAuthToken(token)
	return nil
}

func (s *ShadingActor) getDevices() ([]Device, error) {
	resp, err := s.client.Get("/devices")
	if err != nil {
		return nil, err
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get devices, status code: %d", resp.StatusCode)
	}

	var devices []Device
	if err := json.NewDecoder(resp.Body).Decode(&devices); err != nil {
		return nil, err
	}

	return devices, nil
}

func (s *ShadingActor) findDeviceByFunctionName(functionName string) (*Device, error) {
	for _, device := range s.Devices {
		for _, function := range device.Functions {
			if function.Identifier == functionName {
				return &device, nil
			}
		}
	}
	return nil, fmt.Errorf("device not found")
}
func (s *ShadingActor) findDeviceByInfo(infoName string) (*Device, error) {
	for _, device := range s.Devices {
		for _, info := range device.Infos {
			if info.Identifier == infoName {
				return &device, nil
			}
		}
	}
	return nil, fmt.Errorf("device not found")
}

func executeWithRetry[T any](times int, f func() (T, error)) (T, error) {
	current := 0
	var zeroValue T // Zero value of the type T
	for {
		result, err := f()
		if err == nil {
			return result, nil
		}

		current++
		if current >= times {
			logger.Error("Failed to execute after", times)
			return zeroValue, err
		}

		logger.Error("Failed to execute, retrying: ", err)
		// wait for 500ms before retrying
		time.Sleep(500 * time.Millisecond)
	}
}
