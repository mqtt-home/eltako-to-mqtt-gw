package commands

type LLAction string

const (
	LLActionSet  LLAction = "set"
	LLActionTilt LLAction = "tilt"
)

type LLCommand struct {
	Action   LLAction
	Position int
}
