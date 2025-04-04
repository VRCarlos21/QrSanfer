import React from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonButton } from "@ionic/react";
import { getAuth, sendEmailVerification } from "firebase/auth";

const VerifyEmail: React.FC = () => {
  const auth = getAuth();
  const user = auth.currentUser;

  const handleResendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        alert("Se ha enviado un nuevo correo de verificación.");
      } catch (error) {
        console.error("Error al reenviar el correo de verificación:", error);
        alert("Ocurrió un error al reenviar el correo de verificación.");
      }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Verificar Correo</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText>
          <h2>¡Gracias por registrarte!</h2>
          <p>Te hemos enviado un correo de verificación a tu dirección de correo electrónico.</p>
          <p>Por favor, revisa tu bandeja de entrada y sigue las instrucciones para verificar tu cuenta.</p>
          <p>Si no recibiste el correo, haz clic en el botón de abajo para reenviarlo.</p>
        </IonText>
        <IonButton expand="full" onClick={handleResendVerification}>
          Reenviar correo de verificación
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default VerifyEmail;