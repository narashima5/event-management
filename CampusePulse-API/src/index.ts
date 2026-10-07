import { app } from './app';
import { config } from './config';
import { seedDatabase } from './seed';

const server = app.listen(config.port, async () => {
  console.log(`🚀 College Event Management Backend running on http://localhost:${config.port}`);
  // Run seed check
  try {
    await seedDatabase();
  } catch (err) {
    console.error('Initial seed error:', err);
  }
});

export default server;
