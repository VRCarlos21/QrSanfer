import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonMenuButton,
} from "@ionic/react";
import { db } from "../../services/firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface RequestData {
  id: string;
  name: string;
  employeeNumber: string;
  email: string;
  date: string;
  status?: string;
  pdfUrl: string;
  qrUrl?: string;
  oficinaId: string; // ID de la oficina del usuario que hizo la solicitud
}

const HistorialSolicitud: React.FC = () => {
  const [processedRequests, setProcessedRequests] = useState<RequestData[]>([]); // Solicitudes procesadas
  const [oficinaId, setOficinaId] = useState(""); // ID de la oficina del administrador

  // Obtener el ID de la oficina del administrador actual
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.oficinas && userData.oficinas.length > 0) {
            setOficinaId(userData.oficinas[0]); // Asignar el ID de la oficina
          }
        }
      });
    }
  }, []);

  // Obtener las solicitudes procesadas de la oficina del administrador
  useEffect(() => {
    const fetchRequests = async () => {
      if (!oficinaId) return; // No hacer nada si no hay ID de oficina

      const querySnapshot = await getDocs(collection(db, "requests"));
      const requestData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RequestData[];

      // Filtrar solicitudes procesadas (aprobadas o rechazadas) de la oficina del admin
      const filteredRequests = requestData.filter(
        (r) => (r.status === "Aprobado" || r.status === "Rechazado") && r.oficinaId === oficinaId
      );

      setProcessedRequests(filteredRequests);
    };

    fetchRequests();
  }, [oficinaId]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Historial de Solicitudes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Solicitudes Procesadas */}
        <h3>Solicitudes Procesadas</h3>
        {processedRequests.length === 0 ? (
          <IonItem>
            <IonLabel>No hay solicitudes procesadas</IonLabel>
          </IonItem>
        ) : (
          <IonList>
            {processedRequests.map((request) => (
              <IonItem key={request.id}>
                <IonLabel>
                  <h2>{request.name} ({request.employeeNumber})</h2>
                  <p>{request.email}</p>
                  <p>Fecha: {request.date}</p>
                  <p>Estado: <strong>{request.status}</strong></p>
                  {request.qrUrl && (
                    <img
                      src={request.qrUrl}
                      alt="QR Code"
                      style={{ width: "100px", height: "100px" }}
                    />
                  )}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default HistorialSolicitud;