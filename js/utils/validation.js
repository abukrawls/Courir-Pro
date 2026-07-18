/* ===== Validation Helpers ===== */
function isRequired(v) { return v !== undefined && v !== null && String(v).trim().length > 0; }
function isPhone(v) { return /^(\+?62|0)8\d{7,12}$/.test(String(v).replace(/[\s-]/g, '')); }
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function minLength(v, n) { return String(v || '').length >= n; }

function validateForm(fields) {
  // fields: [{ value, rules: [{test, message}] }]
  const errors = [];
  fields.forEach(({ name, value, rules }) => {
    for (const rule of rules) {
      if (!rule.test(value)) { errors.push({ name, message: rule.message }); break; }
    }
  });
  return errors;
}
