package main

import (
	"fmt"
	"github.com/mqtt-home/eltako-to-mqtt-gw/commands"
	"github.com/mqtt-home/eltako-to-mqtt-gw/config"
	"github.com/mqtt-home/eltako-to-mqtt-gw/discovery"
	"github.com/mqtt-home/eltako-to-mqtt-gw/eltako"
	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/mqtt"
	"os"
	"os/signal"
	"sync"
	"syscall"
)

func startActors(cfg config.Eltako) {

	wg := &sync.WaitGroup{}
	for _, device := range cfg.Devices {
		if device.Ip == "" {
			logger.Info("Skipping actor, as IP is not defined", device.Name, device.Serial)
			continue
		}

		startActor(&device, cfg.PollingInterval, wg)
	}
	wg.Wait()
}

func startActor(device *config.Device, pollingInterval int, wg *sync.WaitGroup) *eltako.ShadingActor {
	logger.Info(fmt.Sprintf("Initializing actor %s", device.Name), device.Ip)
	actor := eltako.NewShadingActor(*device)
	err := actor.Start(wg, pollingInterval)
	if err != nil {
		panic(err)
	}
	registry.AddActor(actor)
	return actor
}

func subscribeToCommands(cfg config.Config, actors *eltako.ActorRegistry) {
	prefix := cfg.MQTT.Topic + "/"
	postfix := "/set"
	mqtt.Subscribe(prefix+"+"+postfix, func(topic string, payload []byte) {
		logger.Debug("Received message", topic, string(payload))
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

func startDiscovery(cfg config.Config) {
	foundSerial := false
	for _, device := range cfg.Eltako.Devices {
		if device.Serial != "" {
			foundSerial = true
			break
		}
	}

	if !foundSerial {
		logger.Info("Zeroconf not started, as no serial number is specified in the configuration")
		return
	}

	actorUpdates := make(chan discovery.ActorEvent, 1)
	d := discovery.New(actorUpdates)
	d.Start()

	go func() {
		for event := range actorUpdates {
			a := event.Actor
			if event.Type == "added" {
				d := cfg.Eltako.GetBySN(a.SN)
				if d == nil {
					logger.Warn("Cannot register actor, no actor configured with Serial:", a.SN, a)
				} else {
					d.Ip = a.Addr
					wg := &sync.WaitGroup{}
					startActor(d, cfg.Eltako.PollingInterval, wg)
					wg.Wait()
				}
			} else if event.Type == "updated" {
				logger.Warn("Actor updated (not supported)", event.Type, a.Instance, a.Addr, a.Port, a.PN, a.SN, a.MD)
				// currently not supported
			} else if event.Type == "removed" {
				logger.Warn("Actor removed (not supported)", event.Type, a.Instance, a.Addr, a.Port, a.PN, a.SN, a.MD)
			} else {
				logger.Panic("Unknown event type", event.Type, a.Instance, a.Addr, a.Port, a.PN, a.SN, a.MD)
			}

		}
	}()

}

var registry = eltako.NewActorRegistry()

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

	startDiscovery(cfg)

	mqtt.Start(cfg.MQTT, "eltako_mqtt")

	startActors(cfg.Eltako)
	subscribeToCommands(cfg, registry)

	logger.Info("Application is now ready. Press Ctrl+C to quit.")

	quitChannel := make(chan os.Signal, 1)
	signal.Notify(quitChannel, syscall.SIGINT, syscall.SIGTERM)
	<-quitChannel

	logger.Info("Received quit signal")
}
