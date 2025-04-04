import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import { getAuth } from "firebase/auth";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { useHistory } from "react-router-dom";

const SelectOffice: React.FC = () => {
  const [oficinas, setOficinas] = useState<{ id: string; name: string }[]>([]);
  const [selectedOficina, setSelectedOficina] = useState<string[]>([]);  // Cambiado a array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const auth = getAuth();
  const history = useHistory();  // Usar para redirigir al home

  useEffect(() => {
    const fetchOficinas = async () => {
      const querySnapshot = await getDocs(collection(db, "oficinas"));
      const oficinasData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setOficinas(oficinasData);
    };

    fetchOficinas();
  }, []);

  const handleSelectOficina = async () => {
    if (selectedOficina.length === 0) {
      setError("Por favor, selecciona al menos una oficina.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        // Guardar las oficinas seleccionadas como un array en Firestore
        await updateDoc(userDocRef, { oficinas: selectedOficina });
        // Redirigir al home una vez se haya guardado
        history.push("/home");
      }
    } catch (error: any) {
      setError("Hubo un error al asignar las oficinas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Selecciona tu Oficina</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonLabel>Selecciona una o más oficinas:</IonLabel>
        <IonSelect
          value={selectedOficina}
          onIonChange={(e) => setSelectedOficina(e.detail.value)}
          multiple  // Permitir seleccionar múltiples oficinas
        >
          {oficinas.map((oficina) => (
            <IonSelectOption key={oficina.id} value={oficina.id}>
              {oficina.name}
            </IonSelectOption>
          ))}
        </IonSelect>

        <IonButton expand="full" onClick={handleSelectOficina} disabled={loading}>
          {loading ? "Cargando..." : "Seleccionar Oficina"}
        </IonButton>

        {error && <p>{error}</p>}
      </IonContent>
    </IonPage>
  );
};

export default SelectOffice;
