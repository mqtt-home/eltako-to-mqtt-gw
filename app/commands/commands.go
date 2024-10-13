package commands

import (
	"encoding/json"
	"fmt"
	"strings"
)

type ActionType string

func (a *ActionType) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	*a = ActionType(strings.ToLower(s))
	return nil
}

const (
	ActionClose              ActionType = "close"
	ActionOpen               ActionType = "open"
	ActionSet                ActionType = "set"
	ActionCloseAndOpenBlinds ActionType = "closeandopenblinds"
	ActionTilt               ActionType = "tilt"
)

type Action struct {
	Action   ActionType `json:"action"`
	Position int        `json:"position"`
}

func Parse(data []byte) (LLCommand, error) {
	var command Action
	err := json.Unmarshal(data, &command)

	if err == nil {
		return command.validate()
	}

	return LLCommand{}, err
}

func (c *Action) validate() (LLCommand, error) {
	llc := LLCommand{}
	switch strings.ToLower(string(c.Action)) {
	case string(ActionClose):
		llc.Action = LLActionSet
		llc.Position = 0
	case string(ActionOpen):
		llc.Action = LLActionSet
		llc.Position = 100
	case string(ActionSet):
		fallthrough
	case "":
		llc.Action = LLActionSet
		llc.Position = c.Position
	case string(ActionCloseAndOpenBlinds):
		llc.Action = LLActionTilt
		llc.Position = 0
	case string(ActionTilt):
		llc.Action = LLActionTilt
		llc.Position = c.Position
	default:
		return llc, fmt.Errorf("invalid action")
	}

	return llc, nil
}
