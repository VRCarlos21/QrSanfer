import React, { useState, useEffect } from "react";
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
  IonSelect,
  IonSelectOption,
  IonButton,
  IonInput,
} from "@ionic/react";
import { db } from "../../services/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Registro {
  id: string;
  tipo: string; // "solicitud", "escaneo", "equipo"
  usuario: string;
  oficina: string;
  fecha: string;
  estado?: string; // Solo para solicitudes
  detalles: string;
}

const ControlRegistros: React.FC = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [filtroOficina, setFiltroOficina] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Obtener registros desde Firestore
  useEffect(() => {
    const fetchRegistros = async () => {
      let q = query(collection(db, "registros"));

      // Aplicar filtros
      if (filtroOficina) {
        q = query(q, where("oficina", "==", filtroOficina));
      }
      if (filtroEstado) {
        q = query(q, where("estado", "==", filtroEstado));
      }
      if (filtroTipo) {
        q = query(q, where("tipo", "==", filtroTipo));
      }

      const querySnapshot = await getDocs(q);
      const registrosData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Registro[];
      setRegistros(registrosData);
    };

    fetchRegistros();
  }, [filtroOficina, filtroEstado, filtroTipo]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Control de Registros</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Filtros */}
        <IonItem>
          <IonLabel>Filtrar por oficina:</IonLabel>
          <IonSelect value={filtroOficina} onIonChange={(e) => setFiltroOficina(e.detail.value)}>
            <IonSelectOption value="">Todas</IonSelectOption>
            <IonSelectOption value="7 Norte">7 Norte</IonSelectOption>
            <IonSelectOption value="Parque Industrial">Parque Industrial</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel>Filtrar por estado:</IonLabel>
          <IonSelect value={filtroEstado} onIonChange={(e) => setFiltroEstado(e.detail.value)}>
            <IonSelectOption value="">Todos</IonSelectOption>
            <IonSelectOption value="Pendiente">Pendiente</IonSelectOption>
            <IonSelectOption value="Aprobado">Aprobado</IonSelectOption>
            <IonSelectOption value="Rechazado">Rechazado</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel>Filtrar por tipo:</IonLabel>
          <IonSelect value={filtroTipo} onIonChange={(e) => setFiltroTipo(e.detail.value)}>
            <IonSelectOption value="">Todos</IonSelectOption>
            <IonSelectOption value="solicitud">Solicitudes</IonSelectOption>
            <IonSelectOption value="escaneo">Escaneos</IonSelectOption>
            <IonSelectOption value="equipo">Equipos</IonSelectOption>
          </IonSelect>
        </IonItem>

        {/* Lista de registros */}
        <IonList>
          {registros.map((registro) => (
            <IonItem key={registro.id}>
              <IonLabel>
                <h2>{registro.tipo}</h2>
                <p>Usuario: {registro.usuario}</p>
                <p>Oficina: {registro.oficina}</p>
                <p>Fecha: {registro.fecha}</p>
                {registro.estado && <p>Estado: {registro.estado}</p>}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};
export default ControlRegistros;