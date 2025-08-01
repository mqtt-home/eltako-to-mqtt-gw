package web

import (
	"encoding/json"
	"fmt"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/mqtt-home/eltako-to-mqtt-gw/commands"
	"github.com/mqtt-home/eltako-to-mqtt-gw/eltako"
	"github.com/philipparndt/go-logger"
	"net/http"
	"strconv"
)

type WebServer struct {
	registry *eltako.ActorRegistry
	router   *chi.Mux
}

type ActorStatus struct {
	Name         string `json:"name"`
	DisplayName  string `json:"displayName"`
	IP           string `json:"ip"`
	Serial       string `json:"serial"`
	Position     int    `json:"position"`
	Tilted       bool   `json:"tilted"`
	TiltPosition int    `json:"tiltPosition"`
}

type TiltRequest struct {
	Position int `json:"position"`
}

type SetPositionRequest struct {
	Position int `json:"position"`
}

func NewWebServer(registry *eltako.ActorRegistry) *WebServer {
	ws := &WebServer{
		registry: registry,
		router:   chi.NewRouter(),
	}
	ws.setupRoutes()
	return ws
}

func (ws *WebServer) setupRoutes() {
	ws.router.Use(middleware.Logger)
	ws.router.Use(middleware.Recoverer)
	
	// CORS configuration
	ws.router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// API routes
	ws.router.Route("/api", func(r chi.Router) {
		r.Get("/actors", ws.getAllActors)
		r.Get("/actors/{actorName}", ws.getActor)
		r.Post("/actors/{actorName}/position", ws.setActorPosition)
		r.Post("/actors/{actorName}/tilt", ws.tiltActor)
		r.Post("/actors/all/tilt", ws.tiltAllActors)
	})

	// Serve static files (React app)
	fileServer := http.FileServer(http.Dir("./web/dist/"))
	ws.router.Handle("/*", fileServer)
}

func (ws *WebServer) getAllActors(w http.ResponseWriter, r *http.Request) {
	var actors []ActorStatus
	
	for _, actor := range ws.registry.Actors {
		// Get current position
		position, err := actor.GetPosition()
		if err != nil {
			logger.Error("Failed to get position for actor", actor.Name, err)
			position = actor.Position // fallback to cached position
		}
		
		status := ActorStatus{
			Name:         actor.Name,
			DisplayName:  actor.DisplayName(),
			IP:           actor.IP,
			Serial:       actor.Serial,
			Position:     position,
			Tilted:       actor.Tilted,
			TiltPosition: actor.TiltPosition,
		}
		actors = append(actors, status)
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(actors)
}

func (ws *WebServer) getActor(w http.ResponseWriter, r *http.Request) {
	actorName := chi.URLParam(r, "actorName")
	actor := ws.registry.GetActor(actorName)
	
	if actor == nil {
		http.Error(w, fmt.Sprintf("Actor '%s' not found", actorName), http.StatusNotFound)
		return
	}
	
	// Get current position
	position, err := actor.GetPosition()
	if err != nil {
		logger.Error("Failed to get position for actor", actor.Name, err)
		position = actor.Position // fallback to cached position
	}
	
	status := ActorStatus{
		Name:         actor.Name,
		DisplayName:  actor.DisplayName(),
		IP:           actor.IP,
		Serial:       actor.Serial,
		Position:     position,
		Tilted:       actor.Tilted,
		TiltPosition: actor.TiltPosition,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func (ws *WebServer) setActorPosition(w http.ResponseWriter, r *http.Request) {
	actorName := chi.URLParam(r, "actorName")
	actor := ws.registry.GetActor(actorName)
	
	if actor == nil {
		http.Error(w, fmt.Sprintf("Actor '%s' not found", actorName), http.StatusNotFound)
		return
	}
	
	var req SetPositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	if req.Position < 0 || req.Position > 100 {
		http.Error(w, "Position must be between 0 and 100", http.StatusBadRequest)
		return
	}
	
	command := commands.LLCommand{
		Action:   commands.LLActionSet,
		Position: req.Position,
	}
	
	go actor.Apply(command)
	
	logger.Info(fmt.Sprintf("Set position for actor %s to %d", actorName, req.Position))
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (ws *WebServer) tiltActor(w http.ResponseWriter, r *http.Request) {
	actorName := chi.URLParam(r, "actorName")
	actor := ws.registry.GetActor(actorName)
	
	if actor == nil {
		http.Error(w, fmt.Sprintf("Actor '%s' not found", actorName), http.StatusNotFound)
		return
	}
	
	var req TiltRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	if req.Position < 0 || req.Position > 100 {
		http.Error(w, "Position must be between 0 and 100", http.StatusBadRequest)
		return
	}
	
	command := commands.LLCommand{
		Action:   commands.LLActionTilt,
		Position: req.Position,
	}
	
	go actor.Apply(command)
	
	logger.Info(fmt.Sprintf("Tilt actor %s to position %d", actorName, req.Position))
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (ws *WebServer) tiltAllActors(w http.ResponseWriter, r *http.Request) {
	var req TiltRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	if req.Position < 0 || req.Position > 100 {
		http.Error(w, "Position must be between 0 and 100", http.StatusBadRequest)
		return
	}
	
	command := commands.LLCommand{
		Action:   commands.LLActionTilt,
		Position: req.Position,
	}
	
	tiltedCount := 0
	for _, actor := range ws.registry.Actors {
		go actor.Apply(command)
		tiltedCount++
	}
	
	logger.Info(fmt.Sprintf("Tilt all %d actors to position %d", tiltedCount, req.Position))
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"count":  tiltedCount,
	})
}

func (ws *WebServer) Start(port int) error {
	addr := ":" + strconv.Itoa(port)
	logger.Info(fmt.Sprintf("Starting web server on %s", addr))
	return http.ListenAndServe(addr, ws.router)
}
