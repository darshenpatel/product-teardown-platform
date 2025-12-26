const envValidator = require('../envValidator');

describe('Environment Validator', () => {
  let originalEnv;
  let mockConsoleLog;
  let mockConsoleWarn;
  let mockConsoleError;
  let mockProcessExit;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();
    
    // Reset validator state
    envValidator.errors = [];
    envValidator.warnings = [];
  });

  afterEach(() => {
    // Restore mocks
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
    
    // Restore environment
    process.env = originalEnv;
  });

  describe('isValidApiKey', () => {
    it('should reject null/undefined keys', () => {
      expect(envValidator.isValidApiKey(null)).toBe(false);
      expect(envValidator.isValidApiKey(undefined)).toBe(false);
      expect(envValidator.isValidApiKey('')).toBe(false);
    });

    it('should reject placeholder values', () => {
      expect(envValidator.isValidApiKey('your-openai-api-key-here')).toBe(false);
      expect(envValidator.isValidApiKey('your-anthropic-api-key-here')).toBe(false);
      expect(envValidator.isValidApiKey('your-api-key-here')).toBe(false);
      expect(envValidator.isValidApiKey('sk-placeholder')).toBe(false);
      expect(envValidator.isValidApiKey('example-key')).toBe(false);
      expect(envValidator.isValidApiKey('test-key')).toBe(false);
    });

    it('should reject keys with placeholder patterns', () => {
      expect(envValidator.isValidApiKey('placeholder-key-123')).toBe(false);
      expect(envValidator.isValidApiKey('example-api-key')).toBe(false);
      expect(envValidator.isValidApiKey('your-custom-key')).toBe(false);
      expect(envValidator.isValidApiKey('replace-me')).toBe(false);
    });

    it('should reject keys that are too short', () => {
      expect(envValidator.isValidApiKey('short')).toBe(false);
      expect(envValidator.isValidApiKey('sk-123')).toBe(false);
    });

    it('should reject invalid OpenAI key format', () => {
      expect(envValidator.isValidApiKey('sk-short')).toBe(false);
      expect(envValidator.isValidApiKey('sk-1234567890')).toBe(false);
    });

    it('should accept valid API keys', () => {
      expect(envValidator.isValidApiKey('sk-1234567890abcdef1234567890abcdef1234567890abcdef123')).toBe(true);
      expect(envValidator.isValidApiKey('valid-long-api-key-here')).toBe(true);
      expect(envValidator.isValidApiKey('anthropic-key-1234567890abcdef')).toBe(true);
    });
  });

  describe('isValidPort', () => {
    it('should accept valid ports', () => {
      expect(envValidator.isValidPort('3000')).toBe(true);
      expect(envValidator.isValidPort('8080')).toBe(true);
      expect(envValidator.isValidPort('65535')).toBe(true);
      expect(envValidator.isValidPort('1')).toBe(true);
    });

    it('should accept empty port (optional)', () => {
      expect(envValidator.isValidPort('')).toBe(true);
      expect(envValidator.isValidPort(null)).toBe(true);
      expect(envValidator.isValidPort(undefined)).toBe(true);
    });

    it('should reject invalid ports', () => {
      expect(envValidator.isValidPort('0')).toBe(false);
      expect(envValidator.isValidPort('65536')).toBe(false);
      expect(envValidator.isValidPort('-1')).toBe(false);
      expect(envValidator.isValidPort('abc')).toBe(false);
      expect(envValidator.isValidPort('3000.5')).toBe(false);
    });
  });

  describe('isValidCorsOrigin', () => {
    it('should accept valid CORS origins', () => {
      expect(envValidator.isValidCorsOrigin('http://localhost:3000')).toBe(true);
      expect(envValidator.isValidCorsOrigin('https://example.com')).toBe(true);
      expect(envValidator.isValidCorsOrigin('http://192.168.1.1:8080')).toBe(true);
    });

    it('should accept empty CORS origin (optional)', () => {
      expect(envValidator.isValidCorsOrigin('')).toBe(true);
      expect(envValidator.isValidCorsOrigin(null)).toBe(true);
      expect(envValidator.isValidCorsOrigin(undefined)).toBe(true);
    });

    it('should reject invalid CORS origins', () => {
      expect(envValidator.isValidCorsOrigin('localhost:3000')).toBe(false);
      expect(envValidator.isValidCorsOrigin('ftp://example.com')).toBe(false);
      expect(envValidator.isValidCorsOrigin('just-a-domain.com')).toBe(false);
    });
  });

  describe('isValidRateLimit', () => {
    it('should accept valid rate limit values', () => {
      expect(envValidator.isValidRateLimit('100')).toBe(true);
      expect(envValidator.isValidRateLimit('900000')).toBe(true);
      expect(envValidator.isValidRateLimit('1')).toBe(true);
    });

    it('should accept empty rate limit values (optional)', () => {
      expect(envValidator.isValidRateLimit('')).toBe(true);
      expect(envValidator.isValidRateLimit(null)).toBe(true);
      expect(envValidator.isValidRateLimit(undefined)).toBe(true);
    });

    it('should reject invalid rate limit values', () => {
      expect(envValidator.isValidRateLimit('0')).toBe(false);
      expect(envValidator.isValidRateLimit('-1')).toBe(false);
      expect(envValidator.isValidRateLimit('abc')).toBe(false);
      expect(envValidator.isValidRateLimit('100.5')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass validation with valid API keys', () => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123',
        NODE_ENV: 'test'
      };

      const results = envValidator.validate();

      expect(results.isValid).toBe(true);
      expect(results.errors).toHaveLength(0);
      expect(results.hasValidOpenAI).toBe(true);
    });

    it('should fail validation with no valid API keys', () => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'your-openai-api-key-here',
        ANTHROPIC_API_KEY: 'your-anthropic-api-key-here',
        NODE_ENV: 'test'
      };

      const results = envValidator.validate();

      expect(results.isValid).toBe(false);
      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.hasValidOpenAI).toBe(false);
      expect(results.hasValidAnthropic).toBe(false);
    });

    it('should generate warnings for missing optional vars', () => {
      process.env = {
        OPENAI_API_KEY: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123',
        NODE_ENV: 'test'
      };

      const results = envValidator.validate();

      expect(results.isValid).toBe(true);
      expect(results.warnings.length).toBeGreaterThan(0);
      expect(results.warnings.some(w => w.includes('CORS_ORIGIN'))).toBe(true);
    });

    it('should validate PORT correctly', () => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123',
        PORT: 'invalid-port',
        NODE_ENV: 'test'
      };

      const results = envValidator.validate();

      expect(results.isValid).toBe(false);
      expect(results.errors.some(e => e.includes('PORT'))).toBe(true);
    });
  });

  describe('handleResults', () => {
    it('should not exit in test environment', () => {
      process.env.NODE_ENV = 'test';
      
      const results = {
        isValid: false,
        errors: ['❌ Test error'],
        warnings: []
      };

      envValidator.handleResults(results);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('should display success message with no warnings', () => {
      const results = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const success = envValidator.handleResults(results);

      expect(success).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith('\n✅ All environment variables valid');
    });

    it('should display warnings and errors appropriately', () => {
      const results = {
        isValid: false,
        errors: ['❌ Test error'],
        warnings: ['⚠️ Test warning']
      };

      envValidator.handleResults(results);

      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });
});