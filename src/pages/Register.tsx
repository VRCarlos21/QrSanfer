import React, { useState } from "react";
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
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useHistory } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebaseConfig";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const history = useHistory();
  const auth = getAuth();

  // Dominios permitidos
  const allowedDomains = ["grupoidisa.com", "gmail.com", "empresa3.com"];

  // Validaciones antes de registrar
  const validateInputs = () => {
    if (!name.trim()) {
      setError("Por favor, ingresa tu nombre completo.");
      return false;
    }

    if (!email.trim()) {
      setError("Por favor, ingresa un correo electrónico.");
      return false;
    }

    const emailDomain = email.split("@")[1];
    if (!allowedDomains.includes(emailDomain)) {
      setError(`Solo se permiten correos de los siguientes dominios: ${allowedDomains.join(", ")}`);
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

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return false;
    }

    if (!/^M\d+$/.test(employeeNumber)) {
      setError("El número de empleado debe comenzar con 'M' seguido de solo números.");
      return false;
    }

    return true;
  };

  // Registrar usuario
  const handleRegister = async () => {
    if (!validateInputs()) return;
    setLoading(true);

    try {
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Enviar correo de verificación
      await sendEmailVerification(user);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Guardar usuario en Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        name: name.trim(),
        role: "user",
        employeeNumber: employeeNumber,
        status: "active",
        createdAt: new Date().toISOString(),
        oficina: null,  // Oficina nula al inicio
      });

      // Redirigir a pantalla de verificación
      history.push("/verify-email");
    } catch (error: any) {
      console.error("Error al registrar:", error.message);
      if (error.code === "auth/email-already-in-use") {
        setError("El correo electrónico ya está registrado.");
      } else if (error.code === "auth/weak-password") {
        setError("La contraseña es demasiado débil.");
      } else {
        setError("Ocurrió un error inesperado. Inténtalo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Registro</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Modal de carga */}
        <IonLoading isOpen={loading} message="Registrando usuario..." />

        {/* Alerta de error */}
        <IonAlert
          isOpen={!!error}
          onDidDismiss={() => setError("")}
          header="Error"
          message={error}
          buttons={["OK"]}
        />


        <IonItem>
          <IonLabel position="floating">Número de Empleado</IonLabel>
          <IonInput
            type="text"
            value={employeeNumber}
            onIonChange={(e) => setEmployeeNumber(e.detail.value!)}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="floating">Nombre completo</IonLabel>
          <IonInput
            type="text"
            value={name}
            onIonChange={(e) => setName(e.detail.value!)}
          />
        </IonItem>



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

        <IonItem>
          <IonLabel position="floating">Confirmar Contraseña</IonLabel>
          <IonInput
            type="password"
            value={confirmPassword}
            onIonChange={(e) => setConfirmPassword(e.detail.value!)}
          />
        </IonItem>

        <IonButton expand="full" onClick={handleRegister}>
          Registrar
        </IonButton>

        <IonButton fill="clear" routerLink="/login">
          Ya tengo una cuenta
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Register;
