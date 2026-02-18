import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  UpdateData
} from 'firebase/firestore';
import { db } from './config';

// Generic helper to add a document
export const addDocument = async (collectionName: string, data: WithFieldValue<DocumentData>) => {
  try {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, data);
    return { id: docRef.id, ...(data as any) };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

// Update document
export const updateDocument = async (collectionName: string, id: string, data: UpdateData<DocumentData>) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error(`Error updating document ${id} in ${collectionName}:`, error);
    throw error;
  }
};

// Delete document
export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, error);
    throw error;
  }
};

// Get single document
export const getDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...(docSnap.data() as any) };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error);
    throw error;
  }
};

// Query documents
export const queryDocuments = async (collectionName: string, constraints: QueryConstraint[] = []) => {
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error querying documents from ${collectionName}:`, error);
    throw error;
  }
};