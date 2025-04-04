import React from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from "@ionic/react";
import { useHistory } from "react-router-dom";

const Unauthorized: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Acceso No Autorizado</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h1>No tienes permiso para acceder a esta página.</h1>
        <IonButton expand="full" onClick={() => history.push("/login")}>
          Volver al Inicio
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Unauthorized;