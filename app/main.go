package main

import (
	"fmt"
	"github.com/mqtt-home/eltako-to-mqtt-gw/commands"
	"github.com/mqtt-home/eltako-to-mqtt-gw/config"
	"github.com/mqtt-home/eltako-to-mqtt-gw/eltako"
	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/mqtt"
	"os"
	"os/signal"
	"sync"
	"syscall"
)

func startActors(cfg config.Eltako) *eltako.ActorRegistry {
	registry := eltako.NewActorRegistry()

	wg := sync.WaitGroup{}
	for _, device := range cfg.Devices {
		logger.Info(fmt.Sprintf("Initializing %s", device.String()))
		actor := eltako.NewShadingActor(device)
		err := actor.Start(&wg, cfg)
		if err != nil {
			panic(err)
		}

		registry.AddActor(actor)
	}
	wg.Wait()

	return registry
}

func subscribeToCommands(cfg config.Config, actors *eltako.ActorRegistry) {
	prefix := cfg.MQTT.Topic + "/"
	postfix := "/set"
	mqtt.Subscribe(prefix+"+"+postfix, func(topic string, payload []byte) {
		logger.Info("Received message", topic, string(payload))
		actor := actors.GetActor(topic[len(prefix) : len(topic)-len(postfix)])
		if actor == nil {
			logger.Error("Unknown actor", topic)
			return
		}

		command, err := commands.Parse(payload)
		if err != nil {
			logger.Error("Failed parsing command", err)
			return
		}
		actor.Apply(command)
	})
}

func main() {
	if len(os.Args) < 2 {
		logger.Error("No config file specified")
		os.Exit(1)
	}

	configFile := os.Args[1]
	logger.Info("Config file", configFile)
	err := error(nil)

	cfg, err := config.LoadConfig(configFile)
	if err != nil {
		logger.Error("Failed loading config", err)
		return
	}

	logger.SetLevel(cfg.LogLevel)
	mqtt.Start(cfg.MQTT, "eltako_mqtt")

	actors := startActors(cfg.Eltako)
	subscribeToCommands(cfg, actors)

	logger.Info("Application is now ready. Press Ctrl+C to quit.")

	quitChannel := make(chan os.Signal, 1)
	signal.Notify(quitChannel, syscall.SIGINT, syscall.SIGTERM)
	<-quitChannel

	logger.Info("Received quit signal")
}
