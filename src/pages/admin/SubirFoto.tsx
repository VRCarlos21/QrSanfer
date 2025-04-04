import React, { useState } from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonMenuButton } from "@ionic/react";
import { storage } from "../../services/firebaseConfig";
import { ref, uploadBytes } from "firebase/storage";

const SubirFoto: React.FC = () => {
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [employeeNumberForPhoto, setEmployeeNumberForPhoto] = useState("");

    const handlePhotoUpload = async () => {
        if (!photoFile || !/^M\d+$/.test(employeeNumberForPhoto)) {
            alert("Por favor, selecciona una foto válida y un número de empleado válido.");
            return;
        }
        try {
            const folderPath = `fotos/${employeeNumberForPhoto}.jpg`;
            const storageRef = ref(storage, folderPath);
            await uploadBytes(storageRef, photoFile);
            alert("Foto subida exitosamente.");
            setPhotoFile(null);
            setEmployeeNumberForPhoto("");
        } catch (error) {
            console.error("Error al subir la foto:", error);
            alert("Hubo un error al subir la foto. Intenta de nuevo.");
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton />
                    </IonButtons>
                    <IonTitle>Subir Fotos</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <h3>Subir Foto de Empleado</h3>
                <IonItem>
                    <IonLabel position="stacked">Número de Empleado</IonLabel>
                    <IonInput
                        value={employeeNumberForPhoto}
                        onIonChange={(e) => setEmployeeNumberForPhoto(e.detail.value!)}
                        placeholder="Ejemplo: M12345"
                    />
                </IonItem>
                <IonItem>
                    <IonLabel position="stacked">Seleccionar Foto</IonLabel>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                </IonItem>
                <IonButton expand="full" onClick={handlePhotoUpload} disabled={!photoFile || !/^M\d+$/.test(employeeNumberForPhoto)}>
                    Subir Foto
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default SubirFoto;