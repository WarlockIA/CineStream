const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000/api';
const SECRET_KEY = '12345678901234567890123456789012';
const ALGORITHM = 'aes-256-cbc';

function encryptToken(payloadObj) {
  const payload = JSON.stringify(payloadObj);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

async function runTests() {
  console.log('🏁 Starting E2E Verification Tests for CineStream Pass (Abono Mensual de Cine Ilimitado)...');

  try {
    // 1. Register and Log in as client
    const clientEmail = `cliente_pass_${Date.now()}@cinestream.com`;
    console.log(`\n🔑 Registering fresh client: ${clientEmail}...`);
    const clientRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Cliente CineStream Pass Test',
        email: clientEmail,
        password: '123',
        role: 'client'
      })
    });
    const clientRegisterData = await clientRegisterRes.json();
    if (!clientRegisterRes.ok || !clientRegisterData.success) {
      console.error('Client registration failed:', clientRegisterData);
      throw new Error('Client registration failed');
    }
    console.log('✅ Client registered successfully.');

    console.log('🔑 Logging in as the registered client...');
    const clientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: '123' })
    });
    const clientLoginData = await clientLoginRes.json();
    if (!clientLoginRes.ok || !clientLoginData.success) {
      throw new Error('Client login failed');
    }
    const clientToken = clientLoginData.data.token;
    console.log('✅ Client logged in.');

    // 2. Register and Log in as admin
    const adminEmail = `admin_pass_${Date.now()}@cinestream.com`;
    console.log(`\n🔑 Registering fresh admin: ${adminEmail}...`);
    const adminRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Admin Pass Test',
        email: adminEmail,
        password: 'admin',
        role: 'admin'
      })
    });
    const adminRegisterData = await adminRegisterRes.json();
    if (!adminRegisterRes.ok || !adminRegisterData.success) {
      throw new Error('Admin registration failed');
    }
    console.log('✅ Admin registered successfully.');

    console.log('🔑 Logging in as the registered admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'admin' })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminLoginData.success) {
      throw new Error('Admin login failed');
    }
    const adminToken = adminLoginData.data.token;
    console.log('✅ Admin logged in.');

    // 3. Get existing movies and rooms
    console.log('\n🎬 Fetching movies...');
    const moviesRes = await fetch(`${BASE_URL}/movies`);
    const moviesData = await moviesRes.json();
    const movie = moviesData.data && moviesData.data[0];
    if (!movie) {
      throw new Error('Please add a movie in the system catalogue first.');
    }
    console.log(`✅ Using movie: "${movie.title}"`);

    console.log('🚪 Fetching rooms...');
    const roomsRes = await fetch(`${BASE_URL}/rooms`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.data && roomsData.data[0];
    if (!room) throw new Error('No rooms found.');
    console.log(`✅ Using room: "${room.name}"`);

    // 4. Create screening function with a retry loop to find a free time slot
    let screeningFunction = null;
    console.log('📅 Creating screening function...');
    for (let attempt = 1; attempt <= 15; attempt++) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3 + Math.floor(Math.random() * 50));
      const randomHour = 9 + Math.floor(Math.random() * 12);
      const randomMinute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
      tomorrow.setHours(randomHour, randomMinute, 0, 0);
      const tomorrowISO = tomorrow.toISOString().split('.')[0] + '-04:00';

      const createFuncRes = await fetch(`${BASE_URL}/functions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}` 
        },
        body: JSON.stringify({
          movieId: movie.id,
          roomId: room.id,
          startTime: tomorrowISO,
          price: '40.00'
        })
      });
      const createFuncData = await createFuncRes.json();
      if (createFuncData.success) {
        screeningFunction = createFuncData.data;
        break;
      }
      console.log(`   Attempt ${attempt} to create function at ${tomorrowISO} failed: ${createFuncData.message}`);
    }

    if (!screeningFunction) {
      throw new Error('Failed to create screening function after 15 attempts.');
    }
    console.log(`✅ Function created (ID: ${screeningFunction.id}, Price: 40.00 Bs.)`);

    // 5. Subscribe to CineStream Pass
    console.log('\n⚡ Subscribing to CineStream Pass...');
    const subscribeRes = await fetch(`${BASE_URL}/users/subscribe-premium`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}` 
      },
      body: JSON.stringify({ tier: 'CineStreamPass' })
    });
    const subscribeData = await subscribeRes.json();
    if (!subscribeRes.ok || !subscribeData.success) {
      throw new Error(`Failed to subscribe: ${subscribeData.message}`);
    }
    console.log(`✅ Subscribed successfully: "${subscribeData.message}"`);

    // 6. Verify User Profile fields
    console.log('🔍 Verifying user profile fields after subscription...');
    const profileRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileData = await profileRes.json();
    const profile = profileData.data.profile;
    console.log(`   isPremium: ${profile.isPremium}`);
    console.log(`   premiumTier: ${profile.premiumTier}`);
    console.log(`   premiumTicketsLeft: ${profile.premiumTicketsLeft}`);
    console.log(`   hasUsedPassToday: ${profile.hasUsedPassToday}`);
    
    if (!profile.isPremium || profile.premiumTier !== 'CineStreamPass' || profile.premiumTicketsLeft !== 4 || profile.hasUsedPassToday !== false) {
      throw new Error('Profile fields do not match expected CineStream Pass initials.');
    }
    console.log('✅ Success: Profile verification matches expectations.');

    // 7. Purchase only snacks to verify 30% discount
    // We buy 's3' (Refresco Mediano, price 15.00 Bs). With 30% discount, price is 10.50 Bs.
    console.log('\n🍿 Purchasing snacks to verify 30% CineStream Pass discount...');
    const snackPurchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        snacks: [{ id: 's3', name: 'Refresco Mediano', quantity: 1 }],
        totalPrice: '10.50', // Expecting 15.00 - 30% = 10.50 Bs.
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const snackPurchaseData = await snackPurchaseRes.json();
    console.log(`   Response status: [${snackPurchaseRes.status}]`);
    if (!snackPurchaseRes.ok || !snackPurchaseData.success) {
      throw new Error(`Snack purchase failed: ${snackPurchaseData.message}`);
    }
    console.log(`✅ Success: Snacks purchased at 30% discount! Total: ${snackPurchaseData.data.totalPrice} Bs.`);

    // 8. Purchase multiple tickets: check transaction limit (1 free, others paid)
    // We book C1 and C2 (2 seats). 1 should be free (0 Bs), 1 should be paid (40.00 Bs). Total = 40.00 Bs.
    console.log('\n🎟️ Booking 2 seats using CineStream Pass...');
    const ticketPurchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['C1', 'C2'],
        usePremiumTickets: true,
        totalPrice: '40.00', // 1 free (0) + 1 paid (40) = 40
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const ticketPurchaseData = await ticketPurchaseRes.json();
    console.log(`   Response status: [${ticketPurchaseRes.status}]`);
    if (!ticketPurchaseRes.ok || !ticketPurchaseData.success) {
      throw new Error(`Ticket checkout failed: ${ticketPurchaseData.message}`);
    }
    console.log(`✅ Success: 2 tickets purchased. Only 1 free! Total paid: ${ticketPurchaseData.data.totalPrice} Bs.`);

    // 9. Re-verify profile: premiumTicketsLeft should be 3, hasUsedPassToday should be true
    console.log('\n🔍 Verifying user profile limits after first pass checkout...');
    const profileRes2 = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileData2 = await profileRes2.json();
    const profile2 = profileData2.data.profile;
    console.log(`   premiumTicketsLeft: ${profile2.premiumTicketsLeft}`);
    console.log(`   hasUsedPassToday: ${profile2.hasUsedPassToday}`);
    
    if (profile2.premiumTicketsLeft !== 3 || profile2.hasUsedPassToday !== true) {
      throw new Error('Profile fields do not match expected status after pass checkout.');
    }
    console.log('✅ Success: Limits correctly updated in profile.');

    // 10. Attempt second ticket checkout today using pass: should block
    console.log('\n❌ Attempting to use pass again today (should be blocked)...');
    const duplicatePurchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['C3'],
        usePremiumTickets: true,
        totalPrice: '0.00',
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const duplicatePurchaseData = await duplicatePurchaseRes.json();
    console.log(`   Response status: [${duplicatePurchaseRes.status}] ${duplicatePurchaseData.message}`);
    if (duplicatePurchaseRes.status !== 400 || duplicatePurchaseData.success) {
      throw new Error('Expected 400 Bad Request when attempting to use pass twice in one day!');
    }
    console.log('✅ Success: Pass daily limit correctly blocked the purchase.');

    console.log('\n🎉 ALL CINESTREAM PASS E2E VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

runTests();
