import React, { useState, useEffect } from "react";
import { db } from "../../services/firebaseConfig";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
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
  IonBadge,
  IonButton,
  IonDatetime,
  IonPopover,
} from "@ionic/react";

interface Lectura {
  id: string;
  employeeNumber: string;
  pdfUrl: string;
  statusEquipo: string;
  timestamp: string;
  esExterno: boolean;
  vigilanteId: string;
}

const HistorialLecturas: React.FC = () => {
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [ultimoDoc, setUltimoDoc] = useState<any>(null);
  const [fechaFiltro, setFechaFiltro] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(true);
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [evento, setEvento] = useState<MouseEvent | undefined>(undefined);
  const auth = getAuth();
  const user = auth.currentUser;
  const LIMITE = 10;

  useEffect(() => {
    if (!user) return;
    cargarLecturas(true);
  }, [user]);

  // 🔄 Cargar lecturas con paginación
  const cargarLecturas = async (reset = false) => {
    if (!user) return;

    let q = query(
      collection(db, "lecturas"),
      where("vigilanteId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(LIMITE)
    );

    if (!reset && ultimoDoc) {
      q = query(q, startAfter(ultimoDoc));
    }

    const snapshot = await getDocs(q);
    const nuevasLecturas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lectura[];

    setLecturas(reset ? nuevasLecturas : [...lecturas, ...nuevasLecturas]);
    setUltimoDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setHayMas(snapshot.docs.length === LIMITE);
  };

  // 🔍 Buscar por fecha
  const buscarPorFecha = async () => {
    if (!user || !fechaFiltro) return;

    const fechaInicio = new Date(fechaFiltro);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fechaFiltro);
    fechaFin.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "lecturas"),
      where("vigilanteId", "==", user.uid),
      where("timestamp", ">=", fechaInicio.toISOString()),
      where("timestamp", "<=", fechaFin.toISOString()),
      orderBy("timestamp", "desc"),
      limit(LIMITE)
    );

    const snapshot = await getDocs(q);
    const resultados = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lectura[];

    setLecturas(resultados);
    setUltimoDoc(null);
    setHayMas(false);
  };

  // ❌ Limpiar filtro y recargar todo
  const limpiarFiltro = () => {
    setFechaFiltro(null);
    cargarLecturas(true);
  };

  // 🔄 Convertir timestamp a formato legible
  const formatFecha = (isoString: string) => {
    const fecha = new Date(isoString);
    return fecha.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🛠️ Agregar inert al contenido principal cuando el popover esté abierto
  useEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      if (mostrarFecha) {
        mainContent.setAttribute("inert", "true");
      } else {
        mainContent.removeAttribute("inert");
      }
    }
  }, [mostrarFecha]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Historial de Lecturas</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={(e) => {
                setEvento(e.nativeEvent);
                setMostrarFecha(true);
                setTimeout(() => {
                  document.getElementById("fechaPicker")?.focus();
                }, 100); // 🔄 Mover el foco al picker de fecha
              }}
            >
              📅 Filtrar
            </IonButton>
            {fechaFiltro && (
              <IonButton color="danger" onClick={limpiarFiltro}>
                ❌ Limpiar Filtro
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" id="main-content">
        {/* 📅 Popover para seleccionar fecha */}
        <IonPopover
          isOpen={mostrarFecha}
          event={evento}
          alignment="center"
          onDidDismiss={() => setMostrarFecha(false)}
        >
          <IonDatetime
            id="fechaPicker"
            presentation="date"
            onIonChange={(e) => setFechaFiltro(typeof e.detail.value === "string" ? e.detail.value : null)}
          />
          <IonButton
            expand="full"
            onClick={() => {
              buscarPorFecha();
              setMostrarFecha(false);
            }}
          >
            Buscar
          </IonButton>
        </IonPopover>

        {/* 📋 Lista de lecturas */}
        <IonList>
          {lecturas.length === 0 ? (
            <IonItem>
              <IonLabel>No hay lecturas registradas</IonLabel>
            </IonItem>
          ) : (
            lecturas.map((lectura) => (
              <IonItem key={lectura.id}>
                <IonLabel>
                  <h2>Empleado: {lectura.employeeNumber}</h2>
                  <p>Estado: {lectura.statusEquipo === "fuera" ? "Fuera" : "Dentro"}</p>
                  <p>Fecha: {formatFecha(lectura.timestamp)}</p>
                  {lectura.esExterno && <IonBadge color="warning">Equipo Externo</IonBadge>}
                </IonLabel>
              </IonItem>
            ))
          )}
        </IonList>

        {/* 🔄 Botón para cargar más */}
        {hayMas && (
          <IonButton expand="full" onClick={() => cargarLecturas()}>
            Cargar más
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
};

export default HistorialLecturas;
