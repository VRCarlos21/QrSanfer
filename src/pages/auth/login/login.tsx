import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonLoading,
  IonAlert,
} from "@ionic/react";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useHistory } from "react-router-dom";
import { db } from "../../../services/firebaseConfig";


const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const history = useHistory();
  const auth = getAuth();

  // Validar campos antes de iniciar sesión
  const validateInputs = () => {
    if (!email.trim()) {
      setError("Por favor, ingresa un correo electrónico.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Por favor, ingresa un correo electrónico válido.");
      return false;
    }
    if (!password.trim()) {
      setError("Por favor, ingresa una contraseña.");
      return false;
    }
    return true;
  };

  // Manejar el inicio de sesión
  const handleLogin = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar si el email está verificado
      if (!user.emailVerified) {
        setError("Debes verificar tu correo antes de iniciar sesión.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      let userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError("No se encontraron datos del usuario en Firestore.");
        return;
      }

      const userData = userDoc.data();
      const role = userData?.role;
      const status = userData?.status || "active"; // Asumir "active" si no existe
      const oficinas = userData?.oficinas || []; // Obtener las oficinas (array)

      // Verificar si el usuario está inactivo
      if (status === "inactive") {
        setError("Tu cuenta está desactivada. Contacta al administrador.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      // Si el usuario no tiene oficina asignada y no ha elegido antes, redirigir a selección
      if (oficinas.length === 0 && !localStorage.getItem("oficinaElegida")) {
        history.push("/ElegirOficina");
        return;
      }

      // Guardar en localStorage que ya eligió oficina
      localStorage.setItem("oficinaElegida", "true");

      // Redirigir según el rol
      if (role === "admin") {
        history.push("/admin");
      } else if (role === "user") {
        history.push("/Home");
      } else if (role === "vigilante") {
        history.push("/UserPanel");
      } else if (role === "adminGlobal") {
        history.push("/adminGlobal");
      } else {
        setError("Rol no válido.");
      }
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error.message);
      if (error.code === "auth/user-not-found") {
        setError("El correo electrónico no está registrado.");
      } else if (error.code === "auth/wrong-password") {
        setError("La contraseña es incorrecta.");
      } else {
        setError("Ocurrió un error inesperado. Inténtalo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verificar si el email está verificado
        if (!user.emailVerified) {
          await signOut(auth);
          setError("Debes verificar tu correo antes de continuar.");
          return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;
          const status = userData.status || "active"; // Asumir "active" si no existe
          const oficina = userData.oficina; // Obtener la oficina del usuario

          // Verificar si el usuario está inactivo
          if (status === "inactive") {
            await signOut(auth);
            setError("Tu cuenta está desactivada. Contacta al administrador.");
            return;
          }

          // Si el usuario no tiene oficina asignada y no ha elegido antes, redirigir a selección
          if (!oficina && !localStorage.getItem("oficinaElegida")) {
            history.push("/ElegirOficina");
            return;
          }

          // Guardar en localStorage que ya eligió oficina
          localStorage.setItem("oficinaElegida", "true");

          // Redirigir según el rol
          if (role === "admin") {
            history.push("/admin");
          } else if (role === "user") {
            history.push("/Home");
          } else if (role === "vigilante") {
            history.push("/UserPanel");
          } else if (role === "adminGlobal") {
            history.push("/adminGlobal");
          }
        }
      }
    });

    return () => unsubscribe();
  }, [auth, history]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Iniciar Sesión</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Modal de carga */}
        <IonLoading isOpen={loading} message="Iniciando sesión..." />
        {/* Alerta de error */}
        <IonAlert
          isOpen={!!error}
          onDidDismiss={() => setError("")}
          header="Error"
          message={error}
          buttons={["OK"]}
        />
        {/* Formulario de inicio de sesión */}
        <IonItem>
          <IonLabel position="floating">Correo electrónico</IonLabel>
          <IonInput
            type="email"
            value={email}
            onIonChange={(e) => setEmail(e.detail.value!)}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="floating">Contraseña</IonLabel>
          <IonInput
            type="password"
            value={password}
            onIonChange={(e) => setPassword(e.detail.value!)}
          />
        </IonItem>
        <IonButton expand="full" onClick={handleLogin}>
          Iniciar Sesión
        </IonButton>
        <IonButton fill="clear" routerLink="/register">
          Crear una cuenta
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Login;
