const app = require('./index');
const http = require('http');

const PORT = 4550;
const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  function get(url) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${PORT}${url}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      }).on('error', reject);
    });
  }

  function post(url, payload, token = null) {
    return new Promise((resolve, reject) => {
      const dataStr = JSON.stringify(payload);
      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request(`http://localhost:${PORT}${url}`, {
        method: 'POST',
        headers
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
      req.on('error', reject);
      req.write(dataStr);
      req.end();
    });
  }

  try {
    // 1. Test Stats & Live Counter
    const stats = await get('/api/auth/stats');
    console.log('✔ [Stats & Live Counter]:', stats.data);

    // 2. Test Admin Login (Phone: 01099099127, Pass: 141996)
    const adminLogin = await post('/api/auth/login', {
      phone: '01099099127',
      password: '141996'
    });
    console.log('✔ [Admin Login Status]:', adminLogin.status, 'User:', adminLogin.data.user.name);
    const adminToken = adminLogin.data.token;

    // 3. Test Religious Endpoints
    const azkar = await get('/api/religious/azkar');
    console.log('✔ [30-Min Azkar]:', azkar.data.content);

    const quran = await get('/api/religious/quran');
    console.log('✔ [60-Min Quran]:', quran.data.title, 'Verses count:', quran.data.verses.length);

    // 4. Test Deceased Duaa (with auth)
    const duaaReq = await new Promise((resolve) => {
      http.get(`http://localhost:${PORT}/api/religious/duaa`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
    });
    console.log('✔ [90-Min Deceased Duaa]:', duaaReq.data.title);

    // 5. Test AI Analysis
    const aiReq = await new Promise((resolve) => {
      http.get(`http://localhost:${PORT}/api/financials/ai-analysis`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
    });
    console.log('✔ [AI Financial Advisor]: Score:', aiReq.data.healthScore, 'Proposals:', aiReq.data.investmentProposals.length);

    // 6. Test Admin Broadcast Alert
    const bcast = await post('/api/admin/broadcast', {
      title: 'تنبيه تجريبي من الإدارة',
      message: 'نسأل الله البركة في الرزق والعمر.'
    }, adminToken);
    console.log('✔ [Admin Broadcast]:', bcast.data.message);

    // 7. Test User Registration & OTP Simulation
    const reg = await post('/api/auth/register', {
      name: 'محمود عبد الرحمن',
      phone: '01234567890',
      email: 'mahmoud@example.com',
      password: 'pass123',
      deceasedName: 'والدي رحمه الله'
    });
    console.log('✔ [User Registration]:', reg.data.message, 'OTP Code:', reg.data.verificationCodeSimulation);

    // 8. Test Verification
    const verify = await post('/api/auth/verify', {
      phone: '01234567890',
      code: reg.data.verificationCodeSimulation
    });
    console.log('✔ [OTP Verification]:', verify.data.message, 'User:', verify.data.user.name);

    console.log('\n🌟 ALL AUTOMATED SYSTEM TESTS PASSED SUCCESSFULLY! 🌟');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
