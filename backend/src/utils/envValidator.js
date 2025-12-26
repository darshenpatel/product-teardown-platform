/**
 * Environment Variables Validator
 * Validates required environment variables on application startup
 */

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.requiredVars = new Set(['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']);
    this.optionalVars = new Set(['NODE_ENV', 'PORT', 'CORS_ORIGIN']);
  }

  /**
   * Validate if an API key is properly configured
   * @param {string} key - The API key to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidApiKey(key) {
    if (!key || typeof key !== 'string') return false;
    
    // Check for placeholder values
    const placeholders = [
      'your-openai-api-key-here',
      'your-anthropic-api-key-here',
      'your-api-key-here',
      'sk-placeholder',
      'example-key',
      'test-key'
    ];
    
    if (placeholders.includes(key.toLowerCase())) return false;
    
    // Check for obvious placeholder patterns
    if (key.toLowerCase().includes('placeholder') || 
        key.toLowerCase().includes('example') ||
        key.toLowerCase().startsWith('your-') ||
        key.toLowerCase().startsWith('replace-')) {
      return false;
    }
    
    // Basic length validation
    if (key.length < 10) return false;
    
    // OpenAI key format validation
    if (key.startsWith('sk-') && key.length < 51) return false;
    
    return true;
  }

  /**
   * Validate PORT environment variable
   * @param {string} port - The port value to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidPort(port) {
    if (!port) return true; // PORT is optional, defaults to 3001
    const portNum = parseFloat(port);
    return Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;
  }

  /**
   * Validate rate limiting environment variables
   * @param {string} value - The rate limit value to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidRateLimit(value) {
    if (!value) return true; // Optional with defaults
    const num = parseFloat(value);
    return Number.isInteger(num) && num > 0;
  }

  /**
   * Validate CORS_ORIGIN environment variable
   * @param {string} origin - The CORS origin to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidCorsOrigin(origin) {
    if (!origin) return true; // Optional with default
    return origin.startsWith('http://') || origin.startsWith('https://');
  }

  /**
   * Add an error to the validation results
   * @param {string} message - Error message
   */
  addError(message) {
    this.errors.push(`❌ ${message}`);
  }

  /**
   * Add a warning to the validation results
   * @param {string} message - Warning message
   */
  addWarning(message) {
    this.warnings.push(`⚠️  ${message}`);
  }

  /**
   * Validate all environment variables
   * @returns {Object} - Validation results
   */
  validate() {
    console.log('\n🔧 ENVIRONMENT VALIDATION');
    console.log('================================');
    
    // Reset validation state
    this.errors = [];
    this.warnings = [];

    // Validate API Keys
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    const hasValidOpenAI = this.isValidApiKey(openaiKey);
    const hasValidAnthropic = this.isValidApiKey(anthropicKey);

    // Critical validation: At least one API key must be valid
    if (!hasValidOpenAI && !hasValidAnthropic) {
      this.addError('CRITICAL: No valid AI provider API keys found');
      this.addError('Required: Set at least one of OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }

    // Individual API key validation
    if (!hasValidOpenAI) {
      if (openaiKey) {
        this.addWarning('OPENAI_API_KEY appears invalid or is a placeholder');
      } else {
        this.addWarning('OPENAI_API_KEY not configured');
      }
      this.addWarning('→ OpenAI functionality will be disabled');
    }

    if (!hasValidAnthropic) {
      if (anthropicKey) {
        this.addWarning('ANTHROPIC_API_KEY appears invalid or is a placeholder');
      } else {
        this.addWarning('ANTHROPIC_API_KEY not configured');
      }
      this.addWarning('→ Anthropic functionality will be disabled');
    }

    // Validate PORT
    if (!this.isValidPort(process.env.PORT)) {
      this.addError('PORT must be a valid number between 1-65535');
    }

    // Validate rate limiting configuration
    if (!this.isValidRateLimit(process.env.RATE_LIMIT_WINDOW_MS)) {
      this.addError('RATE_LIMIT_WINDOW_MS must be a positive integer (milliseconds)');
    }
    
    if (!this.isValidRateLimit(process.env.RATE_LIMIT_MAX_REQUESTS)) {
      this.addError('RATE_LIMIT_MAX_REQUESTS must be a positive integer');
    }
    
    if (!this.isValidRateLimit(process.env.ANALYSIS_RATE_LIMIT_WINDOW_MS)) {
      this.addError('ANALYSIS_RATE_LIMIT_WINDOW_MS must be a positive integer (milliseconds)');
    }
    
    if (!this.isValidRateLimit(process.env.ANALYSIS_RATE_LIMIT_MAX_REQUESTS)) {
      this.addError('ANALYSIS_RATE_LIMIT_MAX_REQUESTS must be a positive integer');
    }

    // Validate CORS_ORIGIN
    if (!this.isValidCorsOrigin(process.env.CORS_ORIGIN)) {
      this.addWarning('CORS_ORIGIN should start with http:// or https://');
    }

    // Optional environment variables
    if (!process.env.NODE_ENV) {
      this.addWarning('NODE_ENV not set (defaulting to "development")');
    }

    if (!process.env.CORS_ORIGIN) {
      this.addWarning('CORS_ORIGIN not set (defaulting to "http://localhost:5173, http://localhost:4173")');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      hasValidOpenAI,
      hasValidAnthropic
    };
  }

  /**
   * Display validation results and handle errors
   * @param {Object} results - Validation results from validate()
   */
  handleResults(results) {
    const { isValid, errors, warnings } = results;

    // Display warnings
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(warning => console.warn(`   ${warning}`));
    }

    // Display errors
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(error => console.error(`   ${error}`));
      
      console.log('\n💡 QUICK FIX GUIDE:');
      console.error('   1. Copy template: cp .env.example .env');
      console.error('   2. Get OpenAI key: https://platform.openai.com/api-keys');
      console.error('   3. Get Anthropic key: https://console.anthropic.com/');
      console.error('   4. Replace placeholder values in .env file');
      console.error('   5. Restart the server');
      
      console.log('\n🚫 SERVER STARTUP BLOCKED');
      console.log('================================\n');
      
      // Only exit in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
      
      return false;
    }

    // Success message
    if (warnings.length === 0) {
      console.log('\n✅ All environment variables valid');
    } else {
      console.log('\n✅ Environment validation passed (with warnings)');
    }
    
    console.log('================================\n');
    return true;
  }
}

module.exports = new EnvironmentValidator();