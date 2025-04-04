import React, { useState, useEffect } from "react";
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem,
    IonLabel, IonImg, IonAlert, IonCard, IonCardContent, IonIcon, IonButtons,
    IonMenuButton, IonModal, IonToast, IonList, IonThumbnail, IonText
} from "@ionic/react";
import { pencilOutline, trashOutline, businessOutline, checkmarkCircle } from "ionicons/icons";
import { auth, db, storage } from "../../services/firebaseConfig";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import "../../global.css";
import { signOut } from "firebase/auth";

const Settings: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [oficinaInfo, setOficinaInfo] = useState<{ id: string; name: string }>({ id: "", name: "" });
    const [oficinas, setOficinas] = useState<{ id: string; name: string }[]>([]);
    const [showOficinasModal, setShowOficinasModal] = useState(false);
    const [selectedOficina, setSelectedOficina] = useState<{ id: string; name: string } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [descripcion, setDescripcion] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastColor, setToastColor] = useState("");
    const [tempDescripcion, setTempDescripcion] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Función para mostrar notificaciones
    const showToastMessage = (message: string, color: string = "success") => {
        setToastMessage(message);
        setToastColor(color);
        setShowToast(true);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            if (!auth.currentUser) return;
            const userRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                setUser(userData);

                const oficinaID = userData.oficinas ? userData.oficinas[0] : null;
                if (oficinaID) {
                    const oficinaRef = doc(db, "oficinas", oficinaID);
                    const oficinaSnap = await getDoc(oficinaRef);

                    if (oficinaSnap.exists()) {
                        setOficinaInfo({ id: oficinaID, name: oficinaSnap.data().name });
                    } else {
                        setOficinaInfo({ id: oficinaID, name: "Oficina no encontrada" });
                    }
                } else {
                    setOficinaInfo({ id: "", name: "No asignada" });
                }

                fetchPhoto(userData.employeeNumber);
            }
        };
        fetchUserData();

        const fetchOficinas = async () => {
            const oficinasRef = collection(db, "oficinas");
            const querySnapshot = await getDocs(oficinasRef);
            const oficinasList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
            }));
            setOficinas(oficinasList);
        };
        fetchOficinas();
    }, []);

    const fetchPhoto = async (employeeNumber: string) => {
        try {
            const url = await getDownloadURL(ref(storage, `fotos/${employeeNumber}.jpg`));
            setPhotoUrl(url);
        } catch (error) {
            console.error("No se encontró la foto", error);
        }
    };

    const handleSolicitudCambio = async (descripcion: string) => {
        if (!selectedOficina || !user || !oficinaInfo) return;

        console.log("Enviando solicitud con descripción:", descripcion); // Verificación en consola

        try {
            const solicitudRef = collection(db, "solicitudesCambioOficina");
            await addDoc(solicitudRef, {
                usuarioId: auth.currentUser?.uid,
                usuarioNombre: user.name || user.employeeNumber,
                numeroEmpleado: user.employeeNumber,
                oficinaActualId: oficinaInfo.id,
                oficinaActualNombre: oficinaInfo.name,
                oficinaSolicitadaId: selectedOficina.id,
                oficinaSolicitadaNombre: selectedOficina.name,
                descripcion: descripcion, // ✅ Descripción guardada correctamente
                estado: "pendiente",
                fecha: new Date().toISOString(),
            });

            showToastMessage(
                `✅ Solicitud de cambio de \nOficina: ${selectedOficina.name} enviada`,
                "success"
            ); console.log("Solicitud guardada en Firebase");

        } catch (error) {
            showToastMessage("❌ Error al enviar solicitud", "danger");
            console.error("Error al enviar solicitud:", error);
        } finally {
            setShowConfirm(false);
            setSelectedOficina(null);
            setDescripcion(""); // Limpiar después de enviar
        }
    };


    const handleDeleteAccount = async () => {
        if (!auth.currentUser) return;

        try {
            const userRef = doc(db, "users", auth.currentUser.uid);

            // Actualizar el estado de la cuenta a "inactive"
            await updateDoc(userRef, { status: "inactive" });

            // Cerrar sesión del usuario
            await signOut(auth);

            showToastMessage("Tu cuenta ha sido desactivada.", "warning");

        } catch (error) {
            showToastMessage("❌ Error al desactivar cuenta", "danger");
            console.error("Error al desactivar cuenta:", error);
        }
    };


    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton />
                    </IonButtons>
                    <IonTitle>Ajustes</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                {/* Notificación Toast */}
                <IonToast
                    isOpen={showToast}
                    onDidDismiss={() => setShowToast(false)}
                    message={toastMessage}
                    duration={3000}
                    position="top"
                    color={toastColor}
                    style={{
                        '--width': '90%',
                        '--max-width': '400px',
                        '--border-radius': '8px'
                    }}
                    icon={checkmarkCircle}
                />
                <IonCard className="ion-text-center user-card">
                    {photoUrl && <IonImg src={photoUrl} className="user-photo" />}
                    <IonCardContent>
                        <h2>{user?.employeeNumber}</h2>
                        <p>{user?.email}</p>
                        {/* Tarjeta para cambiar contraseña */}
                        <IonCard>
                            <IonCardContent>
                                <IonItem>
                                    <IonLabel>Cambiar Contraseña:</IonLabel>
                                    <IonButton fill="clear" routerLink="/CambiarPassword">
                                        <IonIcon icon={pencilOutline} />
                                    </IonButton>
                                </IonItem>
                            </IonCardContent>
                        </IonCard>
                        {/* Tarjeta para solicitar cambio de oficina */}
                        <IonCard>
                            <IonCardContent>
                                <IonItem>
                                    <IonLabel>
                                        Oficina Actual: {oficinaInfo.name}
                                    </IonLabel>
                                    <IonButton fill="clear" onClick={() => setShowOficinasModal(true)}>
                                        <IonIcon icon={pencilOutline} />
                                    </IonButton>
                                </IonItem>
                            </IonCardContent>
                        </IonCard>
                        {/* Modal mejorado para selección de oficina */}
                        <IonModal
                            isOpen={showOficinasModal}
                            onDidDismiss={() => setShowOficinasModal(false)}
                            className="custom-modal"
                        >
                            <IonHeader>
                                <IonToolbar>
                                    <IonTitle className="ion-text-center">Selecciona Oficina</IonTitle>
                                    <IonButtons slot="end">
                                        <IonButton
                                            onClick={() => setShowOficinasModal(false)}
                                            fill="clear"
                                            color="medium"
                                        >
                                            Cerrar
                                        </IonButton>
                                    </IonButtons>
                                </IonToolbar>
                            </IonHeader>
                            <IonContent className="ion-padding">
                                <IonList lines="none">
                                    {oficinas.map(oficina => (
                                        <IonItem
                                            key={oficina.id}
                                            button
                                            detail={false}
                                            onClick={() => {
                                                setSelectedOficina(oficina);
                                                setShowOficinasModal(false);
                                                setShowConfirm(true);
                                            }}
                                            className="office-item"
                                        >
                                            <IonThumbnail slot="start">
                                                <IonIcon
                                                    icon={businessOutline}
                                                    color="primary"
                                                    size="large"
                                                />
                                            </IonThumbnail>
                                            <IonLabel>
                                                <h2>{oficina.name}</h2>
                                                <p>ID: {oficina.id}</p>
                                            </IonLabel>
                                        </IonItem>
                                    ))}
                                </IonList>
                            </IonContent>
                        </IonModal>



                        {/* Alerta para confirmar cambio de oficina */}
                        <IonAlert
                            isOpen={showConfirm}
                            onDidDismiss={() => setShowConfirm(false)}
                            header="Confirmar Cambio de Oficina"
                            message={`¿Estás seguro de solicitar el cambio de oficina a ${selectedOficina?.name}?`}
                            inputs={[
                                {
                                    name: "descripcion",
                                    type: "text",
                                    placeholder: "Motivo del cambio (opcional)",
                                },
                            ]}
                            buttons={[
                                {
                                    text: "Cancelar",
                                    role: "cancel",
                                    handler: () => {
                                        console.log("Solicitud cancelada");
                                    }
                                },
                                {
                                    text: "Enviar Solicitud",
                                    handler: (data) => {
                                        setDescripcion(data.descripcion || ""); // Guardamos la descripción ingresada
                                        console.log("Descripción capturada:", data.descripcion); // Mostramos en consola

                                        // Enviamos la solicitud con la descripción ingresada
                                        handleSolicitudCambio(data.descripcion || "");
                                    },
                                },
                            ]}
                        />

                        {/* Tarjeta para eliminar cuenta */}
                        <IonCard color="danger">
                            <IonCardContent>
                                <IonItem color="danger">
                                    <IonLabel>Eliminar Cuenta</IonLabel>
                                    <IonButton
                                        fill="clear"
                                        color="light"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        <IonIcon icon={trashOutline} /> Eliminar
                                    </IonButton>
                                </IonItem>
                            </IonCardContent>
                        </IonCard>

                        {/* Alerta de confirmación */}
                        <IonAlert
                            isOpen={showDeleteConfirm}
                            onDidDismiss={() => setShowDeleteConfirm(false)}
                            header="Confirmar Eliminación"
                            message="¿Estás seguro de que deseas eliminar tu cuenta? Esta acción desactivará tu cuenta y no podrás volver a ingresar."
                            buttons={[
                                {
                                    text: "Cancelar",
                                    role: "cancel",
                                },
                                {
                                    text: "Sí, eliminar",
                                    handler: () => handleDeleteAccount(),
                                },
                            ]}
                        />
                    </IonCardContent>
                </IonCard>
            </IonContent>
        </IonPage>
    );
};

export default Settings;