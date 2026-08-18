// src/lib/agora.js
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const generateAgoraToken = (channelName) => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new Error('AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in environment variables');
  }

  const uid = 0; // 0 for automatic user ID allocation by Agora
  const role = RtcRole.PUBLISHER;
  
  // Token validity (e.g., 2 hours)
  const expirationTimeInSeconds = 7200;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );

  return { token, uid, appId };
};

module.exports = { generateAgoraToken };