import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// IMPORTANT: replace these placeholder values with your Firebase Web app config
// from the Firebase Console (Project Settings -> Your apps -> Web app).
const firebaseConfig = {
  apiKey: 'REPLACE_WITH_API_KEY',
  authDomain: 'REPLACE_WITH_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
