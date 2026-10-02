const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT for the given user.
 * @param {Object} user  - Mongoose User document (or plain object with _id and role)
 * @returns {string}     - Signed JWT string
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role:   user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = generateToken;
