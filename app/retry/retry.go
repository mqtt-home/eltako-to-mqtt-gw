package retry

import (
	"github.com/philipparndt/go-logger"
	"time"
)

func Times[T any](times int, f func() (T, error)) (T, error) {
	current := 0
	var zeroValue T // Zero value of the type T
	for {
		result, err := f()
		if err == nil {
			return result, nil
		}

		current++
		if current >= times {
			logger.Error("Failed to execute after", times)
			return zeroValue, err
		}

		logger.Error("Failed to execute, retrying: ", err)
		time.Sleep(500 * time.Millisecond)
	}
}
