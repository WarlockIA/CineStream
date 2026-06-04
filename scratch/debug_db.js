const { Ticket, Coupon, User } = require('../backend/src/models');

async function debug() {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    console.log('=== LATEST USERS ===');
    users.forEach(u => console.log(`User ID: ${u.id}, Email: ${u.email}`));

    const tickets = await Ticket.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    console.log('\n=== LATEST TICKETS ===');
    tickets.forEach(t => console.log(`Ticket ID: ${t.id}, UserId: ${t.userId}, FunctionId: ${t.functionId}, Seats: ${JSON.stringify(t.seatNumbers)}, TotalPrice: ${t.totalPrice}, Status: ${t.status}`));

    const coupons = await Coupon.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    console.log('\n=== LATEST COUPONS ===');
    coupons.forEach(c => console.log(`Coupon ID: ${c.id}, Code: ${c.code}, Value: ${c.value}, UserId: ${c.userId}, OriginTicket: ${c.originTicketId}, IsUsed: ${c.isUsed}`));

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

debug();
