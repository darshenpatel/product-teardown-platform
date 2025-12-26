const envValidator = require('../utils/envValidator');

describe('Environment Validation Integration', () => {
  let mockExit;
  let mockConsoleError;
  let mockConsoleWarn;
  let mockConsoleLog;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    
    // Mock console methods and process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore all mocks
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleLog.mockRestore();
    
    // Restore environment
    process.env = originalEnv;
  });

  it('should integrate with app.js without throwing errors', () => {
    // Set NODE_ENV to test to prevent process.exit
    process.env.NODE_ENV = 'test';
    
    // This test verifies the app loads with the new validation system
    expect(() => {
      require('../app');
    }).not.toThrow();
  });

  it('should use the new environment validator', () => {
    // Test that the new validator is being used
    expect(envValidator.isValidApiKey).toBeDefined();
    expect(envValidator.validate).toBeDefined();
    expect(envValidator.handleResults).toBeDefined();
  });

  it('should validate API key formats correctly', () => {
    // Test the integrated validation logic
    expect(envValidator.isValidApiKey('your-openai-api-key-here')).toBe(false);
    expect(envValidator.isValidApiKey('sk-1234567890abcdef1234567890abcdef1234567890abcdef123')).toBe(true);
    expect(envValidator.isValidApiKey('valid-long-api-key')).toBe(true);
  });

  it('should validate environment comprehensively', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123',
      PORT: '3001',
      CORS_ORIGIN: 'http://localhost:5173'
    };

    const results = envValidator.validate();
    
    expect(results.isValid).toBe(true);
    expect(results.hasValidOpenAI).toBe(true);
    expect(results.errors).toHaveLength(0);
  });
});