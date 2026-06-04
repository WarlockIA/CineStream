require('dotenv').config();
const sequelize = require('./src/config/database');
const { User } = require('./src/models');
const authHelper = require('./src/utils/authHelper');

async function resetPasswords() {
  console.log('🔄 Connecting to database and resetting passwords...');
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    const usersToReset = [
      {
        fullname: 'Administrador',
        email: 'admin@cinestream.com',
        password: 'admin',
        role: 'admin'
      },
      {
        fullname: 'Cajero Staff',
        email: 'staff@cinestream.com',
        password: 'staff',
        role: 'staff'
      },
      {
        fullname: 'Cliente Prueba',
        email: 'cliente@cinestream.com',
        password: '123',
        role: 'client'
      },
      {
        fullname: 'Portero Validador',
        email: 'portero@cinestream.com',
        password: '123',
        role: 'porter'
      }
    ];

    for (const u of usersToReset) {
      const hashedPassword = await authHelper.encryptPassword(u.password);
      
      // Upsert user: find by email, update password/role, or create if not exists
      const [userRecord, created] = await User.findOrCreate({
        where: { email: u.email },
        defaults: {
          fullname: u.fullname,
          password: hashedPassword,
          role: u.role
        }
      });

      if (!created) {
        // User already existed, update password, fullname and role
        userRecord.fullname = u.fullname;
        userRecord.password = hashedPassword;
        userRecord.role = u.role;
        await userRecord.save();
        console.log(`✅ Reset password for existing user: ${u.email} (${u.role})`);
      } else {
        console.log(`✅ Created and set password for new user: ${u.email} (${u.role})`);
      }
    }

    console.log('\n🎉 Passwords reset successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    process.exit(1);
  }
}

resetPasswords();
