import React, { useEffect, useState } from "react";
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonLoading,
    IonAccordionGroup,
    IonAccordion,
    IonButtons,
    IonMenuButton,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonPopover,
} from "@ionic/react";
import { filterOutline } from "ionicons/icons";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

const SeguimientoSolicitud: React.FC = () => {
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [filteredSolicitudes, setFilteredSolicitudes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState<string>("");
    const [ordenFecha, setOrdenFecha] = useState<string>("reciente");
    const [showFilters, setShowFilters] = useState(false);

    const auth = getAuth();
    const user = auth.currentUser;

    useEffect(() => {
        const fetchSolicitudes = async () => {
            if (!user) return;

            try {
                const q = query(collection(db, "requests"), where("email", "==", user.email));
                const querySnapshot = await getDocs(q);
                const solicitudesData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setSolicitudes(solicitudesData);
                setFilteredSolicitudes(solicitudesData);
            } catch (error) {
                console.error("Error obteniendo solicitudes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSolicitudes();
    }, [user]);

    // Aplicar filtros
    useEffect(() => {
        let solicitudesFiltradas = [...solicitudes];

        if (filtroEstado) {
            solicitudesFiltradas = solicitudesFiltradas.filter(s => s.status?.toLowerCase() === filtroEstado);
        }

        solicitudesFiltradas.sort((a, b) => {
            const fechaA = a.createdAt?.seconds || 0;
            const fechaB = b.createdAt?.seconds || 0;
            return ordenFecha === "reciente" ? fechaB - fechaA : fechaA - fechaB;
        });

        setFilteredSolicitudes(solicitudesFiltradas);
    }, [filtroEstado, ordenFecha, solicitudes]);

    // Función para obtener color del estado
    const getEstadoBadge = (estado: string) => {
        switch (estado?.toLowerCase()) {
            case "pendiente": return "warning";
            case "aprobado": return "success";
            case "rechazado": return "danger";
            default: return "medium";
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton />
                    </IonButtons>
                    <IonTitle>Seguimiento de Solicitud</IonTitle>
                    <IonButtons slot="end">
                        <IonButton id="filtros-popover">
                            <IonIcon icon={filterOutline} />
                        </IonButton>
                        <IonPopover
                            trigger="filtros-popover"
                            isOpen={showFilters}
                            onDidDismiss={() => setShowFilters(false)}
                        >
                            <IonContent className="ion-padding">
                                <IonItem>
                                    <IonLabel>Estado</IonLabel>
                                    <IonSelect value={filtroEstado} onIonChange={(e) => setFiltroEstado(e.detail.value)}>
                                        <IonSelectOption value="">Todos</IonSelectOption>
                                        <IonSelectOption value="pendiente">Pendiente</IonSelectOption>
                                        <IonSelectOption value="aprobado">Aprobado</IonSelectOption>
                                        <IonSelectOption value="rechazado">Rechazado</IonSelectOption>
                                    </IonSelect>
                                </IonItem>
                                <IonItem>
                                    <IonLabel>Orden</IonLabel>
                                    <IonSelect value={ordenFecha} onIonChange={(e) => setOrdenFecha(e.detail.value)}>
                                        <IonSelectOption value="reciente">Más recientes</IonSelectOption>
                                        <IonSelectOption value="antiguo">Más antiguos</IonSelectOption>
                                    </IonSelect>
                                </IonItem>
                            </IonContent>
                        </IonPopover>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {loading && <IonLoading isOpen={loading} message="Cargando solicitudes..." />}

                {filteredSolicitudes.length === 0 ? (
                    <p>No has realizado ninguna solicitud.</p>
                ) : (
                    <IonList>
                        <IonAccordionGroup>
                            {filteredSolicitudes.map((solicitud) => {
                                const estado = solicitud.status || "desconocido";
                                const fechaCreacion = solicitud.createdAt
                                    ? new Date(solicitud.createdAt.seconds * 1000).toLocaleDateString()
                                    : "Sin fecha";

                                return (
                                    <IonAccordion key={solicitud.id}>
                                        <IonItem slot="header">
                                            <IonLabel>
                                                <h2>Solicitud - {fechaCreacion}</h2>
                                            </IonLabel>
                                            <IonBadge color={getEstadoBadge(estado)} slot="start">
                                                {estado.toUpperCase()}
                                            </IonBadge>
                                        </IonItem>
                                        <div slot="content">
                                            <IonItem>
                                                <IonLabel>
                                                    <h3>Detalles</h3>
                                                    <p>Número de empleado: {solicitud.employeeNumber}</p>
                                                    <p>Nombre: {solicitud.name}</p>
                                                    <p>Correo: {solicitud.email}</p>
                                                    <p>Estado: {estado}</p>
                                                    <p>PDF: <a href={solicitud.pdfUrl} target="_blank" rel="noopener noreferrer">Ver PDF</a></p>
                                                </IonLabel>
                                            </IonItem>
                                        </div>
                                    </IonAccordion>
                                );
                            })}
                        </IonAccordionGroup>
                    </IonList>
                )}
            </IonContent>
        </IonPage>
    );
};

export default SeguimientoSolicitud;
