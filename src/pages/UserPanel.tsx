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
  IonCard,
  IonImg,
  IonModal,
  IonButtons,
  IonMenuButton,
  IonInput
} from "@ionic/react";
import "../global.css";
import { BarcodeScanner } from "@capacitor-community/barcode-scanner";
import { db, storage } from "../services/firebaseConfig";
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc, setDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";

interface UserPanelProps {
  handleSignOut: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ handleSignOut }) => {
  const [scannedData, setScannedData] = useState<any | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [oficinasVigilante, setOficinasVigilante] = useState<string[]>([]);
  const [manualSearchMode, setManualSearchMode] = useState(false);
  const [employeeNumberInput, setEmployeeNumberInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const auth = getAuth();
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
  }, []);

  const registrarEquipoExterno = async (equipoData: any, pdfUrl: string) => {
    try {
      console.log("Registrando equipo externo...", equipoData);

      const equipoExternoRef = doc(db, "equiposExternos", equipoData.employeeNumber);
      const equipoExternoDoc = await getDoc(equipoExternoRef);

      if (equipoExternoDoc.exists()) {
        const nuevoEstado = equipoExternoDoc.data().statusEquipo === "dentro" ? "fuera" : "dentro";
        await updateDoc(equipoExternoRef, {
          statusEquipo: nuevoEstado,
          ultimaLectura: new Date().toISOString(),
          oficinaVigilante: oficinasVigilante[0],
        });
        console.log(`Equipo externo marcado como ${nuevoEstado}.`);
      } else {
        await setDoc(equipoExternoRef, {
          ...equipoData,
          pdfUrl,
          statusEquipo: "dentro",
          ultimaLectura: new Date().toISOString(),
          oficinaVigilante: oficinasVigilante[0],
        });
        console.log("Nuevo equipo externo registrado:", equipoData.employeeNumber);
      }

      const contadorRef = doc(db, "contadores", "equiposExternos");
      const contadorDoc = await getDoc(contadorRef);

      if (contadorDoc.exists()) {
        const nuevoContador = contadorDoc.data().count + 1;
        await updateDoc(contadorRef, {
          count: nuevoContador,
        });
      } else {
        await setDoc(contadorRef, {
          count: 1,
        });
      }
    } catch (error) {
      console.error("Error al registrar equipo externo:", error);
    }
  };

  const getDaysRemaining = (dateString: string) => {
    if (!dateString) return "Fecha no disponible";
    const today = new Date();
    const permissionDate = new Date(dateString);
    const differenceInTime = permissionDate.getTime() - today.getTime();
    return Math.ceil(differenceInTime / (1000 * 3600 * 24));
  };

  const fetchEmployeePhoto = async (employeeNumber: string) => {
    if (!employeeNumber) return null;
    const storageRef = ref(storage, `fotos/${employeeNumber}.jpg`);
    try {
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error("Imagen no encontrada:", error);
      return null;
    }
  };

  const toggleEquipmentStatus = async (scannedPdfUrl: string) => {
    try {
      const q = query(collection(db, "requests"), where("pdfUrl", "==", scannedPdfUrl));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error("No se encontró solicitud con esta URL.");
        return;
      }

      const docRef = doc(db, "requests", querySnapshot.docs[0].id);
      const docData = querySnapshot.docs[0].data();

      let newStatusEquipo = "fuera";
      if (docData.statusEquipo) {
        newStatusEquipo = docData.statusEquipo === "fuera" ? "dentro" : "fuera";
      }

      await updateDoc(docRef, {
        statusEquipo: newStatusEquipo,
        ultimaLectura: new Date().toISOString(),
      });

      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        await addDoc(collection(db, "lecturas"), {
          employeeNumber: docData.employeeNumber,
          pdfUrl: scannedPdfUrl,
          statusEquipo: newStatusEquipo,
          timestamp: new Date().toISOString(),
          esExterno: false,
          vigilanteId: user.uid,
        });
      }

      return newStatusEquipo;
    } catch (error) {
      console.error("Error al actualizar el estado del equipo:", error);
      return null;
    }
  };

  const scanQRCode = async () => {
    try {
      setLoading(true);
      await BarcodeScanner.checkPermission({ force: true });
      const result = await BarcodeScanner.startScan();

      if (!result.hasContent) {
        setErrorMessage("No se detectó ningún QR.");
        setIsErrorModalOpen(true);
        setLoading(false);
        return;
      }

      const qrContent = result.content;
      const pdfUrlMatch = qrContent.match(/PDF:\s*(https?:\/\/[^\s]+)/);

      if (!pdfUrlMatch || !pdfUrlMatch[1]) {
        setErrorMessage("El QR no contiene una URL válida.");
        setIsErrorModalOpen(true);
        setLoading(false);
        return;
      }

      const scannedPdfUrl = pdfUrlMatch[1];
      console.log("URL del PDF extraída:", scannedPdfUrl);

      const q = query(collection(db, "requests"), where("pdfUrl", "==", scannedPdfUrl));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMessage("No se encontró ninguna solicitud con este QR.");
        setIsErrorModalOpen(true);
        setLoading(false);
        return;
      }

      const docData = querySnapshot.docs[0].data();
      const daysRemaining = getDaysRemaining(docData.date);

      if (typeof daysRemaining === "number" && daysRemaining <= 0) {
        setIsExpiredModalOpen(true);
        setScannedData(null);
        setLoading(false);
        return;
      }

      let updatedStatus = "fuera";

      if (!oficinasVigilante.includes(docData.oficinaId)) {
        console.log("Equipo externo detectado:", docData.employeeNumber);
        setIsExternalModalOpen(true);
        await registrarEquipoExterno(docData, scannedPdfUrl);

        const equipoExternoRef = doc(db, "equiposExternos", docData.employeeNumber);
        const equipoExternoDoc = await getDoc(equipoExternoRef);

        if (equipoExternoDoc.exists()) {
          updatedStatus = equipoExternoDoc.data().statusEquipo;
        } else {
          updatedStatus = "dentro";
        }

        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          await addDoc(collection(db, "lecturas"), {
            employeeNumber: docData.employeeNumber,
            pdfUrl: scannedPdfUrl,
            statusEquipo: updatedStatus,
            timestamp: new Date().toISOString(),
            esExterno: true,
            vigilanteId: user.uid,
          });
        }
      } else {
        updatedStatus = await toggleEquipmentStatus(scannedPdfUrl) || "fuera";
      }

      const employeePhotoUrl = await fetchEmployeePhoto(docData.employeeNumber);
      setScannedData({ ...docData, statusEquipo: updatedStatus });
      setPhotoUrl(employeePhotoUrl);

    } catch (error) {
      console.error("Error al escanear el QR:", error);
      setErrorMessage("Ocurrió un error al escanear el QR. Intenta de nuevo.");
      setIsErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const searchByEmployeeNumber = async () => {
    if (!employeeNumberInput.trim()) {
      setErrorMessage("Por favor ingresa un número de empleado");
      setIsErrorModalOpen(true);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Buscar primero en equipos internos (requests)
      const q = query(collection(db, "requests"), where("employeeNumber", "==", employeeNumberInput));
      const querySnapshot = await getDocs(q);

      let employeeData: any = null;
      let esExterno = false;
      let updatedStatus = "fuera";
      let pdfUrl = "";

      // 2. Verificar si es equipo interno o externo
      if (querySnapshot.empty) {
        // Buscar en equipos externos registrados
        const equipoExternoRef = doc(db, "equiposExternos", employeeNumberInput);
        const equipoExternoDoc = await getDoc(equipoExternoRef);

        if (equipoExternoDoc.exists()) {
          employeeData = equipoExternoDoc.data();
          esExterno = true;
          pdfUrl = employeeData.pdfUrl || "";

          // Alternar estado para equipos externos existentes
          updatedStatus = employeeData.statusEquipo === "dentro" ? "fuera" : "dentro";

          // Actualizar registro externo
          await updateDoc(equipoExternoRef, {
            statusEquipo: updatedStatus,
            ultimaLectura: new Date().toISOString(),
            oficinaVigilante: oficinasVigilante[0]
          });

          setIsExternalModalOpen(true);
        } else {
          setErrorMessage("No se encontró ningún equipo con este número");
          setIsErrorModalOpen(true);
          return;
        }
      } else {
        // Procesar equipo interno encontrado
        employeeData = querySnapshot.docs[0].data();
        pdfUrl = employeeData.pdfUrl || "";
        esExterno = !oficinasVigilante.includes(employeeData.oficinaId);

        // Verificar permiso vencido
        const daysRemaining = getDaysRemaining(employeeData.date);
        if (typeof daysRemaining === "number" && daysRemaining <= 0) {
          setIsExpiredModalOpen(true);
          return;
        }

        if (esExterno) {
          // Registrar como NUEVO equipo externo (primera vez que se detecta)
          const equipoExternoRef = doc(db, "equiposExternos", employeeData.employeeNumber);

          // Estado inicial para nuevos equipos externos
          // Si el equipo ya existe, alternamos su estado actual
          const equipoExternoDoc = await getDoc(equipoExternoRef);
          if (equipoExternoDoc.exists()) {
            updatedStatus = equipoExternoDoc.data().statusEquipo === "dentro" ? "fuera" : "dentro";
            await updateDoc(equipoExternoRef, {
              statusEquipo: updatedStatus,
              ultimaLectura: new Date().toISOString(),
              oficinaVigilante: oficinasVigilante[0]
            });
          } else {
            // Si no existe, lo registramos con estado "dentro"
            updatedStatus = "dentro";
            await setDoc(equipoExternoRef, {
              ...employeeData,
              statusEquipo: updatedStatus,
              ultimaLectura: new Date().toISOString(),
              oficinaVigilante: oficinasVigilante[0],
              pdfUrl: pdfUrl
            });
          }


          setIsExternalModalOpen(true);
        } else {
          // Alternar estado de equipo interno
          const docRef = doc(db, "requests", querySnapshot.docs[0].id);
          updatedStatus = employeeData.statusEquipo === "fuera" ? "dentro" : "fuera";

          await updateDoc(docRef, {
            statusEquipo: updatedStatus,
            ultimaLectura: new Date().toISOString()
          });
        }
      }

      // 3. Registrar lectura (idéntico a escaneo QR)
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const lecturaData = {
          employeeNumber: employeeData.employeeNumber,
          pdfUrl: pdfUrl,
          statusEquipo: updatedStatus,
          timestamp: new Date().toISOString(),
          esExterno: esExterno,
          vigilanteId: user.uid,
          nombre: employeeData.nombre || "No especificado",
          empresa: employeeData.empresa || "No especificada",
          oficinaId: employeeData.oficinaId || "oficina-no-especificada",
          metodoBusqueda: "manual",
          // Campos adicionales para consistencia con QR
          fechaRegistro: new Date().toISOString(),
          vigilanteNombre: user.displayName || "Vigilante"
        };

        await addDoc(collection(db, "lecturas"), lecturaData);
      }

      // 4. Mostrar resultados al usuario
      const employeePhotoUrl = await fetchEmployeePhoto(employeeData.employeeNumber);
      setScannedData({
        ...employeeData,
        statusEquipo: updatedStatus,
        pdfUrl: pdfUrl
      });
      setPhotoUrl(employeePhotoUrl);

    } catch (error) {
      console.error("Error en búsqueda manual:", error);
      setErrorMessage("Error al procesar búsqueda manual");
      setIsErrorModalOpen(true);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Escanear QR</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Modal de Equipo Externo */}
        <IonModal isOpen={isExternalModalOpen} onDidDismiss={() => setIsExternalModalOpen(false)}>
          <div className="modal-container ion-padding">
            <IonCard className="ion-text-center">
              <IonItem lines="none">
                <IonLabel color="primary"><strong>Equipo Externo</strong></IonLabel>
              </IonItem>
              <IonItem lines="none">
                <IonLabel className="ion-text-center">
                  Este equipo pertenece a otra oficina
                </IonLabel>
              </IonItem>
              <IonButton expand="full" color="primary" onClick={() => setIsExternalModalOpen(false)}>
                Aceptar
              </IonButton>
            </IonCard>
          </div>
        </IonModal>

        {/* Modal de Permiso Vencido */}
        <IonModal isOpen={isExpiredModalOpen} onDidDismiss={() => setIsExpiredModalOpen(false)}>
          <div className="modal-container ion-padding">
            <IonCard className="ion-text-center">
              <IonItem lines="none">
                <IonLabel color="danger"><strong>⚠️ Permiso Vencido</strong></IonLabel>
              </IonItem>
              <IonItem lines="none">
                <IonLabel className="ion-text-center">
                  Este permiso ha expirado y no es válido.
                </IonLabel>
              </IonItem>
              <IonButton expand="full" color="danger" onClick={() => setIsExpiredModalOpen(false)}>
                Cerrar
              </IonButton>
            </IonCard>
          </div>
        </IonModal>

        {/* Modal de Error */}
        <IonModal isOpen={isErrorModalOpen} onDidDismiss={() => setIsErrorModalOpen(false)}>
          <div className="modal-container ion-padding">
            <IonCard className="ion-text-center">
              <IonItem lines="none">
                <IonLabel color="warning"><strong>⚠️ Advertencia</strong></IonLabel>
              </IonItem>
              <IonItem lines="none">
                <IonLabel className="ion-text-center">{errorMessage}</IonLabel>
              </IonItem>
              <IonButton expand="full" color="warning" onClick={() => setIsErrorModalOpen(false)}>
                Cerrar
              </IonButton>
            </IonCard>
          </div>
        </IonModal>

        {/* Selector de modo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <IonButton
            fill={!manualSearchMode ? "solid" : "outline"}
            onClick={() => setManualSearchMode(false)}
          >
            Modo Escáner
          </IonButton>
          <IonButton
            fill={manualSearchMode ? "solid" : "outline"}
            onClick={() => setManualSearchMode(true)}
            style={{ marginLeft: "10px" }}
          >
            Búsqueda Manual
          </IonButton>
        </div>

        {manualSearchMode ? (
          <>
            {/* Formulario de búsqueda manual */}
            <IonItem>
              <IonLabel position="floating">Número de Empleado</IonLabel>
              <IonInput
                type="text"
                value={employeeNumberInput}
                onIonChange={(e) => setEmployeeNumberInput(e.detail.value || "")}
              />
            </IonItem>
            <IonButton
              expand="full"
              onClick={searchByEmployeeNumber}
              disabled={isSearching}
              style={{ marginTop: "10px" }}
            >
              {isSearching ? "Buscando..." : "🔍 Buscar"}
            </IonButton>
          </>
        ) : (
          /* Botón para escanear QR */
          <IonButton expand="full" onClick={scanQRCode} disabled={loading}>
            {loading ? "Escaneando..." : "📷 Escanear QR"}
          </IonButton>
        )}

        {/* Mostrar los datos si el permiso es válido */}
        {scannedData && (
          <IonCard className="ion-padding">
            <IonItem>
              <IonLabel>
                <div style={{ textAlign: "center", width: "100%" }}>
                  <strong>Estatus:</strong>{" "}
                  {scannedData.statusEquipo === "fuera" ? "Fuera de oficina" : "Dentro de oficina"}
                </div>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <div style={{ textAlign: "center", width: "100%" }}>
                  <strong>No. Empleado:</strong> {scannedData.employeeNumber}
                </div>
              </IonLabel>
            </IonItem>

            {photoUrl ? (
              <IonItem>
                <div style={{ textAlign: "center", width: "100%" }}>
                  <IonImg
                    src={photoUrl}
                    alt="Foto del empleado"
                    className="image-cropped"
                    style={{ width: "80%", height: "300px", display: "block", margin: "0 auto" }}
                  />
                </div>
              </IonItem>
            ) : (
              <IonItem>
                <IonLabel>
                  <div style={{ textAlign: "center", width: "100%" }}>
                    <strong>⚠️ No hay fotografía disponible</strong>
                  </div>
                </IonLabel>
              </IonItem>
            )}

            <IonItem>
              <IonLabel>
                <div style={{ textAlign: "center", width: "100%" }}>
                  <strong>Tiempo Restante:</strong> {getDaysRemaining(scannedData.date)} días
                </div>
              </IonLabel>
            </IonItem>

            {scannedData.pdfUrl && (
              <IonButton expand="full" color="primary" href={scannedData.pdfUrl} target="_blank">
                📄 Ver PDF
              </IonButton>
            )}
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default UserPanel;