const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('🏁 Starting E2E Verification Tests for self-service cancellations and refunds...');

  try {
    // 1. Register and Log in as client
    const clientEmail = `cliente_test_${Date.now()}@cinestream.com`;
    console.log(`\n🔑 Registering fresh client: ${clientEmail}...`);
    const clientRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Cliente Test E2E',
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
      console.error('Client login failed status:', clientLoginRes.status);
      console.error('Client login response:', clientLoginData);
      throw new Error('Client login failed');
    }
    const clientToken = clientLoginData.data.token;
    console.log('✅ Client logged in. Token acquired.');

    // 2. Register and Log in as admin
    const adminEmail = `admin_test_${Date.now()}@cinestream.com`;
    console.log(`\n🔑 Registering fresh admin: ${adminEmail}...`);
    const adminRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Admin Test E2E',
        email: adminEmail,
        password: 'admin',
        role: 'admin'
      })
    });
    const adminRegisterData = await adminRegisterRes.json();
    if (!adminRegisterRes.ok || !adminRegisterData.success) {
      console.error('Admin registration failed:', adminRegisterData);
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
      console.error('Admin login failed status:', adminLoginRes.status);
      console.error('Admin login response:', adminLoginData);
      throw new Error('Admin login failed');
    }
    const adminToken = adminLoginData.data.token;
    console.log('✅ Admin logged in. Token acquired.');

    // 3. Get existing movies
    console.log('\n🎬 Fetching movies...');
    const moviesRes = await fetch(`${BASE_URL}/movies`);
    const moviesData = await moviesRes.json();
    let movie = moviesData.data && moviesData.data[0];
    
    if (!movie) {
      console.log('ℹ️ No movies found. Registering a default movie as admin...');
      // Note: We need a poster file or mock multipart request if creating movie, 
      // but let's check if we can seed one or see if any exist.
      // Usually there is a default database with movies or we can try creating one.
      // Let's check.
      throw new Error('Please add a movie in the system catalogue first.');
    }
    console.log(`✅ Using movie: "${movie.title}" (ID: ${movie.id})`);

    // 4. Fetch available rooms
    console.log('\n🚪 Fetching rooms...');
    const roomsRes = await fetch(`${BASE_URL}/rooms`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.data && roomsData.data[0];
    if (!room) throw new Error('No rooms found. Seed database first.');
    console.log(`✅ Using room: "${room.name}" (ID: ${room.id})`);

    // 5. Create a function scheduled for a random future day/hour (definitely > 2 hours)
    const tomorrow = new Date();
    // Move to a random day within next 30 days
    tomorrow.setDate(tomorrow.getDate() + 2 + Math.floor(Math.random() * 25));
    // Set a random hour between 9:00 and 21:00
    const randomHour = 9 + Math.floor(Math.random() * 12);
    tomorrow.setHours(randomHour, 0, 0, 0);
    // Format to ISO string with Bolivia timezone offset -04:00
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
        price: '45.00'
      })
    });
    const createFuncData = await createFuncRes.json();
    if (!createFuncData.success) {
      console.error(createFuncData);
      throw new Error(`Failed to create screening function: ${createFuncData.message}`);
    }
    const screeningFunction = createFuncData.data;
    console.log(`✅ Screening function created! ID: ${screeningFunction.id} at ${screeningFunction.startTime}`);

    // Get current loyalty points before first purchase
    console.log('\n👤 Checking client profile points before purchase...');
    const profileBeforeRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileBeforeData = await profileBeforeRes.json();
    const initialPoints = profileBeforeData.data.profile.points;
    console.log(`✅ Initial Loyalty Points: ${initialPoints}`);

    // 6. Buy a ticket
    console.log('\n🎟️ Purchasing a ticket (Seats: A1, A2) with Combos...');
    const purchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['A1', 'A2'],
        snacks: [{ id: 's1', name: 'Combo Mega CineStream', quantity: 1 }],
        totalPrice: '155.00', // 45*2 = 90 tickets + 65 combo = 155 Bs.
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const purchaseData = await purchaseRes.json();
    if (!purchaseData.success) {
      console.error(purchaseData);
      throw new Error(`Ticket purchase failed: ${purchaseData.message}`);
    }
    const ticket = purchaseData.data;
    console.log(`✅ Ticket purchased! ID: ${ticket.ticketId}, Total: Bs. ${ticket.totalPrice}`);

    // Check loyalty points after purchase
    const profileAfterPurchaseRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileAfterPurchaseData = await profileAfterPurchaseRes.json();
    const postPurchasePoints = profileAfterPurchaseData.data.profile.points;
    console.log(`✅ Loyalty Points after purchase: ${postPurchasePoints} (Gain: +${postPurchasePoints - initialPoints})`);

    // 7. Cancel the ticket
    console.log('\n❌ Cancelling the ticket to request refund/coupon...');
    const cancelRes = await fetch(`${BASE_URL}/bookings/${ticket.ticketId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const cancelData = await cancelRes.json();
    if (!cancelData.success) {
      console.error(cancelData);
      throw new Error(`Ticket cancellation failed: ${cancelData.message}`);
    }
    const cancellationInfo = cancelData.data;
    console.log(`✅ Ticket successfully cancelled!`);
    console.log(`🎫 Ticket Status: "${cancellationInfo.ticketStatus}"`);
    console.log(`🎟️ Coupon Generated: "${cancellationInfo.couponCode}" (Value: Bs. ${cancellationInfo.couponValue})`);

    const refundCouponCode = cancellationInfo.couponCode;

    // Verify points are reverted
    const profileAfterCancelRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const profileAfterCancelData = await profileAfterCancelRes.json();
    const postCancelPoints = profileAfterCancelData.data.profile.points;
    console.log(`✅ Loyalty Points after cancellation: ${postCancelPoints} (Should match initial: ${initialPoints})`);
    if (postCancelPoints !== initialPoints) {
      console.warn('⚠️ Warning: Loyalty points did not revert completely to initial level.');
    }

    // Verify coupon is returned in my-coupons list
    console.log('\n🏷️ Fetching client active coupons...');
    const couponsRes = await fetch(`${BASE_URL}/users/coupons`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const couponsData = await couponsRes.json();
    const myCoupons = couponsData.data || [];
    const foundCoupon = myCoupons.find(c => c.code === refundCouponCode);
    if (!foundCoupon) {
      throw new Error('Generated coupon not found in user coupons list!');
    }
    console.log(`✅ Coupon verified in user list. Value: Bs. ${foundCoupon.value}, Active: ${!foundCoupon.isUsed}`);

    // 8. Admin Audit verification
    console.log('\n🕵️ Checking coupon in Admin Audit tab...');
    const adminCouponsRes = await fetch(`${BASE_URL}/bookings/admin/coupons`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminCouponsData = await adminCouponsRes.json();
    const allCoupons = adminCouponsData.data || [];
    const adminFoundCoupon = allCoupons.find(c => c.code === refundCouponCode);
    if (!adminFoundCoupon) {
      throw new Error('Generated coupon not found in Admin coupons list!');
    }
    console.log(`✅ Coupon found in admin audit logs.`);
    console.log(`   Origin Ticket ID: ${adminFoundCoupon.originTicketId}`);
    console.log(`   Redeemed Ticket ID (Should be null): ${adminFoundCoupon.redeemedTicketId}`);

    // 9. Checkout with coupon (Total Price = coupon value)
    console.log('\n🛍️ Booking new seats (Seats: B1, B2) using the generated coupon (price-bypass test)...');
    const newPurchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['B1', 'B2'],
        totalPrice: '90.00', // 45 * 2 = 90 Bs
        paymentMethod: 'coupon',
        couponCode: refundCouponCode
      })
    });
    const newPurchaseData = await newPurchaseRes.json();
    if (!newPurchaseData.success) {
      console.error(newPurchaseData);
      throw new Error(`Coupon checkout failed: ${newPurchaseData.message}`);
    }
    const newTicket = newPurchaseData.data;
    console.log(`✅ Ticket purchased using coupon! ID: ${newTicket.ticketId}`);
    console.log(`   Payment Method: "${newTicket.paymentMethod}"`);
    console.log(`   Transaction ID: "${newTicket.transactionId}"`);

    // Verify coupon is marked as used and has redeemedTicketId set
    console.log('\n🕵️ Verifying coupon usage audit fields...');
    const adminCouponsAfterRes = await fetch(`${BASE_URL}/bookings/admin/coupons`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminCouponsAfterData = await adminCouponsAfterRes.json();
    const usedCouponAudit = (adminCouponsAfterData.data || []).find(c => c.code === refundCouponCode);
    if (!usedCouponAudit) throw new Error('Could not fetch coupon audit logs after redeem');
    
    console.log(`✅ Coupon usage audit:`);
    console.log(`   Is Used: ${usedCouponAudit.isUsed}`);
    console.log(`   Redeemed Ticket ID: ${usedCouponAudit.redeemedTicketId} (Should match: ${newTicket.ticketId})`);
    if (usedCouponAudit.redeemedTicketId !== newTicket.ticketId) {
      throw new Error('Audit field redeemedTicketId mismatch!');
    }

    // 10. Test Revocation flow
    console.log('\n🚫 Testing admin revocation flow on a new cancellation...');
    // Buy a third ticket
    const ticket3Res = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['C1'],
        totalPrice: '45.00',
        paymentMethod: 'card',
        cardNumber: '4000123456789010',
        paymentToken: 'tok_verify'
      })
    });
    const ticket3Data = await ticket3Res.json();
    if (!ticket3Data.success) {
      console.error('Ticket 3 purchase failed:', ticket3Data);
      throw new Error(`Ticket 3 purchase failed: ${ticket3Data.message}`);
    }
    const ticket3 = ticket3Data.data;

    // Cancel third ticket to generate coupon
    const cancel3Res = await fetch(`${BASE_URL}/bookings/${ticket3.ticketId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const cancel3Data = await cancel3Res.json();
    const coupon3Code = cancel3Data.data.couponCode;
    console.log(`✅ Ticket 3 cancelled. Generated Coupon 3: "${coupon3Code}"`);

    // Retrieve Coupon 3 record ID
    const coupons3Res = await fetch(`${BASE_URL}/bookings/admin/coupons`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const coupons3Data = await coupons3Res.json();
    const coupon3Record = coupons3Data.data.find(c => c.code === coupon3Code);

    // Revoke Coupon 3 as Admin
    console.log(`🚫 Revoking Coupon 3 (ID: ${coupon3Record.id}) as Admin...`);
    const revokeRes = await fetch(`${BASE_URL}/bookings/admin/coupons/${coupon3Record.id}/revoke`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const revokeData = await revokeRes.json();
    if (!revokeData.success) {
      console.error(revokeData);
      throw new Error(`Coupon revocation failed: ${revokeData.message}`);
    }
    console.log(`✅ Coupon 3 revoked: ${revokeData.message}`);

    // Verify revoked coupon cannot be applied
    console.log('🔄 Checking if revoked coupon is rejected on checkout...');
    const failedPurchaseRes = await fetch(`${BASE_URL}/bookings/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        functionId: screeningFunction.id,
        seatNumbers: ['C1'],
        totalPrice: '45.00',
        paymentMethod: 'coupon',
        couponCode: coupon3Code
      })
    });
    const failedPurchaseData = await failedPurchaseRes.json();
    console.log(`✅ Purchase rejected as expected. Message: "${failedPurchaseData.message}"`);
    if (failedPurchaseData.success) {
      throw new Error('Purchase succeeded using a revoked coupon! Critical security issue.');
    }

    console.log('\n🎉 ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
