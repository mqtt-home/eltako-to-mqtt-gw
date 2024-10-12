package main

import (
	"fmt"
	"github.com/mqtt-home/eltako-to-mqtt-gw/config"
	"github.com/mqtt-home/eltako-to-mqtt-gw/eltako"
	"github.com/philipparndt/go-logger"
	"github.com/philipparndt/mqtt-gateway/mqtt"
	"os"
	"os/signal"
	"syscall"
)

func startActors(cfg config.Eltako) {
	for _, device := range cfg.Devices {
		logger.Info(fmt.Sprintf("Initializing %s", device.String()))
		actor := eltako.NewShadingActor(device)
		err := actor.Start(cfg)
		if err != nil {
			panic(err)
		}
	}
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

	//for _, device := range cfg.Eltako.Devices {
	//    logger.Info("Device", device)
	//    actor := eltako.NewShadingActor(device)
	//    err := actor.Start(cfg.Eltako)
	//    if err != nil {
	//        panic(err)
	//    }
	//    //err := actor.UpdateToken()
	//    //if err != nil {
	//    //	logger.Error("Failed updating token", err)
	//    //	return
	//    //}
	//    //
	//    //for _, device := range actor.Devices {
	//    //	logger.Info("Device", device)
	//    //}
	//    //
	//    //position, err := actor.GetPosition()
	//    //if err != nil {
	//    //	logger.Error("Failed getting position", err)
	//    //	return
	//    //}
	//    //
	//    //logger.Info("Position", position)
	//    //
	//    //wg := sync.WaitGroup{}
	//    //err = actor.SetAndWaitForPosition(&wg, 5, 100)
	//    //if err != nil {
	//    //	logger.Info("Failed setting position", err)
	//    //}
	//    //
	//    //wg.Wait()
	//    //logger.Info("Done")
	//}

	// aef1bccd-d0e9-4cb5-8328-42485151accb

	//api = nuki.New(cfg.Nuki.Target.Web.SmartlockId, cfg.Nuki.Target.Web.Bearer)

	logger.SetLevel(cfg.LogLevel)
	mqtt.Start(cfg.MQTT, "eltako_mqtt")

	startActors(cfg.Eltako)

	//mqtt.Subscribe(cfg.Nuki.Source, OnMessage)
	//mqtt.Subscribe(cfg.Nuki.Fingerprint, OnFingerprintButton)
	//mqtt.Subscribe(cfg.MQTT.Topic+"/fingerprint_state", OnFingerprintState)

	logger.Info("Application is now ready. Press Ctrl+C to quit.")

	quitChannel := make(chan os.Signal, 1)
	signal.Notify(quitChannel, syscall.SIGINT, syscall.SIGTERM)
	<-quitChannel

	logger.Info("Received quit signal")
}
