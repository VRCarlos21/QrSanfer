import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonLoading,
  IonMenuButton,
  IonButtons,
} from "@ionic/react";
import { db, storage } from "../services/firebaseConfig";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Definición de la interfaz para los datos de las solicitudes
interface RequestData {
  id: string;
  name: string;
  employeeNumber: string;
  email: string;
  date: string;
  status?: string; // Campo opcional
  pdfUrl: string;
  qrUrl?: string; // Campo opcional
  oficinaId: string; // ID de la oficina del usuario que hizo la solicitud
}

// Props del componente Admin
interface AdminProps {
  handleSignOut: () => void; // Función para cerrar sesión
}

const Admin: React.FC<AdminProps> = ({ handleSignOut }) => {
  const [pendingRequests, setPendingRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeNumberForPhoto, setEmployeeNumberForPhoto] = useState(""); // Número de empleado para la foto
  const [oficinaId, setOficinaId] = useState(""); // Estado para almacenar el ID de la oficina del admin

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

  // 🔹 Función para obtener las solicitudes desde Firestore
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "requests"));
      const requestData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RequestData[];

      // Filtrar solicitudes por oficina del administrador
      const filteredRequests = requestData.filter((r) => r.oficinaId === oficinaId);

      // Mostrar solo las solicitudes pendientes
      setPendingRequests(filteredRequests.filter((r) => r.status === "Pendiente"));
    } catch (error) {
      console.error("Error al obtener solicitudes:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Cargar solicitudes cuando el componente se monta o cuando cambia el ID de la oficina
  useEffect(() => {
    if (oficinaId) {
      fetchRequests();
    }
  }, [oficinaId]);


  // 🔹 Aprobar solicitud
  const handleApprove = async (request: RequestData) => {
    try {
      setLoading(true);
      // 1️⃣ Actualizar el estado de la solicitud a "Aprobado" en Firestore
      const requestRef = doc(db, "requests", request.id);
      await updateDoc(requestRef, { status: "Aprobado" });
      alert("Solicitud aprobada.");
      // 2️⃣ Recargar la lista de solicitudes
      fetchRequests();
    } catch (error) {
      console.error("Error al aprobar solicitud:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Rechazar solicitud (Sin generar QR)
  const handleReject = async (request: RequestData) => {
    try {
      setLoading(true);
      const requestRef = doc(db, "requests", request.id);
      await updateDoc(requestRef, { status: "Rechazado", qrUrl: "" }); // Eliminamos el QR si se rechazó
      alert("Solicitud rechazada.");
      // 🔄 Recargar la lista de solicitudes después del rechazo
      fetchRequests();
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Ver PDF en nueva pestaña
  const handleViewPDF = (pdfUrl: string) => {
    window.open(pdfUrl, "_blank");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Panel de Administrador</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonLoading isOpen={loading} message="Procesando solicitud..." />

        {/* Solicitudes Pendientes */}
        <h3>Solicitudes Pendientes</h3>
        {pendingRequests.length === 0 ? (
          <IonItem>
            <IonLabel>No hay solicitudes pendientes</IonLabel>
          </IonItem>
        ) : (
          <IonList>
            {pendingRequests.map((request) => (
              <IonItem key={request.id}>
                <IonLabel>
                  <h2>{request.name} ({request.employeeNumber})</h2>
                  <p>{request.email}</p>
                  <p>Fecha: {request.date}</p>
                  <p>Estado: <strong>{request.status}</strong></p>
                </IonLabel>
                <IonButton color="success" onClick={() => handleApprove(request)}>
                  Aprobar
                </IonButton>
                <IonButton color="danger" onClick={() => handleReject(request)}>
                  Rechazar
                </IonButton>
                <IonButton color="primary" onClick={() => handleViewPDF(request.pdfUrl)}>
                  Ver PDF
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Admin;