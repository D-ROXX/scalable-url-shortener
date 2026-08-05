const { BadRequestError } = require('../utils/errors');

// Higher-order middleware: validate(schema) returns an Express middleware.
// Keeps route files declarative instead of full of manual if-checks.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      throw new BadRequestError(message);
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
