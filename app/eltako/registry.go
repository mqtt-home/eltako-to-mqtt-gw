package eltako

import "strings"

type ActorRegistry struct {
	Actors map[string]*ShadingActor
}

func NewActorRegistry() *ActorRegistry {
	return &ActorRegistry{
		Actors: make(map[string]*ShadingActor),
	}
}

func (r *ActorRegistry) AddActor(actor *ShadingActor) {
	r.Actors[strings.ToLower(actor.Name)] = actor
}

func (r *ActorRegistry) GetActor(name string) *ShadingActor {
	return r.Actors[strings.ToLower(name)]
}

func (r *ActorRegistry) GetActorBySN(sn string) *ShadingActor {
	for _, actor := range r.Actors {
		if actor.Serial == sn {
			return actor
		}
	}

	return nil
}
