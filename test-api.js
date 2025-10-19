// Quick test script to check API response
const API_URL = 'http://localhost:3000/api';

async function testSearchAPI() {
  try {
    // Get admin token from localStorage (you need to get this from browser)
    const token = process.argv[2];

    if (!token) {
      console.log('❌ Please provide admin token as argument');
      console.log('Usage: node test-api.js YOUR_TOKEN');
      return;
    }

    const response = await fetch(`${API_URL}/admin/users/search?page=1&pageSize=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('✅ API Response Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));

    if (data.success && data.data && data.data.users) {
      console.log('\n📊 First User Sample:');
      const firstUser = data.data.users[0];
      if (firstUser) {
        console.log('  - ID:', firstUser.id);
        console.log('  - Email:', firstUser.email);
        console.log('  - Username:', firstUser.username);
        console.log('  - ReferralCode:', firstUser.referralCode || '❌ MISSING');
        console.log('  - SponsorId:', firstUser.sponsorId || '❌ MISSING');
        console.log('  - Sponsor:', firstUser.sponsor || '❌ MISSING');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSearchAPI();
