const express = require('express');
const { registerUser, authenticate } = require('./authService');
const router = express.Router();

// [POST] 회원가입
router.post('/auth/signup', async (req, res) => {
  const { userId, password } = req.body; // AES 암호화된 값
  try {
    const { JoinResult } = await registerUser(userId, password);
    return res.json({ JoinResult });
  } catch (err) {
    switch (err.code) {
      case 'E611': return res.status(400).json({ message: err.message });
      case 'E409': return res.status(409).json({ message: err.message });
      case 'E632': // DB 저장 실패
      default:
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
  }
});

// [POST] 로그인
router.post('/auth/login', async (req, res) => {
  const { userId, password } = req.body; // AES 암호화된 값
  try {
    const { loginResult, accessToken } = await authenticate(userId, password);
    return res.json({ loginResult, accessToken });
  } catch (err) {
    switch (err.code) {
      case 'E611': return res.status(400).json({ message: err.message });
      case 'E401': return res.status(401).json({ message: err.message });
      case 'E610':
      default:
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
  }
});

module.exports = router;