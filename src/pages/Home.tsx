import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonModal,
  IonCard,
  IonIcon,
  IonButtons,
  IonMenuButton,
} from "@ionic/react";
import "../global.css";
import { db, storage } from "../services/firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkmarkCircle } from "ionicons/icons";
import { getAuth } from "firebase/auth"; // Importar getAuth

interface HomeProps {
  handleSignOut: () => void; // Función para cerrar sesión
}

const Home: React.FC<HomeProps> = ({ handleSignOut }) => {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // Estado para el correo
  const [date, setDate] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [oficinaId, setOficinaId] = useState(""); // Estado para almacenar el ID de la oficina del usuario

  // Obtener el correo y la oficina del usuario autenticado
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      // Obtener el correo del usuario
      if (user.email) {
        setEmail(user.email);
      }

      // Obtener el ID de la oficina del usuario
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

  // Validar que el número de empleado empiece con "M" y tenga solo números después
  const isValidEmployeeNumber = (num: string) => /^M\d+$/.test(num);

  // Buscar la foto en Firebase Storage
  const validateAndGetEmployeePhotoUrl = async (employeeNumber: string) => {
    const storageRef = ref(storage, `fotos/${employeeNumber}.jpg`);
    try {
      const photoUrl = await getDownloadURL(storageRef);
      return photoUrl; // La imagen existe, devolvemos la URL
    } catch (error) {
      console.error("Imagen no encontrada:", error);
      return null; // Si no se encuentra la imagen, devolvemos null
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setPdfFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    //if (!pdfFile) {
      //alert("Por favor, sube un PDF.");
     // return;
    //}
    if (!isValidEmployeeNumber(employeeNumber)) {
      alert("El número de empleado debe comenzar con 'M' seguido de números.");
      return;
    }
    if (!oficinaId) {
      alert("No se pudo obtener la oficina del usuario. Intenta de nuevo.");
      return;
    }

    setLoading(true);
    try {
      // Subir PDF a Firebase Storage
      //const pdfStorageRef = ref(storage, `pdfs/${Date.now()}_${pdfFile.name}`);
      //await uploadBytes(pdfStorageRef, pdfFile);
      //const pdfUrl = await getDownloadURL(pdfStorageRef);
      const pdfUrl = ""; // o null si se prefiere

      // Guardar la información en Firestore
      await addDoc(collection(db, "requests"), {
        employeeNumber,
        name,
        email, // Usar el correo del estado
        date, // Fecha de vencimiento del permiso
        pdfUrl,
        status: "Pendiente", // Estado inicial de la solicitud
        createdAt: new Date(), // Fecha de creación de la solicitud
        oficinaId, // Incluir el ID de la oficina del usuario
        historial: [
          {
            estado: "Pendiente",
            fecha: new Date(),
            mensaje: "Solicitud creada y enviada al administrador.",
          },
        ],
      });

      // Mostrar el log en la consola de frontend cuando se crea el documento
      console.log("Solicitud guardada y correo enviado desde Firebase Functions para el correo.");

      setIsSuccessModalOpen(true);
      setEmployeeNumber("");
      setName("");
      setDate("");
      setPdfFile(null);
      setPhotoPreviewUrl(null);
    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
      alert("Hubo un error, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeNumberChange = async (value: string) => {
    setEmployeeNumber(value);
    if (isValidEmployeeNumber(value)) {
      const photoUrl = await validateAndGetEmployeePhotoUrl(value);
      setPhotoPreviewUrl(photoUrl); // Actualizar el preview de la imagen
    } else {
      setPhotoPreviewUrl(null); // Limpiar el preview si el número de empleado no es válido
    }
  };

  return (
    <IonPage>
      {/* Header con botón de menú y título */}
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Generar QR de Equipo de Computo</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* Contenido principal */}
      <IonContent className="ion-padding">
        {/* Modal de éxito */}
        <IonModal isOpen={isSuccessModalOpen} onDidDismiss={() => setIsSuccessModalOpen(false)}>
          <IonCard className="ion-padding ion-text-center">
            <IonIcon icon={checkmarkCircle} color="success" size="large" />
            <IonLabel color="success">
              <h1>¡Registro exitoso!</h1>
              <p>Te llegará la confirmación a tu correo.</p>
            </IonLabel>
            <IonButton expand="full" color="success" onClick={() => setIsSuccessModalOpen(false)}>
              Aceptar
            </IonButton>
          </IonCard>
        </IonModal>

        {/* Formulario */}
        <div style={{ marginTop: "20px" }}>
          <IonItem>
            <IonLabel position="stacked">Número de Empleado</IonLabel>
            <IonInput
              value={employeeNumber}
              onIonChange={(e) => handleEmployeeNumberChange(e.detail.value!)}
              placeholder="Ejemplo: M12345"
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Nombre Completo</IonLabel>
            <IonInput value={name} onIonChange={(e) => setName(e.detail.value!)} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Correo Electrónico</IonLabel>
            <IonInput
              value={email}
              type="email"
              onIonChange={(e) => setEmail(e.detail.value!)}
              disabled // Deshabilitar el campo para que no se pueda editar
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Fecha de Vencimiento del Permiso</IonLabel>
            <IonInput type="date" value={date} onIonChange={(e) => setDate(e.detail.value!)} />
          </IonItem>
          {/* Para subir el PDF */}
          {/*<IonItem>
            <IonLabel position="stacked">Subir PDF</IonLabel>
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
          </IonItem>*/}
          <IonButton
            expand="full"
            onClick={handleSubmit}
            disabled={loading}
            style={{ marginTop: "50px" }}
          >
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
