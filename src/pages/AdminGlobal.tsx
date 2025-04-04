import React, { useState, useEffect, useRef } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonModal,
    IonCheckbox,
    IonLoading
} from "@ionic/react";
import { person, shield, business, statsChart, documentText, download } from "ionicons/icons";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Reporte {
    totalUsers: number;
    totalVigilantes: number;
    totalAdministradores: number;
    totalAdminGlobales: number;
    totalOficinasActivas: number;
    oficinasCreadas: number;
    oficinasEliminadas: number;
    totalRequests: number;
    ultimosUsuariosCreados: any[];
    oficinasLista: any[];
    registrosRecientes: any[];
    
}

const ReportesAdminGlobal: React.FC = () => {
    const [reporte, setReporte] = useState<Reporte>({
        totalUsers: 0,
        totalVigilantes: 0,
        totalAdministradores: 0,
        totalAdminGlobales: 0,
        totalOficinasActivas: 0,
        oficinasCreadas: 0,
        oficinasEliminadas: 0,
        totalRequests: 0,
        ultimosUsuariosCreados: [],
        oficinasLista: [],
        registrosRecientes: [],
    });

    const [loading, setLoading] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [fechaInicio, setFechaInicio] = useState<string>("");
    const [fechaFin, setFechaFin] = useState<string>("");
    const reportRef = useRef(null);

    const [selectedCards, setSelectedCards] = useState({
        resumenGeneral: true,
        detalleUsuarios: true,
        estadisticasOficinas: true,
        ultimosRegistros: true,
        actividadReciente: false,
        oficinasLista: true,
        registrosRecientes: true
    });

    const safeGet = (obj: any, path: string, defaultValue = "Sin dato") => {
        try {
            return path.split('.').reduce((o, p) => o?.[p], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    };

    useEffect(() => {
        obtenerDatosReporte();
    }, []);

    const obtenerDatosReporte = async () => {
        try {
            setLoading(true);

            // Obtener usuarios
            const usuariosRef = collection(db, "users");
            const qUsuarios = query(usuariosRef);
            const usuariosSnapshot = await getDocs(qUsuarios);

            let totalUsers = 0, totalVigilantes = 0, totalAdministradores = 0, totalAdminGlobales = 0;

            usuariosSnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData.role === "user") totalUsers++;
                if (userData.role === "vigilante") totalVigilantes++;
                if (userData.role === "administrador") totalAdministradores++;
                if (userData.role === "adminGlobal") totalAdminGlobales++;
            });

            // Obtener oficinas
            const oficinasRef = collection(db, "oficinas");
            const oficinasSnapshot = await getDocs(oficinasRef);
            const totalOficinasActivas = oficinasSnapshot.size;

            // Obtener logs
            const logsRef = collection(db, "logs");
            const logsSnapshot = await getDocs(logsRef);
            const historialActividad = logsSnapshot.docs.map((doc) => doc.data());

            // Obtener requests
            const requestsRef = collection(db, "requests");
            const requestsSnapshot = await getDocs(requestsRef);
            const totalRequests = requestsSnapshot.size;

            // Obtener últimos usuarios
            const qUltimosUsuarios = query(usuariosRef, orderBy("createdAt", "desc"), limit(5));
            const ultimosUsuariosSnapshot = await getDocs(qUltimosUsuarios);
            const ultimosUsuariosCreados = ultimosUsuariosSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Obtener lista completa de oficinas
            const oficinasLista = oficinasSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                descripcion: doc.data().descripcion,
                creador: doc.data().creador,
                creadorNombre: doc.data().creadorNombre,
                creadorCorreo: doc.data().creadorCorreo,
                creadoEn: doc.data().creadoEn
            }));
            const registrosRecientes = (await getDocs(query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(10)))).docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const registrosRef = collection(db, "registros");
            const qRegistros = query(registrosRef, orderBy("fecha", "desc"), limit(10));
            const registrosSnapshot = await getDocs(qRegistros);


            setReporte({
                totalUsers,
                totalVigilantes,
                totalAdministradores,
                totalAdminGlobales,
                totalOficinasActivas,
                oficinasCreadas: historialActividad.filter((log) => log.accion === "Oficina creada").length,
                oficinasEliminadas: historialActividad.filter((log) => log.accion === "Oficina Eliminada").length,
                totalRequests,
                ultimosUsuariosCreados,
                oficinasLista,  // Quita los arrays vacíos y usa las variables que ya obtuviste
                registrosRecientes  // Quita los arrays vacíos y usa las variables que ya obtuviste
            });

            setLoading(false);
        } catch (error) {
            console.error("Error al obtener datos:", error);
            setLoading(false);
        }
    };

    const toggleCardSelection = (cardKey: keyof typeof selectedCards) => {
        setSelectedCards(prev => ({
            ...prev,
            [cardKey]: !prev[cardKey]
        }));
    };

    const generarPDF = () => {
        setShowModal(true);
    };

    const generarReporteCompleto = () => {
        setSelectedCards({
            resumenGeneral: true,
            detalleUsuarios: true,
            estadisticasOficinas: true,
            ultimosRegistros: true,
            actividadReciente: true,
            oficinasLista: true,
            registrosRecientes: true
        });
        confirmarGenerarPDF();
    };

    const confirmarGenerarPDF = async () => {
        setShowModal(false);
        const doc = new jsPDF();

        // Configuración inicial
        doc.setProperties({
            title: `Reporte AdminGlobal - ${new Date().toLocaleDateString()}`,
            subject: 'Reporte del sistema',
            author: 'Sistema de Control',
        });

        // Variables para control de posición
        let startY = 40;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        const tableMargin = 10;

        // 1. Encabezado del documento
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text("Reporte Administrativo - Sistema de Control", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" });

        // Función mejorada para añadir tablas
        const addTableSection = (title: string, head: string[][], body: any[][]) => {
            // Verificar si necesitamos nueva página
            if (startY > pageHeight - 50) {
                doc.addPage();
                startY = 20;
            }

            // Añadir título de sección
            doc.setFontSize(14);
            doc.setTextColor(30, 80, 150);
            doc.text(title, 14, startY);
            startY += 10;

            // Añadir tabla
            autoTable(doc, {
                startY: startY,
                head: head,
                body: body,
                theme: "grid",
                headStyles: { fillColor: [30, 80, 150] },
                margin: { top: tableMargin }
            });

            // Calcular nueva posición (estimación)
            const estimatedTableHeight = 10 + (body.length * 8);
            startY += estimatedTableHeight + margin;
        };

        // 2. Resumen Ejecutivo
        if (selectedCards.resumenGeneral) {
            const totalUsuarios = reporte.totalUsers + reporte.totalVigilantes +
                reporte.totalAdministradores + reporte.totalAdminGlobales;

            addTableSection("RESUMEN ",
                [["Métrica", "Total"]],
                [
                    ["Total Usuarios", totalUsuarios],
                    ["Vigilantes", reporte.totalVigilantes],
                    ["Administradores", reporte.totalAdministradores],
                    ["Admin Globales", reporte.totalAdminGlobales],
                    ["Oficinas Activas", reporte.totalOficinasActivas],
                    ["Solicitudes Totales", reporte.totalRequests]
                ]
            );
        }

        // 3. Detalle de Usuarios
        if (selectedCards.detalleUsuarios) {
            const totalUsuarios = reporte.totalUsers + reporte.totalVigilantes +
                reporte.totalAdministradores + reporte.totalAdminGlobales;

            addTableSection("DISTRIBUCIÓN DE USUARIOS",
                [["Tipo de Usuario", "Cantidad", "Porcentaje"]],
                [
                    ["Usuarios Normales", reporte.totalUsers, `${((reporte.totalUsers / totalUsuarios) * 100).toFixed(1)}%`],
                    ["Vigilantes", reporte.totalVigilantes, `${((reporte.totalVigilantes / totalUsuarios) * 100).toFixed(1)}%`],
                    ["Administradores", reporte.totalAdministradores, `${((reporte.totalAdministradores / totalUsuarios) * 100).toFixed(1)}%`],
                    ["Admin Globales", reporte.totalAdminGlobales, `${((reporte.totalAdminGlobales / totalUsuarios) * 100).toFixed(1)}%`]
                ]
            );
        }

        // 4. Estadísticas de Oficinas
        if (selectedCards.estadisticasOficinas) {
            addTableSection("ESTADÍSTICAS DE OFICINAS",
                [["Métrica", "Valor"]],
                [
                    ["Total Oficinas", reporte.totalOficinasActivas],
                    ["Oficinas Creadas", reporte.oficinasCreadas],
                    ["Oficinas Eliminadas", reporte.oficinasEliminadas],
                    ["Tasa de Crecimiento", `${((reporte.oficinasCreadas - reporte.oficinasEliminadas) / reporte.totalOficinasActivas * 100).toFixed(1)}%`]
                ]
            );
        }

        // 5. Últimos Registros (Usuarios)
        if (selectedCards.ultimosRegistros && reporte.ultimosUsuariosCreados.length > 0) {
            if (startY > pageHeight - 100) { // Verificar espacio suficiente
                doc.addPage();
                startY = 20;
            }

            // Título con espacio adicional
            doc.setFontSize(14);
            doc.setTextColor(30, 80, 150);
            doc.text("ÚLTIMOS USUARIOS REGISTRADOS", 14, startY);
            startY += 15; // Espacio después del título

            const usuariosTable = reporte.ultimosUsuariosCreados.map(user => [
                safeGet(user, 'name', 'Sin nombre'),
                safeGet(user, 'email', 'Sin email'),
                safeGet(user, 'role', 'Sin rol'),
                user.createdAt?.toDate?.().toLocaleDateString() || new Date(user.createdAt).toLocaleDateString() || "Sin fecha"
            ]);

            autoTable(doc, {
                startY: startY,
                head: [["Nombre", "Email", "Rol", "Fecha"]],
                body: usuariosTable,
                theme: "grid",
                headStyles: { fillColor: [30, 80, 150] },
                margin: { top: 5, bottom: 15 } // Margen inferior aumentado
            });

            startY += (usuariosTable.length * 10) + 25; 
        }

        // 6. Listado de Oficinas
        if (selectedCards.oficinasLista && reporte.oficinasLista.length > 0) {
            if (startY > pageHeight - 100) { // Deja más espacio para la tabla
                doc.addPage();
                startY = 20;
            }

            // Título con espacio adicional
            doc.setFontSize(14);
            doc.setTextColor(30, 80, 150);
            doc.text("LISTADO DE OFICINAS", 14, startY);
            startY += 15; // Espacio después del título (aumentado de 10 a 15)

            const oficinasTable = reporte.oficinasLista.map(oficina => [
                safeGet(oficina, 'name', 'Sin nombre'),
                safeGet(oficina, 'descripcion', 'Sin descripción'),
                safeGet(oficina, 'creadorNombre', 'Sin creador'),
                safeGet(oficina, 'creadorCorreo', 'Sin correo'),
                oficina.creadoEn?.toDate?.().toLocaleDateString() || "Sin fecha"
            ]);

            autoTable(doc, {
                startY: startY,
                head: [["Nombre", "Descripción", "Creador", "Correo", "Fecha Creación"]],
                body: oficinasTable,
                theme: "grid",
                headStyles: { fillColor: [30, 80, 150] },
                columnStyles: {
                    1: { cellWidth: 'wrap' },
                    3: { cellWidth: 'auto' }
                },
                styles: { fontSize: 8 },
                margin: { top: 5, bottom: 15 } // Margen inferior aumentado
            });

            startY += (oficinasTable.length * 10) + 25; // Espacio estimado (10px por fila + 25px extra)
        }

        // 7. Registros Recientes
        if (selectedCards.registrosRecientes && reporte.registrosRecientes.length > 0) {
            if (startY > pageHeight - 100) { 
                doc.addPage();
                startY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(30, 80, 150);
            doc.text("REGISTROS RECIENTES", 14, startY);
            startY += 15; 

            const registrosTable = reporte.registrosRecientes.map(registro => [
                safeGet(registro, 'tipo', 'Sin tipo'),
                safeGet(registro, 'performedBy.correo', 'Anónimo'),
                safeGet(registro, 'descripcion', 'Sin detalles'),
                registro.timestamp?.toDate?.().toLocaleString() || "Sin fecha",
            ]);

            autoTable(doc, {
                startY: startY,
                head: [["Tipo", "Usuario", "Descripción", "Fecha"]],
                body: registrosTable,
                theme: "grid",
                headStyles: { fillColor: [30, 80, 150] },
                columnStyles: {
                    2: { cellWidth: 'wrap' } 
                },
                styles: { fontSize: 8 },
                margin: { top: 5, bottom: 15 } // Margen inferior aumentado
            });

            startY += (registrosTable.length * 10) + 25; // Espacio estimado (10px por fila + 25px extra)
        }
        // Pie de página en todas las páginas
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text("© Sistema de Control - Reporte generado automáticamente",
                105, doc.internal.pageSize.height - 10,
                { align: "center" });
        }

        doc.save(`reporte_admin_${new Date().toISOString().split('T')[0]}.pdf`);
    };


    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton />
                    </IonButtons>
                    <IonTitle>Reportes del Sistema</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={generarPDF}>
                            <IonIcon slot="start" icon={documentText} />
                            Generar PDF
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding" ref={reportRef}>
                <IonLoading isOpen={loading} message="Cargando reportes..." />

                <IonGrid className="reportes-grid">
                    {/* Resumen de Cuentas */}
                    <IonRow>
                        <IonCol size="12" sizeMd="6" sizeLg="3">
                            <IonCard className="reporte-card">
                                <IonCardContent>
                                    <IonIcon icon={person} className="icono-reporte" />
                                    <IonText>
                                        <h3>Usuarios</h3>
                                        <p>{reporte.totalUsers}</p>
                                    </IonText>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                        <IonCol size="12" sizeMd="6" sizeLg="3">
                            <IonCard className="reporte-card">
                                <IonCardContent>
                                    <IonIcon icon={shield} className="icono-reporte" />
                                    <IonText>
                                        <h3>Vigilantes</h3>
                                        <p>{reporte.totalVigilantes}</p>
                                    </IonText>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                        <IonCol size="12" sizeMd="6" sizeLg="3">
                            <IonCard className="reporte-card">
                                <IonCardContent>
                                    <IonIcon icon={shield} className="icono-reporte" />
                                    <IonText>
                                        <h3>Administradores</h3>
                                        <p>{reporte.totalAdministradores}</p>
                                    </IonText>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                        <IonCol size="12" sizeMd="6" sizeLg="3">
                            <IonCard className="reporte-card">
                                <IonCardContent>
                                    <IonIcon icon={shield} className="icono-reporte" />
                                    <IonText>
                                        <h3>Admin Globales</h3>
                                        <p>{reporte.totalAdminGlobales}</p>
                                    </IonText>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>

                    {/* Oficinas y Requests */}
                    <IonRow>
                        <IonCol size="12" sizeMd="6">
                            <IonCard className="reporte-card">
                                <IonCardContent>
                                    <IonIcon icon={business} className="icono-reporte" />
                                    <IonText>
                                        <h3>Oficinas Activas</h3>
                                        <p>{reporte.totalOficinasActivas}</p>
                                    </IonText>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                        <IonCol size="12" sizeMd="6">
                            <IonCard className="reporte-card">
                                <IonCardContent>
                                    <IonIcon icon={statsChart} className="icono-reporte" />
                                    <IonText>
                                        <h3>Total de Requests</h3>
                                        <p>{reporte.totalRequests}</p>
                                    </IonText>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>

                    {/* Últimos Usuarios Creados */}
                    <IonRow>
                        <IonCol size="12">
                            <IonCard className="historial-card">
                                <IonCardContent>
                                    <IonText>
                                        <h2>
                                            <IonIcon icon={person} className="icono-reporte" /> Últimos Usuarios Creados
                                        </h2>
                                        <IonList className="historial-list">
                                            {reporte.ultimosUsuariosCreados.map((usuario, index) => (
                                                <IonItem key={index} className="historial-item">
                                                    <IonLabel>
                                                        <h3>{usuario.name || "Usuario sin nombre"}</h3>
                                                        <p>Correo: {usuario.email || "Correo no disponible"}</p>
                                                        <p>Rol: {usuario.role || "Rol no disponible"}</p>
                                                        <p>
                                                            Fecha de creación:{" "}
                                                            {usuario.createdAt
                                                                ? typeof usuario.createdAt === "string"
                                                                    ? new Date(usuario.createdAt).toLocaleString()
                                                                    : usuario.createdAt.toDate
                                                                        ? new Date(usuario.createdAt.toDate()).toLocaleString()
                                                                        : "Fecha no disponible"
                                                                : "Fecha no disponible"}
                                                        </p>
                                                    </IonLabel>
                                                </IonItem>
                                            ))}
                                        </IonList>
                                    </IonText>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>
                </IonGrid>

                {/* Modal para configuración de reporte PDF */}
                <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
                    <IonContent className="ion-padding">
                        <IonToolbar>
                            <IonTitle>Configurar Reporte PDF</IonTitle>
                        </IonToolbar>

                        <IonList lines="full" className="ion-margin-top">
                            <IonItem>
                                <IonLabel>Rango de Fechas</IonLabel>
                                <input
                                    type="date"
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    style={{ marginRight: '10px' }}
                                />
                                <span>a</span>
                                <input
                                    type="date"
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    style={{ marginLeft: '10px' }}
                                />
                            </IonItem>

                            <IonItem>
                                <IonCheckbox
                                    slot="start"
                                    checked={selectedCards.resumenGeneral}
                                    onIonChange={() => toggleCardSelection("resumenGeneral")}
                                />
                                <IonLabel>Incluir Resumen General</IonLabel>
                            </IonItem>

                            <IonItem>
                                <IonCheckbox
                                    slot="start"
                                    checked={selectedCards.detalleUsuarios}
                                    onIonChange={() => toggleCardSelection("detalleUsuarios")}
                                />
                                <IonLabel>Detalle de Usuarios por Rol</IonLabel>
                            </IonItem>

                            <IonItem>
                                <IonCheckbox
                                    slot="start"
                                    checked={selectedCards.estadisticasOficinas}
                                    onIonChange={() => toggleCardSelection("estadisticasOficinas")}
                                />
                                <IonLabel>Estadísticas de Oficinas</IonLabel>
                            </IonItem>

                            <IonItem>
                                <IonCheckbox
                                    slot="start"
                                    checked={selectedCards.ultimosRegistros}
                                    onIonChange={() => toggleCardSelection("ultimosRegistros")}
                                />
                                <IonLabel>Últimos Registros</IonLabel>
                            </IonItem>
                            <IonItem>
                                <IonCheckbox
                                    slot="start"
                                    checked={selectedCards.oficinasLista}
                                    onIonChange={() => toggleCardSelection("oficinasLista")}
                                />
                                <IonLabel>Incluir Listado de Oficinas</IonLabel>
                            </IonItem>

                            <IonItem>
                                <IonCheckbox
                                    slot="start"
                                    checked={selectedCards.registrosRecientes}
                                    onIonChange={() => toggleCardSelection("registrosRecientes")}
                                />
                                <IonLabel>Incluir Registros Recientes</IonLabel>
                            </IonItem>


                            <IonItem>
                                <IonCheckbox
                                    slot="start"
                                    checked={selectedCards.actividadReciente}
                                    onIonChange={() => toggleCardSelection("actividadReciente")}
                                />
                                <IonLabel>Actividad Reciente del Sistema</IonLabel>
                            </IonItem>
                        </IonList>

                        <div className="ion-padding">
                            <IonButton expand="block" onClick={generarReporteCompleto}>
                                <IonIcon slot="start" icon={download} />
                                Generar Reporte Completo
                            </IonButton>

                            <IonButton expand="block" onClick={confirmarGenerarPDF}>
                                <IonIcon slot="start" icon={documentText} />
                                Generar con Filtros
                            </IonButton>

                            <IonButton expand="block" color="medium" onClick={() => setShowModal(false)}>
                                Cancelar
                            </IonButton>
                        </div>
                    </IonContent>
                </IonModal>
            </IonContent>
        </IonPage>
    );
};

export default ReportesAdminGlobal;