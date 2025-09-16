
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

const firebaseConfig = {
  apiKey: "AIzaSyCSHNaZv1NQk2gnNWrGLjflkxRT87nGEYg",
  authDomain: "markit-868ce.firebaseapp.com",
  databaseURL: "https://markit-868ce-default-rtdb.firebaseio.com",
  projectId: "markit-868ce",
  storageBucket: "markit-868ce.firebasestorage.app",
  messagingSenderId: "1082751720527",
  appId: "1:1082751720527:web:79c4c1a875084f9159de3a",
  measurementId: "G-4HCZ9R5D7Z"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.database();
