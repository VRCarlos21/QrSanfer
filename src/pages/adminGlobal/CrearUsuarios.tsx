import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardContent,
  IonIcon,
  IonLoading,
  IonAlert,
  IonButtons,
  IonMenuButton,
  IonToast,
  IonText,
  IonGrid,
  IonRow,
  IonCol
} from "@ionic/react";
import { auth, db } from "../../services/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { person, mail, lockClosed, checkmark, close  } from "ionicons/icons";
import { useHistory } from "react-router-dom";

interface Oficina {
  id: string;
  name: string;
}
const CrearUsuarios: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [role, setRole] = useState<"adminGlobal" | "admin" | "vigilante">("adminGlobal");
  const [oficinasSeleccionadas, setOficinasSeleccionadas] = useState<string[]>([]);
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const history = useHistory();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("");
  
  // Obtener la lista de oficinas al cargar el componente
  useEffect(() => {
    const obtenerOficinas = async () => {
      const querySnapshot = await getDocs(collection(db, "oficinas"));
      const oficinasData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Oficina[];
      setOficinas(oficinasData);
      console.log("Oficinas obtenidas:", oficinasData); // ✅ Verificar oficinas
    };
    obtenerOficinas();
  }, []);

  // Validar campos antes de crear el usuario
  const validateInputs = () => {
    if (!email.trim()) {
      setError("Por favor, ingresa un correo electrónico.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Por favor, ingresa un correo electrónico válido.");
      return false;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return false;
    }
    if (!name.trim()) {
      setError("Por favor, ingresa un nombre.");
      return false;
    }
    if (!/^M\d+$/.test(employeeNumber)) {
      setError("El número de empleado debe comenzar con 'M' seguido de solo números.");
      return false;
    }
    if ((role === "admin" || role === "vigilante") && oficinasSeleccionadas.length === 0) {
      setError("Por favor, selecciona al menos una oficina.");
      return false;
    }
    console.log("Validación de campos exitosa"); // ✅ Verificar validación
    return true;
  };

  // Crear usuario
  const handleCrearUsuario = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);

      // Guardar el usuario actual que está creando
      const currentUser = auth.currentUser;
      const creadorId = currentUser?.uid || "ID no disponible";
      const creadorCorreo = currentUser?.email || "Correo no disponible";

      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      console.log("Usuario creado en Firebase Auth:", newUser);

      // 2. Enviar correo de verificación (pero no esperar a que se complete)
      sendEmailVerification(newUser).then(() => {
        console.log("Correo de verificación enviado a:", newUser.email);
      }).catch(error => {
        console.error("Error al enviar verificación:", error);
      });

      // 3. Volver a autenticar al usuario administrador actual
      if (currentUser) {
        await auth.updateCurrentUser(currentUser);
        console.log("Sesión de administrador restaurada");
      }

      // 4. Guardar datos en Firestore
      const userData = {
        uid: newUser.uid,
        name,
        email,
        role,
        employeeNumber,
        oficinas: role === "adminGlobal" ? [] : oficinasSeleccionadas,
        createdBy: {
          id: creadorId,
          correo: creadorCorreo,
        },
        createdAt: new Date().toISOString(),
        emailVerified: false, // Añadir campo de verificación
        status: "active" // Estado inicial
      };

      await setDoc(doc(db, "users", newUser.uid), userData);

      // 5. Registrar en logs
      await addDoc(collection(db, "logs"), {
        tipo: "Crear Usuario",
        descripcion: `Nuevo ${role} creado: ${email}`,
        performedBy: {
          id: creadorId,
          correo: creadorCorreo,
          name: currentUser?.displayName || "Administrador"
        },
        userCreated: {
          id: newUser.uid,
          ...userData
        },
        timestamp: Timestamp.fromDate(new Date())
      });

      setToastMessage(`✅ Usuario ${role} creado\nCorreo enviado a: ${email}`);
      setToastColor("success");
      setShowToast(true);

      // Limpiar formulario
      setEmail("");
      setPassword("");
      setName("");
      setEmployeeNumber("");
      setRole("adminGlobal");
      setOficinasSeleccionadas([]);

    } catch (error: any) {      
      // Manejo específico de errores
      let errorMessage = "Error al crear usuario";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "El correo ya está registrado";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña debe tener al menos 6 caracteres";
      }

      // Registrar error
      await addDoc(collection(db, "logs"), {
        tipo: "Error al Crear Usuario",
        descripcion: errorMessage,
        errorDetails: error.message,
        performedBy: {
          id: auth.currentUser?.uid,
          correo: auth.currentUser?.email
        },
        timestamp: Timestamp.fromDate(new Date())
      });

      setError(errorMessage);
      setToastColor("danger");
      setShowToast(true);
    } finally {
      setLoading(false);
      
    }
  };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Crear Usuarios</IonTitle>
        </IonToolbar>
      </IonHeader>
       {/* Notificación Toast */}
       <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={4000}
        position="top"
        color={toastColor}
        style={{ 
          '--width': '90%',
          '--max-width': '400px',
          '--border-radius': '8px'
        }}
      />
      <IonContent className="ion-padding">
        {/* Modal de carga */}
        <IonLoading isOpen={loading} message="Creando usuario..." />
        {/* Alerta de error */}
        <IonAlert
          isOpen={!!error}
          onDidDismiss={() => setError("")}
          header="Error"
          message={error}
          buttons={["OK"]}
        />
        {/* Formulario de creación */}
        <IonCard>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Número de Empleado</IonLabel>
              <IonInput
                type="text"
                value={employeeNumber}
                onIonChange={(e) => setEmployeeNumber(e.detail.value!)}
              />
            </IonItem>
            <IonItem>
              <IonIcon slot="start" icon={person} />
              <IonLabel position="stacked">Nombre</IonLabel>
              <IonInput value={name} onIonChange={(e) => setName(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonIcon slot="start" icon={mail} />
              <IonLabel position="stacked">Correo</IonLabel>
              <IonInput type="email" value={email} onIonChange={(e) => setEmail(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonIcon slot="start" icon={lockClosed} />
              <IonLabel position="stacked">Contraseña</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Rol</IonLabel>
              <IonSelect value={role} onIonChange={(e) => setRole(e.detail.value)}>
                <IonSelectOption value="adminGlobal">Administrador Global</IonSelectOption>
                <IonSelectOption value="admin">Administrador de Oficina</IonSelectOption>
                <IonSelectOption value="vigilante">Vigilante</IonSelectOption>
              </IonSelect>
            </IonItem>
            {(role === "admin" || role === "vigilante") && (
              <IonItem>
                <IonLabel position="stacked">Oficinas</IonLabel>
                <IonSelect
                  multiple
                  value={oficinasSeleccionadas}
                  onIonChange={(e) => setOficinasSeleccionadas(e.detail.value)}
                >
                  {oficinas.map((oficina) => (
                    <IonSelectOption key={oficina.id} value={oficina.id}>
                      {oficina.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            )}
            <IonButton expand="full" onClick={handleCrearUsuario}>
              Crear Usuario
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default CrearUsuarios;