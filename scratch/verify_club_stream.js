const path = require('path');
require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../backend/.env') });

const { User, PointTransaction, Movie, Room, Function, sequelize } = require('../backend/src/models');
const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('🏁 Starting E2E Verification Tests for Club CineStream and Smart Snack Recommendations...');

  try {
    // 1. Register and Log in as client
    const clientEmail = `cliente_club_${Date.now()}@cinestream.com`;
    console.log(`\n🔑 Registering fresh client: ${clientEmail}...`);
    const clientRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Cliente Club E2E',
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
    const clientToken = clientLoginData.data.token;
    const clientUserId = clientLoginData.data.user.id;
    console.log(`✅ Client logged in. ID: ${clientUserId}`);

    // Verify initial profile loyalty level (should be Bronce, 0 points, not premium)
    console.log('\n👤 Verifying initial loyalty profile...');
    const profileRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileData = await profileRes.json();
    const profile = profileData.data.profile;
    console.log(`   isPremium: ${profile.isPremium}`);
    console.log(`   membershipLevel: ${profile.membershipLevel}`);
    console.log(`   points: ${profile.points}`);
    if (profile.isPremium || profile.points !== 0 || profile.membershipLevel !== 'Bronce') {
      throw new Error('Initial profile states are incorrect.');
    }
    console.log('✅ Initial profile verified successfully.');

    // 2. Subscribe to Premium Platinum
    console.log('\n💎 Subscribing to Premium Platinum (120 Bs/mo)...');
    const subscribeRes = await fetch(`${BASE_URL}/users/subscribe-premium`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ tier: 'Platinum' })
    });
    const subscribeData = await subscribeRes.json();
    if (!subscribeRes.ok || !subscribeData.success) {
      throw new Error(`Premium subscription failed: ${subscribeData.message}`);
    }
    console.log(`✅ ${subscribeData.message}`);
    console.log(`   premiumTier: ${subscribeData.data.profile.premiumTier}`);
    console.log(`   premiumTicketsLeft: ${subscribeData.data.profile.premiumTicketsLeft}`);

    // 3. Setup movie/function for purchase testing
    // Fetch a movie (e.g. VENOM or another movie)
    console.log('\n🎬 Fetching movies...');
    const moviesRes = await fetch(`${BASE_URL}/movies`);
    const moviesData = await moviesRes.json();
    const movie = moviesData.data && moviesData.data[0];
    if (!movie) throw new Error('Please add a movie in the system first.');
    console.log(`✅ Using movie: "${movie.title}" (ID: ${movie.id})`);

    // Fetch a room
    console.log('🚪 Fetching rooms...');
    const dbRoom = await Room.findOne();
    if (!dbRoom) throw new Error('No rooms found in database.');
    console.log(`✅ Using room: "${dbRoom.name}" (ID: ${dbRoom.id})`);

    // Create function scheduled for a future day
    const functionTime = new Date();
    functionTime.setDate(functionTime.getDate() + 3);
    const functionTimeISO = functionTime.toISOString().split('.')[0] + '-04:00';

    // Register a function using Sequelize for simplicity (calculating endTime manually)
    const start = new Date(functionTimeISO);
    const end = new Date(start.getTime() + (movie.duration + 15) * 60000);
    const screeningFunction = await Function.create({
      movieId: movie.id,
      roomId: dbRoom.id,
      startTime: start,
      endTime: end,
      price: '40.00'
    });
    console.log(`✅ Screening function created via Sequelize! ID: ${screeningFunction.id} at ${screeningFunction.startTime}`);

    // 4. Test Checkout: Premium ticket booking + Premium snack discount
    // We will book 1 seat ('F1') and add a Coke ('s3', price 15 Bs)
    // Using Premium Tickets: Ticket price goes from 40 Bs -> 0 Bs.
    // Confitería discount: Platinum members get 25% discount on snack.
    // finalPriceToPay = 0 + 15 * 0.75 = 11.25 Bs.
    console.log('\n🎟️ Testing Premium ticket purchase and Platinum snack discount...');
    const checkoutRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['F1'],
        snacks: [{ id: 's3', name: 'Refresco Mediano', quantity: 1, price: 15.00 }],
        totalPrice: '55.00', // original base total: 40 ticket + 15 snack
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify',
        usePremiumTickets: true
      })
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok || !checkoutData.success) {
      console.error(checkoutData);
      throw new Error(`Checkout failed: ${checkoutData.message}`);
    }
    console.log(`✅ Ticket purchased successfully.`);
    console.log(`   Transaction ID: ${checkoutData.data.transactionId}`);
    
    // Fetch profile and check premium tickets left and points
    const profileAfterRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileAfterData = await profileAfterRes.json();
    const profileAfter = profileAfterData.data.profile;
    console.log(`   premiumTicketsLeft (expected 4): ${profileAfter.premiumTicketsLeft}`);
    if (profileAfter.premiumTicketsLeft !== 4) {
      throw new Error('Premium tickets left count was not decremented correctly.');
    }
    // Verify accumulated points for the 11.25 Bs paid (points = Math.floor(11.25 / 10) = 1 point)
    console.log(`   accumulated points (expected 1): ${profileAfter.points}`);
    if (profileAfter.points !== 1) {
      throw new Error('Points accumulated for premium checkout is incorrect.');
    }
    console.log('✅ Premium checkout calculations and ticket deduction verified.');

    // 5. Test loyalty points accumulation and level up (Bronce -> Plata -> Oro)
    // Let's manually award 600 points using Sequelize to check Plata level
    console.log('\n⭐ Manually awarding points to test levels...');
    await PointTransaction.create({
      userId: clientUserId,
      points: 600,
      type: 'earned',
      description: 'Premio Especial de Prueba',
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      isSpent: false
    });

    // Refresh profile to trigger points sync
    const profilePlataRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profilePlata = (await profilePlataRes.json()).data.profile;
    console.log(`   points (expected 601): ${profilePlata.points}`);
    console.log(`   membershipLevel (expected Plata): ${profilePlata.membershipLevel}`);
    if (profilePlata.membershipLevel !== 'Plata') {
      throw new Error('Loyalty level did not update to Plata.');
    }

    // Let's manually award another 500 points to test Oro level (>1000)
    await PointTransaction.create({
      userId: clientUserId,
      points: 500,
      type: 'earned',
      description: 'Premio Especial de Prueba 2',
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      isSpent: false
    });

    const profileOroRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileOro = (await profileOroRes.json()).data.profile;
    console.log(`   points (expected 1101): ${profileOro.points}`);
    console.log(`   membershipLevel (expected Oro): ${profileOro.membershipLevel}`);
    if (profileOro.membershipLevel !== 'Oro') {
      throw new Error('Loyalty level did not update to Oro.');
    }
    console.log('✅ Dynamic loyalty levels (Plata and Oro) verified successfully.');

    // 6. Test point redemptions (FIFO check)
    // We will redeem:
    // - 1 Ticket: 100 points
    // - 1 Snack (s3): 30 points
    // Total points to deduct: 130 points.
    // Since points are deducted FIFO, let's verify that points decrease properly.
    console.log('\n🛒 Testing ticket and snack redemptions with points...');
    const redeemRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['F2'], // 1 ticket
        snacks: [{ id: 's3', name: 'Refresco Mediano', quantity: 1, price: 15.00 }],
        totalPrice: '55.00',
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify',
        usePointsForTickets: true,
        redeemSnacks: ['s3']
      })
    });
    const redeemData = await redeemRes.json();
    if (!redeemRes.ok || !redeemData.success) {
      console.error(redeemData);
      throw new Error(`Redemption checkout failed: ${redeemData.message}`);
    }
    console.log('   Redemption checkout completed successfully.');
    
    // Check points balance (should be 1101 - 130 = 971 points)
    const profileRedeemedRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileRedeemed = (await profileRedeemedRes.json()).data.profile;
    console.log(`   Points after redemption (expected 971): ${profileRedeemed.points}`);
    if (profileRedeemed.points !== 971) {
      throw new Error('Points balance is incorrect after redemption.');
    }
    console.log('✅ Points redemptions verified.');

    // 7. Expiration Engine (FIFO expiration check)
    // Let's manually insert an expired PointTransaction record (expiresAt in the past, isSpent = false)
    console.log('\n⏳ Testing point expiration engine...');
    await PointTransaction.create({
      userId: clientUserId,
      points: 150,
      type: 'earned',
      description: 'Puntos viejos expirados',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      isSpent: false
    });

    // Let's trigger a sync. The points before sync would be 971 + 150 = 1121, 
    // but since 150 has expired, it should deduct them and keep the active points at 971!
    // And it should create a mirror record of type 'expired' with points = -150.
    const profileExpiredRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileExpired = (await profileExpiredRes.json()).data.profile;
    console.log(`   Points after expiration sync (expected 971): ${profileExpired.points}`);
    if (profileExpired.points !== 971) {
      throw new Error('Sync engine failed to filter out expired points.');
    }

    // Verify history lists the expired points record
    console.log('📊 Verifying points history for expired transaction...');
    const historyRes = await fetch(`${BASE_URL}/users/points-history`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const historyData = await historyRes.json();
    const history = historyData.data || [];
    const expiredTx = history.find(tx => tx.type === 'expired');
    if (!expiredTx) {
      throw new Error('Sync engine did not register mirror negative transaction for expired points.');
    }
    console.log(`   Found expired mirror record: ${expiredTx.description} (${expiredTx.points} pts)`);
    console.log('✅ Point expiration mirror logging and sync verified.');

    console.log('\n🎉 ALL CLUB CINESTREAM E2E TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
