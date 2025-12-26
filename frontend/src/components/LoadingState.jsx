import { useState, useEffect } from 'react'

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const steps = [
    'Initializing analysis...',
    'Gathering product information...',
    'Analyzing user onboarding patterns...',
    'Evaluating pricing strategy...',
    'Identifying value propositions...',
    'Assessing competitive differentiation...',
    'Finalizing analysis...'
  ]

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 3000)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) {
          return prev + Math.random() * 15
        }
        return prev
      })
    }, 1000)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [steps.length])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="ptp-card p-8 text-center">
        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-emerald-600 rounded-full animate-spin absolute top-0 left-0" style={{
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent'
            }}></div>
          </div>
        </div>

        {/* Current Step */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generating Analysis
        </h2>
        
        <p className="text-gray-600 mb-6">
          {steps[currentStep]}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-emerald-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-center space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index <= currentStep ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <p className="text-sm text-gray-500 mt-6">
          This usually takes 15-45 seconds
        </p>
      </div>
    </div>
  )
}