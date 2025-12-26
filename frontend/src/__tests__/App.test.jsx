import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock the components to avoid complex dependencies
vi.mock('../components/ProductInputForm', () => ({
  default: ({ error }) => (
    <div data-testid="product-input-form">
      <div>ProductInputForm</div>
      {error && <div data-testid="error">{error}</div>}
    </div>
  )
}))

vi.mock('../components/AnalysisDisplay', () => ({
  default: ({ analysis, onNewAnalysis }) => (
    <div data-testid="analysis-display">
      <div>AnalysisDisplay</div>
      <div>Product: {analysis.product_name}</div>
      <button onClick={onNewAnalysis}>New Analysis</button>
    </div>
  )
}))

vi.mock('../components/LoadingState', () => ({
  default: () => <div data-testid="loading-state">Loading...</div>
}))

describe('App', () => {
  it('renders the main header', () => {
    render(<App />)
    
    expect(screen.getByText('Product Teardown Platform')).toBeInTheDocument()
    expect(screen.getByText(/ai-powered competitive analysis/i)).toBeInTheDocument()
  })

  it('shows ProductInputForm by default', () => {
    render(<App />)
    
    expect(screen.getByTestId('product-input-form')).toBeInTheDocument()
    expect(screen.queryByTestId('analysis-display')).not.toBeInTheDocument()
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
  })

  it('has proper CSS classes for styling', () => {
    const { container } = render(<App />)
    
    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('ptp-page')
  })
})