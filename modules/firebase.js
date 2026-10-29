// Firebase bootstrap is kept separate from the application logic.
// The Firebase web config is not a secret; access must still be protected by
// Firestore and Storage rules (and Authentication when this app is published).
(function bootstrapFirebase() {
  if (!window.firebase) {
    throw new Error('Firebase SDK is not loaded.');
  }

  const firebaseConfig = {
    apiKey: "AIzaSyAnimKa-4T6Y7dNDYA9y_yk3kT7fBClZ5s",
    projectId: "downtime-1bce5",
    storageBucket: "downtime-1bce5.firebasestorage.app",
    messagingSenderId: "840487628087",
    appId: "1:840487628087:web:6e49579d487fa3483ebeb2",
    measurementId: "G-3292MCMGB1"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  window.downtimeFirebase = Object.freeze({
    firestore: firebase.firestore(),
    storage: firebase.storage()
  });
})();
