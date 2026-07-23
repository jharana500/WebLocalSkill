const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters and include at least one letter and one number";

function isValidPassword(password) {
  if (typeof password !== "string" || password.length < 8) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

module.exports = { isValidPassword, PASSWORD_REQUIREMENTS };
