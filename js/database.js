import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXwbtaELHu_09qzxYkeBuc33Qh0wTr-Uw", 
  authDomain: "flappy-binnie.firebaseapp.com",
  projectId: "flappy-binnie",
  storageBucket: "flappy-binnie.firebasestorage.app",
  messagingSenderId: "307151469736",
  appId: "1:307151469736:web:3103ca289bc4dedc7f169d",
  measurementId: "G-NSXFLXRS2N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- FIXED: Removed 'uid' to match the Arcade System! ---
export async function savePlayerData(username, highScore, coins, unlockedAchievements) {
  if (!username || username.startsWith("Guest_")) return;

  try {
    const userRef = doc(db, "users", username);
    await setDoc(
      userRef,
      {
        username: username, 
        highScore: highScore,
        coins: coins,
        unlockedAchievements: unlockedAchievements,
        lastPlayed: new Date(),
      },
      { merge: true },
    );
    console.log("Data synced to Firebase!");
  } catch (error) {
    console.error("Firebase Sync Error:", error);
  }
}

export async function getLeaderboardData(topN = 50) {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("highScore", "desc"), limit(topN));
    const querySnapshot = await getDocs(q);
    let leaderboard = [];
    querySnapshot.forEach((doc) => {
      leaderboard.push(doc.data());
    });
    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
}

export function subscribeToLeaderboard(topN, callback) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("highScore", "desc"), limit(topN));

  return onSnapshot(
    q,
    (querySnapshot) => {
      let leaderboard = [];
      querySnapshot.forEach((doc) => {
        leaderboard.push(doc.data());
      });
      callback(leaderboard);
    },
    (error) => {
      console.error("Live Leaderboard Error:", error);
    },
  );
}