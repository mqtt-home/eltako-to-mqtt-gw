package config

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/config"
)

var cfg Config

type Config struct {
	MQTT     config.MQTTConfig `json:"mqtt"`
	Eltako   Eltako            `json:"eltako"`
	Web      WebConfig         `json:"web"`
	LogLevel string            `json:"loglevel,omitempty"`
}

type WebConfig struct {
	Enabled bool `json:"enabled"`
	Port    int  `json:"port"`
}

type BlindsConfig struct {
	TiltDownPercentage float64 `json:"tiltDownPercentage"`
	TiltUpPercentage   float64 `json:"tiltUpPercentage"`
}

type Device struct {
	Ip           string       `json:"ip,omitempty"`
	Serial       string       `json:"serial,omitempty"`
	Username     string       `json:"username"`
	Password     string       `json:"password"`
	Name         string       `json:"name"`
	BlindsConfig BlindsConfig `json:"blindsConfig"`
}

func (d *Device) String() string {
	return fmt.Sprintf("Device{name: %s; ip: %s}", d.Name, d.Ip)
}

type Eltako struct {
	Devices         []Device `json:"devices"`
	PollingInterval int      `json:"polling-interval"`
	OptimizeTilt    *bool    `json:"optimizeTilt,omitempty"`
}

func LoadConfig(file string) (Config, error) {
	data, err := os.ReadFile(file)
	if err != nil {
		logger.Error("Error reading config file", err)
		return Config{}, err
	}

	data = config.ReplaceEnvVariables(data)

	// Unmarshal the JSON data into the Config object
	err = json.Unmarshal(data, &cfg)
	if err != nil {
		logger.Error("Unmarshaling JSON:", err)
		return Config{}, err
	}

	// Set default values
	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}

	// Set default value for OptimizeTilt if not specified in config
	if cfg.Eltako.OptimizeTilt == nil {
		defaultOptimizeTilt := true
		cfg.Eltako.OptimizeTilt = &defaultOptimizeTilt
	}

	return cfg, nil
}

func (c *Eltako) GetBySN(sn string) *Device {
	for i := range c.Devices {
		if c.Devices[i].Serial == sn {
			return &c.Devices[i]
		}
	}

	return nil
}

func (e Eltako) GetOptimizeTilt() bool {
	if e.OptimizeTilt == nil {
		return true // default value
	}
	return *e.OptimizeTilt
}

func Get() Config {
	return cfg
}
