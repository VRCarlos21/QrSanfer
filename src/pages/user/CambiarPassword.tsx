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
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import "../../global.css"; 

const CambiarPassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const history = useHistory();
  const auth = getAuth();

  // Manejar cambio de contraseña
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Usuario no autenticado.");

      // Reautenticación con la contraseña actual
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Actualizar contraseña en Firebase
      await updatePassword(user, newPassword);
      setMessage("Tu contraseña ha sido cambiada con éxito.");
    } catch (error: any) {
      console.error("Error al cambiar la contraseña:", error.message);
      if (error.code === "auth/wrong-password") {
        setError("La contraseña actual es incorrecta.");
      } else {
        setError("No se pudo cambiar la contraseña. Inténtalo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Cambiar Contraseña</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonLoading isOpen={loading} message="Cambiando contraseña..." />
        
        {/* Mensajes de error y éxito */}
        <IonAlert isOpen={!!error} onDidDismiss={() => setError("")} header="Error" message={error} buttons={["OK"]} />
        <IonAlert isOpen={!!message} onDidDismiss={() => {setMessage(""); history.push("/home"); }} header="Éxito" message={message}buttons={["OK"]}/>
        {/* Formulario para cambiar contraseña */}
        <IonItem>
          <IonLabel position="floating">Contraseña actual</IonLabel>
          <IonInput type="password" value={currentPassword} onIonChange={(e) => setCurrentPassword(e.detail.value!)} />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Nueva contraseña</IonLabel>
          <IonInput type="password" value={newPassword} onIonChange={(e) => setNewPassword(e.detail.value!)} />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Confirmar nueva contraseña</IonLabel>
          <IonInput type="password" value={confirmNewPassword} onIonChange={(e) => setConfirmNewPassword(e.detail.value!)} />
        </IonItem>

        <IonButton expand="full" onClick={handleChangePassword} style={{ marginTop: "20px" }}>
          Cambiar Contraseña
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default CambiarPassword;
