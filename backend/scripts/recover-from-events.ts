import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function recover() {
  console.log('🔍 Searching events for PRODUCT_CREATED...');
  const result = await client.execute("SELECT metadata FROM events WHERE event_type = 'PRODUCT_CREATED'");
  console.log('Found events:', result.rows.length);
  result.rows.forEach(r => {
     try {
       const meta = JSON.parse(r.metadata as string);
       console.log(`- ${meta.name} [${meta.id}]`);
     } catch (e) {
       console.log(`- Raw: ${r.metadata}`);
     }
  });
}

recover().catch(console.error);
