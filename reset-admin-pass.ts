import { storage } from './server/storage.js';

async function main() {
  const username = 'admin';
  const newPassword = 'Manga@Site2024!Secure99';
  console.log('Resetting password for user: ' + username);
  
  const user = await storage.getUserByUsername(username);
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }
  
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.default.hash(newPassword, 10);
  await storage.updateUser(user.id, { 
    password: hashedPassword,
    role: 'owner',
    isAdmin: 'true'
  });
  
  console.log('✅ Password reset successfully for ' + username);
  process.exit(0);
}

main().catch(console.error);
