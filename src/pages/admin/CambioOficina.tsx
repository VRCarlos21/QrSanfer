import React, { useEffect, useState } from "react";
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonButton, IonButtons, IonMenuButton, IonAlert,
} from "@ionic/react";
import { db } from "../../services/firebaseConfig";
import { collection, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDoc } from "firebase/firestore";


interface SolicitudCambioOficina {
    id: string;
    usuarioId: string;
    usuarioNombre: string;
    oficinaActualId: string;
    oficinaActualNombre: string;
    oficinaSolicitadaId: string;
    oficinaSolicitadaNombre: string;
    descripcion: string;
    estado: string;
    fecha: string;
}

const CambioOficina: React.FC = () => {
    const [solicitudes, setSolicitudes] = useState<SolicitudCambioOficina[]>([]);
    const [showAlert, setShowAlert] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudCambioOficina | null>(null);
    const [actionType, setActionType] = useState<"aprobar" | "rechazar" | null>(null);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [adminInfo, setAdminInfo] = useState<{ id: string; email: string; employeeNumber: string } | null>(null);


    const registrarCambioOficina = async (
        usuarioId: string,
        usuarioNombre: string,
        oficinaActual: string,
        oficinaNueva: string,
        accion: "aprobado" | "rechazado",
        adminId: string,
        adminEmail: string,
        adminEmployeeNumber: string
    ) => {
        try {
            await addDoc(collection(db, "logs"), {
                tipo: `Cambio de oficina ${accion}`,
                descripcion: `Solicitud de cambio de ${oficinaActual} a ${oficinaNueva} ${accion}`,
                performedBy: {
                    id: adminId,
                    correo: adminEmail,
                    numeroEmpleado: adminEmployeeNumber
                },
                userAffected: {
                    id: usuarioId,
                    name: usuarioNombre,
                    status: "active"
                },
                changes: [
                    {
                        field: "Oficina",
                        oldValue: oficinaActual,
                        newValue: accion === "aprobado" ? oficinaNueva : oficinaActual
                    }
                ],
                timestamp: new Date().getTime()
            });

            console.log("✅ Registro guardado en 'logs'.");

        } catch (error) {
            console.error("❌ Error al registrar cambio de oficina:", error);
        }
    };


    useEffect(() => {
        const fetchSolicitudes = async () => {
            console.log("🔍 Obteniendo solicitudes de cambio de oficina...");
            const solicitudesRef = collection(db, "solicitudesCambioOficina");
            const querySnapshot = await getDocs(solicitudesRef);
            const solicitudesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as SolicitudCambioOficina[];
            console.log("📌 Solicitudes obtenidas:", solicitudesData);
            setSolicitudes(solicitudesData.filter(s => s.estado === "pendiente"));
        };
        fetchSolicitudes();
    }, []);


    useEffect(() => {
        const fetchAdminInfo = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                const adminRef = doc(db, "users", user.uid);
                const adminSnap = await getDoc(adminRef);
                if (adminSnap.exists()) {
                    setAdminInfo({
                        id: user.uid,
                        email: adminSnap.data().email,
                        employeeNumber: adminSnap.data().employeeNumber || "N/A"
                    });
                }
            }
        };
        fetchAdminInfo();
    }, []);

    const registrarEnHistorial = async (
        usuarioId: string,
        accion: string,
        detalles: string,
        tipo: string = "cambio_oficina"
    ) => {
        try {
            await addDoc(collection(db, "historialActividades"), {
                usuarioId,
                accion,
                detalles,
                tipo,
                fecha: new Date().toISOString(),
                leido: false
            });
        } catch (error) {
            console.error("Error al registrar en historial:", error);
        }
    };

    // Modifica las funciones handleAprobar y handleRechazar
    const handleAprobar = async (solicitud: SolicitudCambioOficina) => {
        try {
            // 1. Actualizar estado de la solicitud
            const solicitudRef = doc(db, "solicitudesCambioOficina", solicitud.id);
            await updateDoc(solicitudRef, {
                estado: "aprobada",
                fechaRespuesta: new Date().toISOString()
            });

            // 2. Actualizar oficina del usuario
            const userRef = doc(db, "users", solicitud.usuarioId);
            await updateDoc(userRef, {
                oficinas: [solicitud.oficinaSolicitadaId],
                oficinaActual: solicitud.oficinaSolicitadaNombre
            });

            // 3. Registrar en historial
            await registrarCambioOficina(
                solicitud.usuarioId,
                solicitud.usuarioNombre,
                solicitud.oficinaActualNombre,
                solicitud.oficinaSolicitadaNombre,
                'aprobado',
                adminInfo?.id || "Desconocido",
                adminInfo?.email || "Desconocido",
                adminInfo?.employeeNumber || "N/A"
            );

            // 4. Actualizar UI
            setSolicitudes(solicitudes.filter(s => s.id !== solicitud.id));
            setAlertMessage(`✅ ${solicitud.usuarioNombre} transferido a ${solicitud.oficinaSolicitadaNombre}`);
            setShowSuccessAlert(true);
        } catch (error) {
            console.error("Error al aprobar:", error);
            setAlertMessage("❌ Error al procesar la solicitud");
            setShowSuccessAlert(true);
        }
    };

    const handleRechazar = async (solicitud: SolicitudCambioOficina) => {
        try {
            // 1. Actualizar estado de la solicitud
            const solicitudRef = doc(db, "solicitudesCambioOficina", solicitud.id);
            await updateDoc(solicitudRef, {
                estado: "rechazada",
                fechaRespuesta: new Date().toISOString()
            });

            // 2. Registrar en historial
            await registrarCambioOficina(
                solicitud.usuarioId,
                solicitud.usuarioNombre,
                solicitud.oficinaActualNombre,
                solicitud.oficinaSolicitadaNombre,
                "rechazado",
                adminInfo?.id || "Desconocido",
                adminInfo?.email || "Desconocido",
                adminInfo?.employeeNumber || "N/A"
            );

            // 3. Actualizar UI
            setSolicitudes(solicitudes.filter(s => s.id !== solicitud.id));
            setAlertMessage(`❌ Solicitud de ${solicitud.usuarioNombre} rechazada`);
            setShowSuccessAlert(true);
        } catch (error) {
            console.error("Error al rechazar:", error);
            setAlertMessage("❌ Error al procesar la solicitud");
            setShowSuccessAlert(true);
        }
    };


    const confirmAction = (solicitud: SolicitudCambioOficina, action: "aprobar" | "rechazar") => {
        setSelectedSolicitud(solicitud);
        setActionType(action);
        setShowAlert(true);
    };

    const handleConfirm = () => {
        if (selectedSolicitud && actionType) {
            if (actionType === "aprobar") {
                handleAprobar(selectedSolicitud);
            } else {
                handleRechazar(selectedSolicitud);
            }
        }
        setShowAlert(false);
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton />
                    </IonButtons>
                    <IonTitle>Solicitudes de Cambio de Oficina</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <h3>Solicitudes Pendientes</h3>
                {solicitudes.length === 0 ? (
                    <IonItem>
                        <IonLabel>No hay solicitudes pendientes</IonLabel>
                    </IonItem>
                ) : (
                    <IonList>
                        {solicitudes.map(solicitud => (
                            <IonItem key={solicitud.id}>
                                <IonLabel>
                                    <h2>{solicitud.usuarioNombre}</h2>
                                    <p>Oficina Actual: {solicitud.oficinaActualNombre}</p>
                                    <p>Oficina Solicitada: {solicitud.oficinaSolicitadaNombre}</p>
                                    <p>Descripción: {solicitud.descripcion}</p>
                                    <p>Fecha: {new Date(solicitud.fecha).toLocaleString()}</p>
                                </IonLabel>
                                <IonButton color="success" onClick={() => confirmAction(solicitud, "aprobar")}>
                                    Aprobar
                                </IonButton>
                                <IonButton color="danger" onClick={() => confirmAction(solicitud, "rechazar")}>
                                    Rechazar
                                </IonButton>
                            </IonItem>
                        ))}
                    </IonList>
                )}

                <IonAlert
                    isOpen={showAlert}
                    onDidDismiss={() => setShowAlert(false)}
                    header="Confirmar"
                    message={`¿Estás seguro de ${actionType === "aprobar" ? "aprobar" : "rechazar"} esta solicitud?`}
                    buttons={[
                        { text: "Cancelar", role: "cancel" },
                        { text: "Confirmar", handler: handleConfirm },
                    ]}
                />

                <IonAlert
                    isOpen={showSuccessAlert}
                    onDidDismiss={() => setShowSuccessAlert(false)}
                    header="Operación completada"
                    message={alertMessage}
                    buttons={["OK"]}
                />
            </IonContent>
        </IonPage>
    );
};

export default CambioOficina;