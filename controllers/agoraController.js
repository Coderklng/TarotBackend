const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const getAgoraToken = (req, res) => {
  try {
    const channelName = req.params.orderId;
    
    if (!channelName) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return res.status(500).json({ success: false, message: 'Agora credentials missing in backend .env' });
    }

    const uid = Math.floor(Math.random() * 100000);
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
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

    return res.status(200).json({
      success: true,
      token,
      uid
    });
  } catch (error) {
    console.error('❌ Token generation error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAgoraToken };