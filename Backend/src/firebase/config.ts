import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAuPv3hiW6KlwDQtkF9jSnGqEX5ZS7SZ44",
  authDomain: "crest-app-1168f.firebaseapp.com",
  projectId: "crest-app-1168f",
  storageBucket: "crest-app-1168f.firebasestorage.app",
  messagingSenderId: "627567664984",
  appId: "1:627567664984:web:42e430dbfb6ee4484c8f2d",
  measurementId: "G-YYT84PMETD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
