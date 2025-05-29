package discovery

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/grandcat/zeroconf"
)

type Actor struct {
	Instance string
	Addr     string
	Port     int
	PN       string
	SN       string
	MD       string
	LastSeen time.Time
}

func (a Actor) equalTo(b Actor) bool {
	return a.Instance == b.Instance &&
		a.Addr == b.Addr &&
		a.Port == b.Port &&
		a.PN == b.PN &&
		a.SN == b.SN &&
		a.MD == b.MD
}

type ActorEvent struct {
	Type  string // "added", "updated", "removed"
	Actor Actor
}

type EltakoDiscovery struct {
	actors map[string]Actor
	mu     sync.Mutex
	events chan<- ActorEvent
}

func New(events chan<- ActorEvent) *EltakoDiscovery {
	result := EltakoDiscovery{
		actors: make(map[string]Actor),
		events: events,
	}
	return &result
}

// decodeEscapedDecimalUTF8 decodes a string like "B\195\188ro Ost" into proper UTF-8
func decodeEscapedDecimalUTF8(s string) string {
	var buf bytes.Buffer
	for i := 0; i < len(s); {
		if s[i] == '\\' && i+4 <= len(s) {
			valStr := s[i+1 : i+4]
			if val, err := strconv.ParseInt(valStr, 10, 16); err == nil {
				buf.WriteByte(byte(val))
				i += 4
				continue
			}
		}
		buf.WriteByte(s[i])
		i++
	}

	// Return decoded UTF-8 string
	decoded := buf.Bytes()
	if utf8.Valid(decoded) {
		return string(decoded)
	}

	return s // fallback to original
}

func (d *EltakoDiscovery) onEntry(entry *zeroconf.ServiceEntry) {
	if len(entry.AddrIPv4) == 0 {
		return
	}

	key := fmt.Sprintf("%s:%d", entry.AddrIPv4[0], entry.Port)
	props := parseTXT(entry.Text)

	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	newActor := Actor{
		Instance: entry.Instance,
		Addr:     entry.AddrIPv4[0].String(),
		Port:     entry.Port,
		PN:       decodeEscapedDecimalUTF8(props["pn"]),
		SN:       props["sn"],
		MD:       props["md"],
		LastSeen: now,
	}

	oldActor, exists := d.actors[key]
	switch {
	case !exists:
		d.actors[key] = newActor
		d.events <- ActorEvent{"added", newActor}
	case !oldActor.equalTo(newActor):
		d.actors[key] = newActor
		d.events <- ActorEvent{"updated", newActor}
	default:
		// Update TTL
		d.actors[key] = newActor
	}

}

func (d *EltakoDiscovery) Start() {
	// TTL expiry goroutine
	go func() {
		for {
			time.Sleep(5 * time.Second)
			d.mu.Lock()
			now := time.Now()
			for key, actor := range d.actors {
				if now.Sub(actor.LastSeen) > 30*time.Second {
					delete(d.actors, key)
					d.events <- ActorEvent{"removed", actor}
				}
			}
			d.mu.Unlock()
		}
	}()

	// Re-browse every 10s to refresh actor info
	go func() {
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			entries := make(chan *zeroconf.ServiceEntry)
			go func() {
				for e := range entries {
					d.onEntry(e)
				}
			}()

			resolver, err := zeroconf.NewResolver(nil)
			if err != nil {
				log.Fatal("Failed to initialize resolver:", err)
			}
			err = resolver.Browse(ctx, "_eltako._tcp", "local.", entries)
			if err != nil {
				log.Printf("Browse failed: %v", err)
			}
			<-ctx.Done()
			cancel()
			time.Sleep(5 * time.Second)
		}
	}()
}

func parseTXT(txt []string) map[string]string {
	props := make(map[string]string)
	for _, entry := range txt {
		parts := strings.SplitN(entry, "=", 2)
		if len(parts) == 2 {
			props[parts[0]] = parts[1]
		}
	}
	return props
}
