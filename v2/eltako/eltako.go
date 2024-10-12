package eltako

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/mqtt-home/eltako-to-mqtt-gw/config"
	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/mqtt"
	"io"
	"net/http"
	"time"
)

type ShadingActor struct {
	device  config.Device
	client  *HTTPClient
	Devices []Device
	Name    string
	IP      string
}

func NewShadingActor(device config.Device) *ShadingActor {
	client := NewHTTPClient(fmt.Sprintf("https://%s:443/api/v0", device.Ip))
	actor := &ShadingActor{
		device: device,
		client: client,
		Name:   device.Name,
		IP:     device.Ip,
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

func (s *ShadingActor) DisplayName() string {
	if s.Name == "" {
		info, err := s.findDeviceByInfo("currentPosition")
		if err != nil {
			return s.IP
		}
		return info.DisplayName
	}
	return s.Name
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

func (s *ShadingActor) String() string {
	return fmt.Sprintf("ShadingActor{name: %s; ip: %s}", s.Name, s.IP)
}

func (s *ShadingActor) Start(cfg config.Eltako) error {
	err := s.UpdateToken()
	if err != nil {
		return err
	}

	go func(s *ShadingActor) {
		for {
			logger.Debug("Updating token")
			err := s.UpdateToken()
			if err != nil {
				logger.Error("Failed updating token", err)
			}

			logger.Debug("Token update done, sleeping for 60 minutes")
			time.Sleep(60 * time.Minute)
		}
	}(s)

	if cfg.PollingInterval > 0 {
		pollingDuration := time.Duration(cfg.PollingInterval) * time.Millisecond
		logger.Info(fmt.Sprintf("Starting polling of %s with interval %s", s, pollingDuration))
		go func(s *ShadingActor, cfg config.Eltako) {
			errorCtr := 0
			for {
				position, err := s.getPosition()

				if err != nil {
					errorCtr++
					if errorCtr >= 5 {
						logger.Error("PANIC: Failed to marshal position message", err)
						panic(err)
					}
				} else {
					errorCtr = 0
					mqtt.PublishJSON(s.DisplayName(), PositionMessage{position})
					time.Sleep(pollingDuration)
				}
			}
		}(s, cfg)
	} else {
		logger.Info(fmt.Sprintf("Polling disabled for %s", s))
	}

	return nil
}
