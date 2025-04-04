import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonMenuButton,
  IonLoading,
  IonItem,
  IonLabel,
  IonBadge,
  IonList,
} from "@ionic/react";
import { db } from "../../services/firebaseConfig";
import { collection, query, onSnapshot, doc, getDoc, QuerySnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  businessOutline,
  peopleOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
} from "ionicons/icons";
import { deleteDoc } from "firebase/firestore";

// Interfaz para los datos de los equipos
interface Request {
  id: string;
  name: string;
  employeeNumber: string;
  oficinaId: string;
  statusEquipo: string;
  ultimaLectura: string;
  date?: string; // Fecha de expiración (opcional)
}

const ControlDeEquipos: React.FC = () => {
  const [equipos, setEquipos] = useState<Request[]>([]);
  const [equiposExternos, setEquiposExternos] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [oficinasVigilante, setOficinasVigilante] = useState<string[]>([]);
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (Array.isArray(userData.oficinas) && userData.oficinas.length > 0) {
            setOficinasVigilante(userData.oficinas); // Guarda las oficinas del vigilante
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (oficinasVigilante.length === 0) return; // No seguir si aún no se tienen oficinas

    const q = query(collection(db, "requests"));
    const qExternos = query(collection(db, "equiposExternos")); // Nueva consulta para equipos externos

    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      const equiposData = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            employeeNumber: data.employeeNumber,
            oficinaId: data.oficinaId,
            statusEquipo: data.statusEquipo,
            ultimaLectura: data.ultimaLectura,
            date: data.date, // Asegurarse de obtener la fecha
          } as Request;
        })
        .filter(
          (equipo) =>
            oficinasVigilante.includes(equipo.oficinaId) &&
            (!equipo.date || new Date(equipo.date) >= new Date()) // Filtra solo equipos NO expirados
        );
      setEquipos(equiposData);
      setLoading(false);
    });

    const unsubscribeExternos = onSnapshot(qExternos, (snapshot) => {
      const equiposExternosData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          employeeNumber: data.employeeNumber,
          oficinaId: data.oficinaId,
          statusEquipo: data.statusEquipo,
          ultimaLectura: data.ultimaLectura,
          oficinaVigilante: data.oficinaVigilante,
          date: data.date, // Asegurarse de obtener la fecha
        };
      });
      // Filtrar equipos externos dentro de la oficina del vigilante
      const equiposValidos = equiposExternosData.filter(
        (equipo) =>
          equipo.oficinaVigilante === oficinasVigilante[0] &&
          (!equipo.date || new Date(equipo.date) >= new Date()) // Filtra solo equipos NO expirados
      );
      
      // Eliminar equipos cuyo status sea "fuera"
      equiposValidos.forEach(async (equipo) => {
        if (equipo.statusEquipo === "fuera") {
          try {
            await deleteDoc(doc(db, "equiposExternos", equipo.id));
            console.log(`Equipo externo eliminado: ${equipo.id}`);
          } catch (error) {
            console.error("Error al eliminar equipo externo:", error);
          }
        }
      });
      setEquiposExternos(equiposValidos.filter(equipo => equipo.statusEquipo !== "fuera"));
    });
    return () => {
      unsubscribeRequests();
      unsubscribeExternos();
    };
  }, [oficinasVigilante]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Control de Equipos</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonLoading isOpen={loading} message="Cargando equipos..." />

        {/* Resumen de Equipos */}
        <IonGrid>
          <IonRow>
            {/* Equipos Dentro */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="success">
                <IonCardHeader>
                  <IonIcon icon={checkmarkCircleOutline} size="large" />
                  <IonCardSubtitle>Equipos Dentro</IonCardSubtitle>
                  <IonCardTitle>
                    {equipos.filter((e) => e.statusEquipo === "dentro").length}
                  </IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>

            {/* Equipos Fuera */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="danger">
                <IonCardHeader>
                  <IonIcon icon={closeCircleOutline} size="large" />
                  <IonCardSubtitle>Equipos Fuera</IonCardSubtitle>
                  <IonCardTitle>
                    {equipos.filter((e) => e.statusEquipo === "fuera").length}
                  </IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>

            {/* Equipos Externos */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="warning">
                <IonCardHeader>
                  <IonIcon icon={peopleOutline} size="large" />
                  <IonCardSubtitle>Equipos Externos</IonCardSubtitle>
                  <IonCardTitle>{equiposExternos.length}</IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Lista de Equipos Internos */}
        <IonCard>
          <IonCardHeader>
            <IonCardSubtitle>
              <IonIcon icon={businessOutline} /> Equipos Internos
            </IonCardSubtitle>
          </IonCardHeader>
          <IonList>
            {equipos.length === 0 ? (
              <IonItem>
                <IonLabel>No hay equipos registrados para tus oficinas</IonLabel>
              </IonItem>
            ) : (
              equipos.map((equipo) => (
                <IonItem key={equipo.id}>
                  <IonLabel>
                    <h2>
                      <strong>{equipo.name}</strong> ({equipo.employeeNumber})
                    </h2>
                    <p>Última Lectura: {equipo.ultimaLectura}</p>
                  </IonLabel>
                  <IonBadge
                    color={equipo.statusEquipo === "fuera" ? "danger" : "success"}
                  >
                    {equipo.statusEquipo === "fuera" ? "Fuera de oficina" : "Dentro de oficina"}
                  </IonBadge>
                </IonItem>
              ))
            )}
          </IonList>
        </IonCard>

        {/* Lista de Equipos Externos */}
        {equiposExternos.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>
                <IonIcon icon={alertCircleOutline} /> Equipos Externos
              </IonCardSubtitle>
            </IonCardHeader>
            <IonList>
              {equiposExternos.map((equipo) => (
                <IonItem key={equipo.id}>
                  <IonLabel>
                    <h2>
                      <strong>{equipo.name}</strong> ({equipo.employeeNumber})
                    </h2>
                    <p>Última Lectura: {equipo.ultimaLectura}</p>
                  </IonLabel>
                  <IonBadge
                    color={equipo.statusEquipo === "fuera" ? "danger" : "warning"}
                  >
                    {equipo.statusEquipo === "fuera" ? "Fuera de oficina" : "Dentro de oficina"}
                  </IonBadge>
                </IonItem>
              ))}
            </IonList>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ControlDeEquipos;
