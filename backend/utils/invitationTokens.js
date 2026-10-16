const crypto = require("crypto");

const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashInvitationToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

module.exports = {generateInvitationToken,hashInvitationToken};