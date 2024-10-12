package config

import (
	"encoding/json"
	"fmt"
	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/config"
	"os"
)

type Config struct {
	MQTT     config.MQTTConfig `json:"mqtt"`
	Eltako   Eltako            `json:"eltako"`
	LogLevel string            `json:"loglevel,omitempty"`
}

type Device struct {
	Ip           string `json:"ip"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	Name         string `json:"name"`
	BlindsConfig struct {
		HalfOpenPercentage float64 `json:"halfOpenPercentage"`
	} `json:"blindsConfig"`
}

func (d *Device) String() string {
	return fmt.Sprintf("Device{name: %s; ip: %s}", d.Name, d.Ip)
}

type Eltako struct {
	Devices         []Device `json:"devices"`
	PollingInterval int      `json:"polling-interval"`
}

func LoadConfig(file string) (Config, error) {
	data, err := os.ReadFile(file)
	if err != nil {
		logger.Error("Error reading config file", err)
		return Config{}, err
	}

	data = config.ReplaceEnvVariables(data)

	// Create a Config object
	var cfg Config

	// Unmarshal the JSON data into the Config object
	err = json.Unmarshal(data, &cfg)
	if err != nil {
		logger.Error("Unmarshalling JSON:", err)
		return Config{}, err
	}

	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}

	return cfg, nil
}
