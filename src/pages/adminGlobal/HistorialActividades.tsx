import React, { useState, useEffect } from "react";
import { db } from "../../services/firebaseConfig";
import { collection, query, onSnapshot, orderBy, limit, startAfter, getDocs, Timestamp, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonMenuButton,
  IonAccordionGroup,
  IonAccordion,
  IonBadge,
  IonIcon,
  IonChip,
  IonText,
  IonButton,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonNote,
  IonFooter,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonAvatar
} from "@ionic/react";
import {
  timeOutline,
  personOutline,
  createOutline,
  trashOutline,
  addOutline,
  informationCircleOutline,
  lockClosedOutline,
  lockOpenOutline,
  personAddOutline,
  mailOutline,
  idCardOutline,
  shieldCheckmarkOutline,
  arrowForwardOutline,
  filterOutline,
  closeOutline,
  checkmarkOutline
} from "ionicons/icons";


interface Actividad {
  id: string;
  tipo: string;
  descripcion: string;
  performedBy: {
    id: string;
    correo: string;
  };
  userAffected?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    employeeNumber?: string;
    status?: string;
  };
  userCreated?: {
    id: string;
    name: string;
    email: string;
    role: string;
    employeeNumber: string;
    status?: string;
  };
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  oficinaCreada?: {
    id: string;
    name: string;
    descripcion: string;
  };
  oficinaEditada?: {
    id: string;
    nombreAnterior: string;
    nombreNuevo: string;
    descripcionAnterior: string;
    descripcionNueva: string;
  };
  oficinaEliminada?: {
    id: string;
    name: string;
  };
  timestamp: number;
}

const tiposAccion = [
  "Todos",
  "Crear Oficina",
  "Editar Oficina",
  "Eliminar Oficina",
  "Cambio de oficina aprobado",
  "Cambio de oficina rechazado",
  "Usuario activado",
  "Usuario desactivado",
  "Usuario editado",
  "Usuario eliminado",
  "Crear Usuario"
];

const HistorialActividades: React.FC = () => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [actividadesFiltradas, setActividadesFiltradas] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: "Todos",
    usuario: "",
    fechaDesde: "",
    fechaHasta: ""
  });
  const [filtrosActivos, setFiltrosActivos] = useState(false);
  const pageSize = 10; // Cantidad de registros por carga

  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(pageSize));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === pageSize);
      }

      setActividades(parseActividades(snapshot.docs));
      setActividadesFiltradas(parseActividades(snapshot.docs));
      setLoading(false);
    }, (error) => {
      console.error("Error en la suscripción de logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const parseActividades = (docs: QueryDocumentSnapshot<DocumentData>[]) => {
    return docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        tipo: data.accion || data.tipo || "Acción sin especificar",
        descripcion: data.descripcion || `Acción realizada por: ${data.performedBy?.correo || "Desconocido"}`,
        performedBy: data.performedBy || { id: "unknown", correo: "Desconocido" },
        userAffected: data.userAffected || null,
        userCreated: data.userCreated || null,
        changes: data.changes || null,
        oficinaCreada: data.oficinaCreada || null,
        oficinaEditada: data.oficinaEditada || null,
        oficinaEliminada: data.oficinaEliminada || null,
        timestamp: data.timestamp?.toMillis?.() || (data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now()),
      };
    });
  };
  const loadMoreLogs = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;

    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "logs"),
        orderBy("timestamp", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === pageSize);
      } else {
        setHasMore(false);
      }

      setActividades(prev => [...prev, ...parseActividades(snapshot.docs)]);
      setActividadesFiltradas(prev => [...prev, ...parseActividades(snapshot.docs)]);
    } catch (error) {
      console.error("Error al cargar más logs:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop === target.clientHeight) {
      loadMoreLogs();
    }
  };

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, actividades]);

  const aplicarFiltros = () => {
    let resultado = [...actividades];

    if (filtros.tipo !== "Todos") {
      resultado = resultado.filter(act => act.tipo === filtros.tipo);
    }

    if (filtros.usuario) {
      const busqueda = filtros.usuario.toLowerCase();
      resultado = resultado.filter(act =>
        act.performedBy.correo.toLowerCase().includes(busqueda) ||
        (act.userAffected?.email?.toLowerCase().includes(busqueda) ?? false) ||
        (act.userCreated?.email?.toLowerCase().includes(busqueda) ?? false)
      );
    }

    if (filtros.fechaDesde) {
      const fechaDesde = new Date(filtros.fechaDesde).getTime();
      resultado = resultado.filter(act => act.timestamp >= fechaDesde);
    }

    if (filtros.fechaHasta) {
      const fechaHasta = new Date(filtros.fechaHasta).getTime() + 86400000;
      resultado = resultado.filter(act => act.timestamp <= fechaHasta);
    }

    setActividadesFiltradas(resultado);
    setFiltrosActivos(
      filtros.tipo !== "Todos" ||
      filtros.usuario !== "" ||
      filtros.fechaDesde !== "" ||
      filtros.fechaHasta !== ""
    );
  };

  const limpiarFiltros = () => {
    setFiltros({
      tipo: "Todos",
      usuario: "",
      fechaDesde: "",
      fechaHasta: ""
    });
    setFiltrosActivos(false);
  };

  const getActionIcon = (tipo: string) => {
    switch (tipo) {
      case "Crear Oficina": return <IonIcon icon={addOutline} color="success" />;
      case "Editar Oficina": return <IonIcon icon={createOutline} color="warning" />;
      case "Eliminar Oficina": return <IonIcon icon={trashOutline} color="danger" />;
      case "Usuario activado": return <IonIcon icon={lockClosedOutline} color="success" />;
      case "Usuario desactivado": return <IonIcon icon={lockOpenOutline} color="danger" />;
      case "Usuario editado": return <IonIcon icon={createOutline} color="primary" />;
      case "Usuario eliminado": return <IonIcon icon={trashOutline} color="danger" />;
      case "Crear Usuario": return <IonIcon icon={personAddOutline} color="tertiary" />;
      case "Cambio de oficina aprobado": return <IonIcon icon={checkmarkOutline} color="success" />;
      case "Cambio de oficina rechazado": return <IonIcon icon={closeOutline} color="danger" />;
      default: return <IonIcon icon={informationCircleOutline} color="medium" />;
    }
  };

  const getActionColor = (tipo: string) => {
    switch (tipo) {
      case "Crear Oficina": return "success";
      case "Editar Oficina": return "warning";
      case "Eliminar Oficina": return "danger";
      case "Usuario activado": return "success";
      case "Usuario desactivado": return "danger";
      case "Usuario editado": return "primary";
      case "Usuario eliminado": return "danger";
      case "Crear Usuario": return "tertiary";
      case "Cambio de oficina aprobado": return "success";
      case "Cambio de oficina rechazado": return "danger";
      default: return "medium";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderUserDetails = (user: any, title: string) => (
    <IonItem>
      <IonLabel>
        <h3>{title}</h3>
        <IonText color="medium">
          <p style={{ display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={personOutline} style={{ marginRight: '8px' }} />
            {user.name || 'Nombre no disponible'}
          </p>
          <p style={{ display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={mailOutline} style={{ marginRight: '8px' }} />
            {user.email || 'Correo no disponible'}
          </p>
          <p style={{ display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: '8px' }} />
            Rol: {user.role || 'Rol no disponible'}
          </p>
          <p style={{ display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={idCardOutline} style={{ marginRight: '8px' }} />
            Núm. empleado: {user.employeeNumber || 'N/A'}
          </p>
          {user.status && (
            <p style={{ display: 'flex', alignItems: 'center' }}>
              <IonIcon icon={user.status === "active" ? lockClosedOutline : lockOpenOutline}
                style={{ marginRight: '8px' }} />
              Estado:
              <IonBadge color={user.status === "active" ? "success" : "danger"} style={{ marginLeft: '8px' }}>
                {user.status === "active" ? "ACTIVO" : "INACTIVO"}
              </IonBadge>
            </p>
          )}
        </IonText>
      </IonLabel>
    </IonItem>
  );

  const renderOfficeEdits = (oficinaEditada: any) => {
    const cambios = [];

    if (oficinaEditada.nombreAnterior !== oficinaEditada.nombreNuevo) {
      cambios.push({
        field: "Nombre",
        oldValue: oficinaEditada.nombreAnterior,
        newValue: oficinaEditada.nombreNuevo
      });
    }

    if (oficinaEditada.descripcionAnterior !== oficinaEditada.descripcionNueva) {
      cambios.push({
        field: "Descripción",
        oldValue: oficinaEditada.descripcionAnterior,
        newValue: oficinaEditada.descripcionNueva
      });
    }

    return (
      <IonItem>
        <IonLabel>
          <h3>Edición de Oficina</h3>
          <p><strong>ID:</strong> {oficinaEditada.id}</p>

          {cambios.length > 0 ? (
            <>
              <h4>Cambios realizados:</h4>
              {cambios.map((cambio, index) => (
                <div key={index} style={{ marginBottom: '10px' }}>
                  <p><strong>{cambio.field}:</strong></p>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IonText color="danger" style={{ textDecoration: 'line-through', marginRight: '8px' }}>
                      {cambio.oldValue}
                    </IonText>
                    <IonIcon icon={arrowForwardOutline} style={{ marginRight: '8px' }} />
                    <IonText color="success">
                      {cambio.newValue}
                    </IonText>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p>No se detectaron cambios en los campos principales</p>
          )}
        </IonLabel>
      </IonItem>
    );
  };

  const renderOfficeDetails = (oficina: any, actionType: string) => (
    <IonItem>
      <IonLabel>
        <h3>{actionType}</h3>
        <p><strong>Nombre:</strong> {oficina.name || 'Nombre no disponible'}</p>
        {oficina.descripcion && <p><strong>Descripción:</strong> {oficina.descripcion}</p>}
        <p><strong>ID:</strong> {oficina.id}</p>
      </IonLabel>
    </IonItem>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Historial de Actividades</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowFilter(true)}>
              <IonIcon
                icon={filterOutline}
                color={filtrosActivos ? "primary" : "medium"}
              />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Modal de filtros a pantalla completa */}
        <IonModal
          isOpen={showFilter}
          onDidDismiss={() => setShowFilter(false)}
          className="fullscreen-filter-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowFilter(false)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
              <IonTitle>Filtrar Actividades</IonTitle>
              <IonButtons slot="end">
                <IonButton
                  onClick={limpiarFiltros}
                  disabled={!filtrosActivos}
                  fill="clear"
                >
                  Limpiar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeLg="6">
                  <IonItem>
                    <IonSelect
                      label="Tipo de acción"
                      value={filtros.tipo}
                      onIonChange={e => setFiltros({ ...filtros, tipo: e.detail.value })}
                      interface="action-sheet"
                    >
                      {tiposAccion.map(tipo => (
                        <IonSelectOption key={tipo} value={tipo}>{tipo}</IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                </IonCol>

                <IonCol size="12" sizeLg="6">
                  <IonItem>
                    <IonSearchbar
                      placeholder="Buscar por correo de usuario"
                      value={filtros.usuario}
                      onIonChange={e => setFiltros({ ...filtros, usuario: e.detail.value || '' })}
                    />
                  </IonItem>
                </IonCol>

                <IonCol size="12" sizeLg="6">
                  <IonItem>
                    <IonItem>
                      <IonLabel>Fecha desde </IonLabel>
                      <IonDatetime
                        presentation="date"
                        locale="es-ES"
                        value={filtros.fechaDesde}
                        onIonChange={e => setFiltros({ ...filtros, fechaDesde: e.detail.value as string })}
                        className="date-picker"
                      />
                    </IonItem>
                  </IonItem>
                </IonCol>

                <IonCol size="12" sizeLg="6">
                  <IonItem>
                    <IonItem>
                      <IonLabel>Fecha hasta </IonLabel>
                      <IonDatetime
                        presentation="date"
                        locale="es-ES"
                        value={filtros.fechaHasta}
                        onIonChange={e => setFiltros({ ...filtros, fechaHasta: e.detail.value as string })}
                        className="date-picker"
                      />
                    </IonItem>
                  </IonItem>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonContent>

          <IonFooter>
            <IonToolbar>
              <IonButton
                expand="block"
                onClick={() => setShowFilter(false)}
                size="large"
                className="apply-button"
              >
                <IonIcon icon={checkmarkOutline} slot="start" />
                Aplicar Filtros
              </IonButton>
            </IonToolbar>
          </IonFooter>
        </IonModal>

        {/* Indicador de filtros activos */}
        {filtrosActivos && (
          <IonNote color="primary" className="filter-indicator">
            Filtros aplicados: {actividadesFiltradas.length} de {actividades.length} actividades
          </IonNote>
        )}

        {loading ? (
          <IonItem>
            <IonLabel>Cargando actividades...</IonLabel>
          </IonItem>
        ) : actividadesFiltradas.length === 0 ? (
          <IonItem>
            <IonLabel>
              {filtrosActivos ?
                "No hay actividades que coincidan con los filtros" :
                "No hay actividades registradas"}
            </IonLabel>
          </IonItem>
        ) : (
          <IonList>
            {actividadesFiltradas.map((actividad) => (
              <IonAccordionGroup key={actividad.id}>
                <IonAccordion value={actividad.id}>
                  <IonItem slot="header" lines="full">
                    <div slot="start" style={{ marginRight: '10px' }}>
                      {getActionIcon(actividad.tipo)}
                    </div>
                    <IonLabel>
                      <IonChip color={getActionColor(actividad.tipo)}>
                        {actividad.tipo}
                      </IonChip>
                      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                        <IonIcon icon={personOutline} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                        {actividad.performedBy.correo}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#666' }}>
                        <IonIcon icon={timeOutline} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                        {formatDate(actividad.timestamp)}
                      </p>
                    </IonLabel>
                  </IonItem>

                  <div className="ion-padding" slot="content">
                    {actividad.userCreated && renderUserDetails(actividad.userCreated, "Usuario creado")}
                    {actividad.userAffected && renderUserDetails(actividad.userAffected, "Usuario afectado")}
                    {actividad.oficinaCreada && renderOfficeDetails(actividad.oficinaCreada, "Oficina creada")}
                    {actividad.oficinaEditada && renderOfficeEdits(actividad.oficinaEditada)}
                    {actividad.oficinaEliminada && renderOfficeDetails(actividad.oficinaEliminada, "Oficina eliminada")}

                    {actividad.changes && actividad.changes.length > 0 && (
                      <IonItem>
                        <IonLabel>
                          <h3>Cambios detallados</h3>
                          {actividad.changes.map((change, index) => (
                            <div key={index} style={{ marginBottom: '8px' }}>
                              <p><strong>{change.field}:</strong></p>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <IonText color="danger" style={{ textDecoration: 'line-through', marginRight: '8px' }}>
                                  {change.oldValue?.toString() || 'N/A'}
                                </IonText>
                                <IonIcon icon={arrowForwardOutline} style={{ marginRight: '8px' }} />
                                <IonText color="success">
                                  {change.newValue?.toString() || 'N/A'}
                                </IonText>
                              </div>
                            </div>
                          ))}
                        </IonLabel>
                      </IonItem>
                    )}
                  </div>
                </IonAccordion>
              </IonAccordionGroup>
            ))}
          </IonList>
        )}
        {hasMore && (
          <IonButton expand="full" disabled={loadingMore} onClick={loadMoreLogs}>
            {loadingMore ? "Cargando..." : "Cargar más"}
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
};

export default HistorialActividades;