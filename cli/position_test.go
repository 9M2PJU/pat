package cli

import (
	"testing"

	"github.com/la5nta/wl2k-go/catalog"
)

func TestCourseFromFloat64(t *testing.T) {
	tests := []struct {
		name     string
		input    float64
		magnetic bool
		expected catalog.Course
	}{
		{
			name:     "zero degrees",
			input:    0.0,
			magnetic: false,
			expected: catalog.Course{Magnetic: false, Digits: [3]byte{'0', '0', '0'}},
		},
		{
			name:     "90 degrees",
			input:    90.0,
			magnetic: true,
			expected: catalog.Course{Magnetic: true, Digits: [3]byte{'0', '9', '0'}},
		},
		{
			name:     "180 degrees",
			input:    180.0,
			magnetic: false,
			expected: catalog.Course{Magnetic: false, Digits: [3]byte{'1', '8', '0'}},
		},
		{
			name:     "359 degrees",
			input:    359.0,
			magnetic: true,
			expected: catalog.Course{Magnetic: true, Digits: [3]byte{'3', '5', '9'}},
		},
		{
			name:     "123.456 degrees",
			input:    123.456,
			magnetic: false,
			expected: catalog.Course{Magnetic: false, Digits: [3]byte{'1', '2', '3'}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CourseFromFloat64(tt.input, tt.magnetic)
			if result.Magnetic != tt.expected.Magnetic {
				t.Errorf("CourseFromFloat64(%v, %v): Magnetic = %v; expected %v", tt.input, tt.magnetic, result.Magnetic, tt.expected.Magnetic)
			}
			for i, expectedDigit := range tt.expected.Digits {
				if result.Digits[i] != expectedDigit {
					t.Errorf("CourseFromFloat64(%v, %v): Digits[%d] = %c; expected %c", tt.input, tt.magnetic, i, result.Digits[i], expectedDigit)
				}
			}
		})
	}
}
