// Request body validation middleware factory.
// Usage: validate({ title: { required: true, type: 'string', maxLength: 300 } })
// Supports: required, type (string|boolean|number|array|object), maxLength, enum,
//           arrayOf (validates each element type), format ('url').

function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body;

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip optional missing fields
      if (value === undefined || value === null) continue;

      // Type checks
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }
      if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`${field} must be a number`);
      }
      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`${field} must be an array`);
      }
      if (rules.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
        errors.push(`${field} must be an object`);
      }

      // Max length for strings
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }

      // Array element type validation
      if (rules.arrayOf && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== rules.arrayOf) {
            errors.push(`${field}[${i}] must be a ${rules.arrayOf}`);
            break;
          }
        }
      }

      // URL format validation
      if (rules.format === 'url' && typeof value === 'string' && value !== '') {
        try {
          new URL(value);
        } catch {
          errors.push(`${field} must be a valid URL`);
        }
      }
    }

    if (errors.length) return res.status(400).json({ errors });
    next();
  };
}

module.exports = { validate };
