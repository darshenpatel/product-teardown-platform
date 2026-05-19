import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductInputForm from '../ProductInputForm'

describe('ProductInputForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    localStorage.clear()
  })

  it('renders omnibox by default', () => {
    render(<ProductInputForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText(/^product$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate teardown/i })).toBeInTheDocument()
  })

  it('shows validation error for empty input', async () => {
    const user = userEvent.setup()
    render(<ProductInputForm onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /generate teardown/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/enter a product name or paste a url/i)).toBeInTheDocument()
    })
  })

  it('submits URL input by deriving product name', async () => {
    const user = userEvent.setup()
    render(<ProductInputForm onSubmit={mockOnSubmit} />)
    
    const queryInput = screen.getByLabelText(/^product$/i)
    const submitButton = screen.getByRole('button', { name: /generate teardown/i })
    
    await user.type(queryInput, 'https://example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: 'Example',
        productUrl: 'https://example.com',
        focusPreset: 'general',
        userGoals: undefined,
        aiProvider: 'openai'
      })
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    render(<ProductInputForm onSubmit={mockOnSubmit} />)
    
    const queryInput = screen.getByLabelText(/^product$/i)
    const optionsButton = screen.getByRole('button', { name: /options/i })
    const submitButton = screen.getByRole('button', { name: /generate teardown/i })
    
    await user.type(queryInput, 'Test Product')
    await user.click(optionsButton)

    const goalsInput = screen.getByLabelText(/^focus \(optional\)$/i)
    const presetSelect = screen.getByLabelText(/teardown focus/i)
    await user.selectOptions(presetSelect, 'pricing')
    await user.type(goalsInput, 'Test goals')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: 'Test Product',
        productUrl: undefined,
        focusPreset: 'pricing',
        userGoals: 'Test goals',
        aiProvider: 'openai' // default selection
      })
    })
  })

  it('shows error message when provided', () => {
    const errorMessage = 'Test error message'
    render(<ProductInputForm onSubmit={mockOnSubmit} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText(/unable to run teardown/i)).toBeInTheDocument()
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    let resolveSubmit
    const mockSlowSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve }))
    
    render(<ProductInputForm onSubmit={mockSlowSubmit} />)
    
    const queryInput = screen.getByLabelText(/^product$/i)
    const submitButton = screen.getByRole('button', { name: /generate teardown/i })
    
    await user.type(queryInput, 'Test Product')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/analyzing/i)).toBeInTheDocument()
      expect(queryInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
    
    // Resolve the promise to finish the test
    await act(async () => {
      resolveSubmit()
    })
  })
})
