import * as dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/.env.local` });

import { saveUserData } from './src/lib/userDataService';
import { fakeProfiles } from './src/data';

async function testSave() {
  console.log("Testing saveUserData with fakeProfile[0]...");
  const data = fakeProfiles[0];
  const success = await saveUserData(data);
  console.log("saveUserData returned:", success);
}

testSave().catch(console.error);
