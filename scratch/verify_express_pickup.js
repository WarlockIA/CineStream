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
  console.log('🏁 Starting E2E Verification Tests for Express Candybar Pickup (QR Independiente)...');

  try {
    // 1. Register and Log in as client
    const clientEmail = `cliente_pickup_${Date.now()}@cinestream.com`;
    console.log(`\n🔑 Registering fresh client: ${clientEmail}...`);
    const clientRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Cliente Candybar Test',
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
    const adminEmail = `admin_pickup_${Date.now()}@cinestream.com`;
    console.log(`\n🔑 Registering fresh admin: ${adminEmail}...`);
    const adminRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Admin Pickup Test',
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

    // 3. Get existing movies
    console.log('\n🎬 Fetching movies...');
    const moviesRes = await fetch(`${BASE_URL}/movies`);
    const moviesData = await moviesRes.json();
    const movie = moviesData.data && moviesData.data[0];
    if (!movie) {
      throw new Error('Please add a movie in the system catalogue first.');
    }
    console.log(`✅ Using movie: "${movie.title}"`);

    // 4. Fetch available rooms
    console.log('🚪 Fetching rooms...');
    const roomsRes = await fetch(`${BASE_URL}/rooms`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.data && roomsData.data[0];
    if (!room) throw new Error('No rooms found.');
    console.log(`✅ Using room: "${room.name}"`);

    // 5. Create screening function (using randomized future offset to avoid conflict)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2 + Math.floor(Math.random() * 25));
    const randomHour = 9 + Math.floor(Math.random() * 12);
    tomorrow.setHours(randomHour, 0, 0, 0);
    const tomorrowISO = tomorrow.toISOString().split('.')[0] + '-04:00';
    
    console.log('📅 Creating screening function...');
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
    if (!createFuncData.success) {
      throw new Error(`Failed to create function: ${createFuncData.message}`);
    }
    const screeningFunction = createFuncData.data;
    console.log(`✅ Function created (ID: ${screeningFunction.id})`);

    // 6. Buy a ticket (Seats + Snacks)
    console.log('\n🎟️ Purchasing ticket containing seats and snacks...');
    const purchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['D1', 'D2'],
        snacks: [{ id: 's2', name: 'Popcorn Grande', quantity: 2 }],
        totalPrice: '180.00', // 40*2 = 80 + 50*2 = 180 Bs.
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const purchaseData = await purchaseRes.json();
    if (!purchaseData.success) {
      console.error(purchaseData);
      throw new Error(`Checkout failed: ${purchaseData.message}`);
    }
    const ticket = purchaseData.data;
    console.log(`✅ Purchase completed! transactionId: ${ticket.transactionId}`);
    
    // Assert both QRs are returned
    console.log('🔍 Validating returned QR Base64 fields in response...');
    if (!ticket.qrBase64) {
      throw new Error('Response is missing qrBase64 for entry ticket!');
    }
    if (!ticket.snacksQrBase64) {
      throw new Error('Response is missing snacksQrBase64 for snacks!');
    }
    console.log('✅ Success: Both QRs returned successfully in payload.');

    // 7. Replicate scan codes
    const ticketId = ticket.ticketId;
    const transactionId = ticket.transactionId;
    const functionId = screeningFunction.id;

    console.log('\n🔐 Encrypting verification tokens...');
    const entryToken = encryptToken({
      ticketId,
      functionId,
      seatNumbers: ['D1', 'D2'],
      type: 'entry',
      hash: crypto.createHash('sha256').update(ticketId + transactionId).digest('hex')
    });

    const snacksToken = encryptToken({
      ticketId,
      type: 'snacks',
      hash: crypto.createHash('sha256').update(ticketId + transactionId).digest('hex')
    });

    const legacyToken = encryptToken({
      ticketId,
      functionId,
      seatNumbers: ['D1', 'D2'],
      hash: crypto.createHash('sha256').update(ticketId + transactionId).digest('hex')
    });

    // 8. Test validation cross-rejection rules
    console.log('\n🧪 Testing cross-validation rejection rules...');
    
    // Case A: Send snacksToken to entry scan endpoint
    console.log('👉 Scanning Snacks QR at Entrance Access...');
    const scanEntryWithSnacksRes = await fetch(`${BASE_URL}/bookings/scan-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ token: snacksToken })
    });
    const scanEntryWithSnacksData = await scanEntryWithSnacksRes.json();
    console.log(`   Response: [${scanEntryWithSnacksRes.status}] ${scanEntryWithSnacksData.message}`);
    if (scanEntryWithSnacksRes.status !== 400 || scanEntryWithSnacksData.success) {
      throw new Error('Expected 400 Bad Request when entry scanner scans snacks QR!');
    }
    console.log('✅ Success: Entry scanner successfully rejected Snacks QR.');

    // Case B: Send entryToken to snacks scan endpoint
    console.log('👉 Scanning Entry QR at Candybar Pickup...');
    const scanSnacksWithEntryRes = await fetch(`${BASE_URL}/bookings/scan-snacks-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ token: entryToken })
    });
    const scanSnacksWithEntryData = await scanSnacksWithEntryRes.json();
    console.log(`   Response: [${scanSnacksWithEntryRes.status}] ${scanSnacksWithEntryData.message}`);
    if (scanSnacksWithEntryRes.status !== 400 || scanSnacksWithEntryData.success) {
      throw new Error('Expected 400 Bad Request when snacks scanner scans entry QR!');
    }
    console.log('✅ Success: Candybar scanner successfully rejected Entry QR.');

    // 9. Test normal scan for snacks
    console.log('\n🍿 Testing normal Candybar QR scan...');
    const normalSnacksScanRes = await fetch(`${BASE_URL}/bookings/scan-snacks-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ token: snacksToken })
    });
    const normalSnacksScanData = await normalSnacksScanRes.json();
    console.log(`   Response: [${normalSnacksScanRes.status}] ${normalSnacksScanData.message}`);
    if (!normalSnacksScanRes.ok || !normalSnacksScanData.success) {
      throw new Error(`Candybar validation failed: ${normalSnacksScanData.message}`);
    }
    console.log('✅ Success: Candybar QR validated and items marked as delivered.');

    // 10. Test duplicate scan protection
    console.log('\n🔄 Testing duplicate scan protection on Candybar QR...');
    const duplicateSnacksScanRes = await fetch(`${BASE_URL}/bookings/scan-snacks-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ token: snacksToken })
    });
    const duplicateSnacksScanData = await duplicateSnacksScanRes.json();
    console.log(`   Response: [${duplicateSnacksScanRes.status}] ${duplicateSnacksScanData.message}`);
    if (duplicateSnacksScanRes.status !== 409 || duplicateSnacksScanData.success) {
      throw new Error('Expected 409 Conflict for duplicate snacks pickup scan!');
    }
    console.log('✅ Success: Duplicate pickup scan correctly blocked.');

    // 11. Test cancellation protection when snacks delivered
    console.log('\n❌ Testing cancellation block when snacks are already delivered...');
    const cancelRes = await fetch(`${BASE_URL}/bookings/${ticketId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const cancelData = await cancelRes.json();
    console.log(`   Response: [${cancelRes.status}] ${cancelData.message}`);
    if (cancelRes.status !== 400 || cancelData.success) {
      throw new Error('Expected cancellation to be blocked since snacks have already been picked up!');
    }
    console.log('✅ Success: Refund/cancellation correctly blocked.');

    // 12. Test legacy QR support (should fallback to entry)
    console.log('\n🎟️ Testing legacy QR ticket support...');
    const scanLegacyRes = await fetch(`${BASE_URL}/bookings/scan-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ token: legacyToken })
    });
    const scanLegacyData = await scanLegacyRes.json();
    console.log(`   Response: [${scanLegacyRes.status}] ${scanLegacyData.message}`);
    if (!scanLegacyRes.ok || !scanLegacyData.success) {
      throw new Error(`Legacy entry QR scan failed: ${scanLegacyData.message}`);
    }
    console.log('✅ Success: Legacy token (undefined type) validated as entrance access ticket.');

    // 13. Test online purchase of only snacks (isSnackOnly)
    console.log('\n🍿 Testing online purchase of only snacks (isSnackOnly)...');
    const snackOnlyPurchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        snacks: [{ id: 's3', name: 'Refresco Mediano', quantity: 1 }],
        totalPrice: '15.00',
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const snackOnlyPurchaseData = await snackOnlyPurchaseRes.json();
    if (!snackOnlyPurchaseRes.ok || !snackOnlyPurchaseData.success) {
      throw new Error(`Snack-only checkout failed: ${snackOnlyPurchaseData.message}`);
    }
    const snackOnlyTicket = snackOnlyPurchaseData.data;
    console.log(`✅ Snack-only purchase completed! ID: ${snackOnlyTicket.ticketId}`);
    
    // Assert entry QR is null and snacks QR is present
    if (snackOnlyTicket.qrBase64) {
      throw new Error('Expected qrBase64 to be null for snack-only purchase!');
    }
    if (!snackOnlyTicket.snacksQrBase64) {
      throw new Error('Expected snacksQrBase64 to be generated for snack-only purchase!');
    }
    console.log('✅ Success: Only snacks QR generated, entry QR is null.');

    // 14. Test scan and pickup of snack-only purchase
    console.log('\n🍿 Scanning snack-only QR at Candybar...');
    const snackOnlyToken = encryptToken({
      ticketId: snackOnlyTicket.ticketId,
      type: 'snacks',
      hash: crypto.createHash('sha256').update(snackOnlyTicket.ticketId + snackOnlyTicket.transactionId).digest('hex')
    });
    const scanSnackOnlyRes = await fetch(`${BASE_URL}/bookings/scan-snacks-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ token: snackOnlyToken })
    });
    const scanSnackOnlyData = await scanSnackOnlyRes.json();
    console.log(`   Response: [${scanSnackOnlyRes.status}] ${scanSnackOnlyData.message}`);
    if (!scanSnackOnlyRes.ok || !scanSnackOnlyData.success) {
      throw new Error(`Snack-only scan failed: ${scanSnackOnlyData.message}`);
    }
    console.log('✅ Success: Snack-only QR scanned and items delivered.');

    // 15. Test cancellation of snack-only purchase before delivery (Flexible Refund)
    console.log('\n🍿 Purchasing second snack-only ticket to test cancellation/refund...');
    const snackOnlyPurchase2Res = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        snacks: [{ id: 's2', name: 'Popcorn Mediano', quantity: 1 }],
        totalPrice: '35.00',
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const snackOnlyPurchase2Data = await snackOnlyPurchase2Res.json();
    if (!snackOnlyPurchase2Res.ok || !snackOnlyPurchase2Data.success) {
      throw new Error(`Snack-only checkout 2 failed: ${snackOnlyPurchase2Data.message}`);
    }
    const snackOnlyTicket2 = snackOnlyPurchase2Data.data;
    console.log(`✅ Snack-only purchase 2 completed! ID: ${snackOnlyTicket2.ticketId}`);

    console.log('❌ Cancelling snack-only ticket 2 to request refund coupon...');
    const cancelSnackOnlyRes = await fetch(`${BASE_URL}/bookings/${snackOnlyTicket2.ticketId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const cancelSnackOnlyData = await cancelSnackOnlyRes.json();
    console.log(`   Response: [${cancelSnackOnlyRes.status}] ${cancelSnackOnlyData.message}`);
    if (!cancelSnackOnlyRes.ok || !cancelSnackOnlyData.success) {
      throw new Error(`Failed to cancel snack-only ticket 2: ${cancelSnackOnlyData.message}`);
    }
    const refundCouponCode = cancelSnackOnlyData.data.couponCode;
    console.log(`✅ Success: Snack-only purchase cancelled and refund coupon generated: ${refundCouponCode}`);

    // 16. Test applying the refund coupon on a new snack-only purchase (Coupon Price Bypass)
    console.log(`\n🏷️ Purchasing third snack-only ticket using refund coupon: ${refundCouponCode}...`);
    const couponSnackPurchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        snacks: [{ id: 's3', name: 'Refresco Mediano', quantity: 1 }],
        totalPrice: '15.00',
        paymentMethod: 'coupon',
        couponCode: refundCouponCode,
        paymentToken: 'tok_verify',
        cardNumber: '4000123456789010'
      })
    });
    const couponSnackPurchaseData = await couponSnackPurchaseRes.json();
    console.log(`   Response: [${couponSnackPurchaseRes.status}] ${couponSnackPurchaseData.message}`);
    if (!couponSnackPurchaseRes.ok || !couponSnackPurchaseData.success) {
      throw new Error(`Failed to purchase snack-only ticket using coupon: ${couponSnackPurchaseData.message}`);
    }
    console.log('✅ Success: Snack-only purchase completed using coupon successfully (Bypass card payment).');

    console.log('\n🎉 ALL EXPRESS PICKUP E2E VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

runTests();
