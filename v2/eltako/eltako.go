package eltako

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/mqtt-home/eltako-to-mqtt-gw/config"
	"io"
	"net/http"
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
