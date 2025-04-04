import React, { useState, useEffect, useRef } from "react";
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
  IonButton,
  IonModal,
  IonList,
  IonItem,
  IonCheckbox,
  IonLabel,
} from "@ionic/react";
import { db } from "../../services/firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  peopleOutline,
  alertCircleOutline,
  calendarOutline,
  timeOutline,
} from "ionicons/icons";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import html2canvas from "html2canvas";

// Interfaz para los datos de los equipos
interface Request {
  id: string;
  name: string;
  employeeNumber: string;
  oficinaId: string;
  statusEquipo: string;
  ultimaLectura: string;
  date?: string; // Campo para la fecha de expiración
}

const ReportesVigilante: React.FC = () => {
  const [equiposDentro, setEquiposDentro] = useState<number>(0);
  const [equiposFuera, setEquiposFuera] = useState<number>(0);
  const [equiposExternos, setEquiposExternos] = useState<number>(0);
  const [escaneosExpirados, setEscaneosExpirados] = useState<number>(0);
  const [totalEscaneosMes, setTotalEscaneosMes] = useState<number>(0);
  const [equiposPorExpirar, setEquiposPorExpirar] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [oficinasVigilante, setOficinasVigilante] = useState<string[]>([]);
  const [equiposLista, setEquiposLista] = useState<Request[]>([]);

  const [selectedCards, setSelectedCards] = useState<{ [key: string]: boolean }>({
    equiposDentro: true,
    equiposFuera: true,
    equiposExternos: true,
    escaneosExpirados: true,
    totalEscaneosMes: true,
    equiposPorExpirar: true,
  });
  const [showModal, setShowModal] = useState<boolean>(false);
  const auth = getAuth();
  const reportRef = useRef(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (Array.isArray(userData.oficinas) && userData.oficinas.length > 0) {
            setOficinasVigilante(userData.oficinas);
          }
        }
      });
    }
  }, [auth]);

  useEffect(() => {
    if (oficinasVigilante.length === 0) return;

    const fetchEquiposExternos = async () => {
      try {
        const promises = oficinasVigilante.map(async (oficina) => {
          const q = query(collection(db, "equiposExternos"), where("oficinaVigilante", "==", oficina));
          return getDocs(q);
        });

        const snapshots = await Promise.all(promises);
        let totalExternos = 0;
        let equiposExternosLista: Request[] = [];

        snapshots.forEach((snapshot) => {
          totalExternos += snapshot.size;
          snapshot.forEach((doc) => {
            equiposExternosLista.push({ ...doc.data(), id: doc.id } as Request);
          });
        });

        setEquiposExternos(totalExternos);
        setEquiposLista((prev) => [...prev, ...equiposExternosLista]);
      } catch (error) {
        console.error("Error al obtener equipos externos:", error);
      }
    };

    const fetchReportes = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const fechaActual = new Date();
        const fechaLimite = new Date(fechaActual.getTime() + 7 * 24 * 60 * 60 * 1000);

        const qRequests = query(
          collection(db, "requests"),
          where("oficinaId", "in", oficinasVigilante)
        );
        const querySnapshotRequests = await getDocs(qRequests);

        let dentroCount = 0;
        let fueraCount = 0;
        let expiradoCount = 0;
        let porExpirarCount = 0;
        const equipos: Request[] = [];

        querySnapshotRequests.forEach((doc) => {
          const data = doc.data() as Request;
          const date = data.date ? new Date(data.date) : null;

          if (date && date < fechaActual) {
            expiradoCount++;
          } else if (date && date >= fechaActual && date <= fechaLimite) {
            porExpirarCount++;
          }

          if (data.statusEquipo === "dentro") {
            dentroCount++;
          } else if (data.statusEquipo === "fuera") {
            fueraCount++;
          }

          equipos.push({ ...data, id: doc.id });
        });

        setEquiposDentro(dentroCount);
        setEquiposFuera(fueraCount);
        setEscaneosExpirados(expiradoCount);
        setEquiposPorExpirar(porExpirarCount);
        setEquiposLista(equipos); // Guardar la lista de equipos

        const qExternos = query(
          collection(db, "equiposExternos"),
          where("oficinaVigilante", "in", oficinasVigilante)
        );
        const querySnapshotExternos = await getDocs(qExternos);
        setEquiposExternos(querySnapshotExternos.size);

        const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0, 23, 59, 59);

        const qEscaneosMes = query(
          collection(db, "lecturas"),
          where("timestamp", ">=", primerDiaMes.toISOString()), // Comparar como string
          where("timestamp", "<=", ultimoDiaMes.toISOString()), // Comparar como string
          where("vigilanteId", "==", user.uid)
        );


        const querySnapshotEscaneosMes = await getDocs(qEscaneosMes);
        setTotalEscaneosMes(querySnapshotEscaneosMes.size);

        setLoading(false);
      } catch (error) {
        console.error("Error al obtener reportes:", error);
        setLoading(false);
      }
    };

    fetchReportes(); fetchEquiposExternos();

  }, [oficinasVigilante, auth]);

  const toggleCardSelection = (cardKey: string) => {
    setSelectedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const generarPDF = () => {
    setShowModal(true);
  };

  const confirmarGenerarPDF = () => {
    setShowModal(false);

    const input = reportRef.current as unknown as HTMLElement;
    if (!input) {
      console.error("El elemento de referencia no existe.");
      return;
    }

    console.log("Generando PDF...");

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");

      // Título del reporte con la fecha
      const fechaActual = new Date().toLocaleDateString();
      pdf.setTextColor(33, 150, 243); // Color azul para el título
      pdf.text(`Reporte de Vigilante - ${fechaActual}`, 10, 10);

      // Configuración de la tabla
      const columns = ["Equipo", "Número de Empleado", "Estado/Fecha de Expiración"];
      const columnWidths = [70, 60, 60]; // Anchos de las columnas en mm
      const rowHeight = 10; // Altura de cada fila en mm
      let yPosition = 20; // Posición inicial Y para la tabla

      // Función para agregar una sección de equipos
      const agregarSeccionEquipos = (titulo: string, equipos: Request[], contador: number, mostrarFecha: boolean = false) => {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0); // Color negro para el título de la sección
        pdf.text(`${titulo}: ${contador}`, 10, yPosition); // Mostrar el título con el número de equipos
        yPosition += rowHeight;

        // Dibujar encabezados de la tabla
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255); // Color blanco para los encabezados
        pdf.setFillColor(33, 150, 243); // Color azul para el fondo de los encabezados
        columns.forEach((column, index) => {
          pdf.rect(
            10 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0),
            yPosition,
            columnWidths[index],
            rowHeight,
            "F" // Rellenar el rectángulo con color
          );
          pdf.text(
            column,
            15 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), // Ajustar posición del texto
            yPosition + 7 // Centrar verticalmente
          );
        });
        yPosition += rowHeight;

        // Dibujar filas de la tabla
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0); // Color negro para el contenido de la tabla
        equipos.forEach((equipo) => {
          const estadoOFecha = mostrarFecha && equipo.date
            ? new Date(equipo.date).toLocaleDateString() // Mostrar fecha de expiración
            : equipo.statusEquipo === "dentro" ? "Dentro" : "Fuera"; // Mostrar estado

          const row = [equipo.name, equipo.employeeNumber, estadoOFecha];

          // Dibujar cada celda de la fila
          row.forEach((cell, cellIndex) => {
            pdf.text(
              cell,
              15 + columnWidths.slice(0, cellIndex).reduce((a, b) => a + b, 0), // Ajustar posición del texto
              yPosition + 7 // Centrar verticalmente
            );
          });

          // Dibujar bordes de la fila
          pdf.setDrawColor(200, 200, 200); // Color gris para los bordes
          pdf.rect(
            10,
            yPosition,
            columnWidths.reduce((a, b) => a + b, 0),
            rowHeight,
            "D" // Dibujar el rectángulo sin rellenar
          );

          yPosition += rowHeight; // Mover a la siguiente fila

          // Si la posición Y supera la altura de la página, agregar una nueva página
          if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20; // Reiniciar la posición Y
          }
        });

        yPosition += rowHeight; // Espacio adicional entre secciones
      };

      // Agregar secciones según las tarjetas seleccionadas
      if (selectedCards.equiposDentro) {
        const equiposDentro = equiposLista.filter((equipo) => equipo.statusEquipo === "dentro" && !equipo.oficinaId.includes("externo"));
        if (equiposDentro.length > 0) {
          agregarSeccionEquipos("Equipos Dentro - Detalle", equiposDentro, equiposDentro.length);
        }
      }

      if (selectedCards.equiposFuera) {
        const equiposFuera = equiposLista.filter((equipo) => equipo.statusEquipo === "fuera" && !equipo.oficinaId.includes("externo"));
        if (equiposFuera.length > 0) {
          agregarSeccionEquipos("Equipos Fuera - Detalle", equiposFuera, equiposFuera.length);
        }
      }

      if (selectedCards.equiposPorExpirar) {
        const equiposPorExpirar = equiposLista.filter((equipo) => {
          if (!equipo.date) return false;
          const fechaExpira = new Date(equipo.date);
          const fechaActual = new Date();
          return fechaExpira >= fechaActual && fechaExpira <= new Date(fechaActual.getTime() + 7 * 24 * 60 * 60 * 1000);
        });
        if (equiposPorExpirar.length > 0) {
          agregarSeccionEquipos("Equipos por Expirar - Detalle", equiposPorExpirar, equiposPorExpirar.length, true);
        }
      }

      // Agregar una tabla con los números de escaneos expirados, escaneos este mes y equipos externos (solo si están seleccionados)
      const resumenData = [];
      if (selectedCards.escaneosExpirados) {
        resumenData.push(["Escaneos Expirados", escaneosExpirados.toString()]);
      }
      if (selectedCards.totalEscaneosMes) {
        resumenData.push(["Escaneos este Mes", totalEscaneosMes.toString()]);
      }
      if (selectedCards.equiposExternos) {
        resumenData.push(["Equipos Externos", equiposExternos.toString()]);
      }

      if (resumenData.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0); // Color negro para el título de la sección
        pdf.text("Resumen de Escaneos y Equipos Externos", 10, yPosition);
        yPosition += rowHeight;

        // Configuración de la tabla
        const resumenColumns = ["Descripción", "Cantidad"];
        const resumenColumnWidths = [100, 50]; // Anchos de las columnas en mm

        // Dibujar encabezados de la tabla
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255); // Color blanco para los encabezados
        pdf.setFillColor(33, 150, 243); // Color azul para el fondo de los encabezados
        resumenColumns.forEach((column, index) => {
          pdf.rect(
            10 + resumenColumnWidths.slice(0, index).reduce((a, b) => a + b, 0),
            yPosition,
            resumenColumnWidths[index],
            rowHeight,
            "F" // Rellenar el rectángulo con color
          );
          pdf.text(
            column,
            15 + resumenColumnWidths.slice(0, index).reduce((a, b) => a + b, 0), // Ajustar posición del texto
            yPosition + 7 // Centrar verticalmente
          );
        });
        yPosition += rowHeight;

        // Dibujar filas de la tabla
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0); // Color negro para el contenido de la tabla
        resumenData.forEach((row) => {
          row.forEach((cell, cellIndex) => {
            pdf.text(
              cell,
              15 + resumenColumnWidths.slice(0, cellIndex).reduce((a, b) => a + b, 0), // Ajustar posición del texto
              yPosition + 7 // Centrar verticalmente
            );
          });

          // Dibujar bordes de la fila
          pdf.setDrawColor(200, 200, 200); // Color gris para los bordes
          pdf.rect(
            10,
            yPosition,
            resumenColumnWidths.reduce((a, b) => a + b, 0),
            rowHeight,
            "D" // Dibujar el rectángulo sin rellenar
          );

          yPosition += rowHeight; // Mover a la siguiente fila

          // Si la posición Y supera la altura de la página, agregar una nueva página
          if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20; // Reiniciar la posición Y
          }
        });

        yPosition += rowHeight; // Espacio adicional entre secciones
      }

      console.log("Tabla añadida al PDF.");

      // Guardar el PDF
      pdf.save("reporte.pdf");
      console.log("PDF generado y guardado.");
    }).catch((error) => {
      console.error("Error al generar el PDF:", error);
    });
  };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Reportes</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={generarPDF}>Generar PDF</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" ref={reportRef}>
        <IonLoading isOpen={loading} message="Cargando reportes..." />

        {/* Resumen de Reportes en Tarjetas */}
        <IonGrid>
          <IonRow>
            {/* Equipos Dentro */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="success">
                <IonCardHeader>
                  <IonIcon icon={checkmarkCircleOutline} size="large" />
                  <IonCardSubtitle>Equipos Dentro</IonCardSubtitle>
                  <IonCardTitle>{equiposDentro}</IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>

            {/* Equipos Fuera */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="danger">
                <IonCardHeader>
                  <IonIcon icon={closeCircleOutline} size="large" />
                  <IonCardSubtitle>Equipos Fuera</IonCardSubtitle>
                  <IonCardTitle>{equiposFuera}</IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>

            {/* Equipos Externos */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="warning">
                <IonCardHeader>
                  <IonIcon icon={peopleOutline} size="large" />
                  <IonCardSubtitle>Equipos Externos</IonCardSubtitle>
                  <IonCardTitle>{equiposExternos}</IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>

            {/* Escaneos Expirados */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="medium">
                <IonCardHeader>
                  <IonIcon icon={alertCircleOutline} size="large" />
                  <IonCardSubtitle>Escaneos Expirados</IonCardSubtitle>
                  <IonCardTitle>{escaneosExpirados}</IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>

            {/* Total de Escaneos en el Mes */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="primary">
                <IonCardHeader>
                  <IonIcon icon={calendarOutline} size="large" />
                  <IonCardSubtitle>Escaneos este Mes</IonCardSubtitle>
                  <IonCardTitle>{totalEscaneosMes}</IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>

            {/* Equipos a Punto de Expirar */}
            <IonCol size="12" size-md="6" size-lg="4">
              <IonCard color="warning">
                <IonCardHeader>
                  <IonIcon icon={timeOutline} size="large" />
                  <IonCardSubtitle>Equipos por Expirar</IonCardSubtitle>
                  <IonCardTitle>{equiposPorExpirar}</IonCardTitle>
                </IonCardHeader>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Modal para seleccionar tarjetas */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonContent className="ion-padding">
            <IonToolbar>
              <IonTitle>Seleccionar tarjetas para el PDF</IonTitle>
            </IonToolbar>
            <IonList lines="full" className="ion-margin-top">
              <IonItem>
                <IonCheckbox
                  slot="start"
                  checked={selectedCards.equiposDentro}
                  onIonChange={() => toggleCardSelection("equiposDentro")}
                />
                <IonLabel>Equipos Dentro</IonLabel>
              </IonItem>
              <IonItem>
                <IonCheckbox
                  slot="start"
                  checked={selectedCards.equiposFuera}
                  onIonChange={() => toggleCardSelection("equiposFuera")}
                />
                <IonLabel>Equipos Fuera</IonLabel>
              </IonItem>
              <IonItem>
                <IonCheckbox
                  slot="start"
                  checked={selectedCards.equiposExternos}
                  onIonChange={() => toggleCardSelection("equiposExternos")}
                />
                <IonLabel>Equipos Externos</IonLabel>
              </IonItem>
              <IonItem>
                <IonCheckbox
                  slot="start"
                  checked={selectedCards.escaneosExpirados}
                  onIonChange={() => toggleCardSelection("escaneosExpirados")}
                />
                <IonLabel>Escaneos Expirados</IonLabel>
              </IonItem>
              <IonItem>
                <IonCheckbox
                  slot="start"
                  checked={selectedCards.totalEscaneosMes}
                  onIonChange={() => toggleCardSelection("totalEscaneosMes")}
                />
                <IonLabel>Escaneos este Mes</IonLabel>
              </IonItem>
              <IonItem>
                <IonCheckbox
                  slot="start"
                  checked={selectedCards.equiposPorExpirar}
                  onIonChange={() => toggleCardSelection("equiposPorExpirar")}
                />
                <IonLabel>Equipos por Expirar</IonLabel>
              </IonItem>
            </IonList>
            <div className="ion-padding">
              <IonButton expand="block" onClick={confirmarGenerarPDF}>
                Generar PDF
              </IonButton>
              <IonButton expand="block" color="medium" onClick={() => setShowModal(false)}>
                Cerrar
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default ReportesVigilante;