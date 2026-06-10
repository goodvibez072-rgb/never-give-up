import { storage } from '../server/storage';
import bcrypt from 'bcryptjs';
import { unlinkSync, existsSync } from 'fs';

async function fixAdmin() {
  console.log('--- Admin Fix Script ---');
  
  const adminUsername = 'admin';
  const adminEmail = 'goodvibez072@gmail.com';
  const adminPassword = 'Manga@Site2024!Secure99';
  
  try {
    // 1. Delete sentinel file to allow re-initialization if needed
    const sentinelPath = './data/.admin-seeded';
    if (existsSync(sentinelPath)) {
      unlinkSync(sentinelPath);
      console.log('✅ Removed admin sentinel file');
    }

    // 2. Find existing admin
    const user = await storage.getUserByUsername(adminUsername);
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (user) {
      console.log('Found existing admin user, updating...');
      await storage.updateUser(user.id, {
        email: adminEmail,
        password: hashedPassword,
        isAdmin: 'true',
        role: 'owner'
      });
      console.log('✅ Admin user updated successfully');
    } else {
      console.log('Admin user not found, creating...');
      await storage.createUser({
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        isAdmin: 'true',
        role: 'owner'
      });
      console.log('✅ Admin user created successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing admin:', error);
    process.exit(1);
  }
}

fixAdmin();
