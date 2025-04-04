import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  IonButton,
  IonInput,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonAlert,
  IonMenuButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonModal,
  IonTextarea,
  IonButtons,
  IonThumbnail,
} from "@ionic/react";
import { trash, pencil, add, business, informationCircle } from "ionicons/icons";
import "../Home.css";

interface Oficina {
  id: string;
  name: string;
  descripcion: string;
  creador: string;
  creadorNombre: string;
  creadorCorreo: string;
  creadoEn: string;
}

const GestionarOficinas: React.FC = () => {
  const [nombre, setNombre] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState<string>("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>("");
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [idToDelete, setIdToDelete] = useState<string>("");
  const [selectedOficina, setSelectedOficina] = useState<Oficina | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [creadorNombre, setCreadorNombre] = useState<string>("");

  useEffect(() => {
    obtenerOficinas();
  }, []);

  const obtenerOficinas = async () => {
    const querySnapshot = await getDocs(collection(db, "oficinas"));
    const oficinasData: Oficina[] = [];
    querySnapshot.forEach((doc) => {
      oficinasData.push({ id: doc.id, ...doc.data() } as Oficina);
    });
    setOficinas(oficinasData);
  };

  const obtenerNombreCreador = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().name;
    }
    return "Desconocido";
  };

  const crearOficina = async () => {
    if (nombre.trim() === "" || descripcion.trim() === "") return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const creadorNombre = userData.name || "Desconocido";
        const creadorCorreo = userData.email || "Correo no disponible";

        const oficinaRef = await addDoc(collection(db, "oficinas"), {
          name: nombre,
          descripcion: descripcion,
          creador: user.uid,
          creadorNombre,
          creadorCorreo,
          creadoEn: serverTimestamp()
        });

        // Registrar en historial (formato consistente)
        await addDoc(collection(db, "logs"), {
          tipo: "Crear Oficina",
          descripcion: `Nueva oficina creada: ${nombre}`,
          performedBy: {
            id: user.uid,
            correo: creadorCorreo
          },
          oficinaCreada: {
            id: oficinaRef.id,
            name: nombre,
            descripcion: descripcion
          },
          timestamp: serverTimestamp()
        });

        setNombre("");
        setDescripcion("");
        obtenerOficinas();
      }
    } catch (error) {
      console.error("Error al crear oficina:", error);
    }
  };

  const handleEditar = () => {
    if (selectedOficina) {
      setEditando(selectedOficina.id);
      setNuevoNombre(selectedOficina.name);
      setNuevaDescripcion(selectedOficina.descripcion);
      setShowModal(false);
    }
  };

  const handleGuardar = async () => {
    if (nuevoNombre.trim() === "" || nuevaDescripcion.trim() === "") return;

    const user = auth.currentUser;
    if (!user || !editando) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const creadorCorreo = userData.email || "Correo no disponible";

        // Obtener valores anteriores
        const oficinaRef = doc(db, "oficinas", editando);
        const oficinaSnap = await getDoc(oficinaRef);

        if (oficinaSnap.exists()) {
          const oficinaData = oficinaSnap.data();
          const nombreAnterior = oficinaData.name;
          const descripcionAnterior = oficinaData.descripcion;

          // Actualizar oficina
          await updateDoc(oficinaRef, {
            name: nuevoNombre,
            descripcion: nuevaDescripcion,
          });

          // Registrar edición en historial (formato mejorado)
          await addDoc(collection(db, "logs"), {
            tipo: "Editar Oficina",
            descripcion: `Oficina modificada: ${nombreAnterior} → ${nuevoNombre}`,
            performedBy: {
              id: user.uid,
              correo: creadorCorreo
            },
            oficinaEditada: {
              id: editando,
              nombreAnterior,
              nombreNuevo: nuevoNombre,
              descripcionAnterior,
              descripcionNueva: nuevaDescripcion
            },
            timestamp: serverTimestamp()
          });

          setEditando(null);
          setNuevoNombre("");
          setNuevaDescripcion("");
          obtenerOficinas();
        }
      }
    } catch (error) {
      console.error("Error al editar oficina:", error);
    }
  };

  const eliminarOficina = async () => {
    const user = auth.currentUser;
    if (!user || !idToDelete) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const creadorCorreo = userData.email || "Correo no disponible";

        // Obtener datos antes de eliminar
        const oficinaRef = doc(db, "oficinas", idToDelete);
        const oficinaSnap = await getDoc(oficinaRef);

        if (oficinaSnap.exists()) {
          const oficinaData = oficinaSnap.data();

          // Registrar eliminación en historial
          await addDoc(collection(db, "logs"), {
            tipo: "Eliminar Oficina",
            descripcion: `Oficina eliminada: ${oficinaData.name}`,
            performedBy: {
              id: user.uid,
              correo: creadorCorreo
            },
            oficinaEliminada: {
              id: idToDelete,
              name: oficinaData.name
            },
            timestamp: serverTimestamp()
          });

          await deleteDoc(oficinaRef);
          setOpenDialog(false);
          obtenerOficinas();
        }
      }
    } catch (error) {
      console.error("Error al eliminar oficina:", error);
    }
  };

  const abrirModal = async (oficina: Oficina) => {
    setSelectedOficina(oficina);
    const nombreCreador = await obtenerNombreCreador(oficina.creador);
    setCreadorNombre(nombreCreador);
    setShowModal(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Gestionar Oficinas</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard className="form-card">
          <IonCardContent>
            <IonItem>
              <IonLabel position="floating">Nombre de la oficina</IonLabel>
              <IonInput
                value={nombre}
                onIonChange={(e) => setNombre(e.detail.value!)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Descripción</IonLabel>
              <IonTextarea
                value={descripcion}
                onIonChange={(e) => setDescripcion(e.detail.value!)}
              />
            </IonItem>
            <IonButton expand="full" onClick={crearOficina} color="primary">
              <IonIcon slot="start" icon={add} />
              Crear Oficina
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonGrid>
          <IonRow>
            {oficinas.map((oficina) => (
              <IonCol key={oficina.id} size="12" sizeMd="6" sizeLg="4">
                <IonCard className="office-card">
                  <IonCardContent>
                    <IonThumbnail slot="start" className="office-icon">
                      <IonIcon icon={business} />
                    </IonThumbnail>
                    <IonText>
                      <h2>{oficina.name}</h2>
                      <p>{oficina.descripcion}</p>
                    </IonText>
                    <div className="button-group">
                      <IonButton
                        color="primary"
                        fill="clear"
                        onClick={() => abrirModal(oficina)}
                      >
                        <IonIcon icon={informationCircle} />
                        Ver más
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonModal
          isOpen={showModal}
          onDidDismiss={() => setShowModal(false)}
          className="custom-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Detalles de la Oficina</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedOficina && (
              <>
                <IonText>
                  <h2>{selectedOficina.name}</h2>
                  <p>{selectedOficina.descripcion}</p>
                  <p><strong>Creado por:</strong> {selectedOficina.creadorNombre}</p>
                  <p><strong>Correo del creador:</strong> {selectedOficina.creadorCorreo}</p>
                  <p><strong>Fecha de creación:</strong> {new Date(selectedOficina.creadoEn).toLocaleString()}</p>
                </IonText>
                <div className="modal-actions">
                  <IonButton
                    color="warning"
                    onClick={handleEditar}
                  >
                    <IonIcon slot="start" icon={pencil} />
                    Editar
                  </IonButton>
                  <IonButton
                    color="danger"
                    onClick={() => {
                      setIdToDelete(selectedOficina.id);
                      setOpenDialog(true);
                      setShowModal(false);
                    }}
                  >
                    <IonIcon slot="start" icon={trash} />
                    Eliminar
                  </IonButton>
                </div>
              </>
            )}
          </IonContent>
        </IonModal>

        <IonModal isOpen={editando !== null} onDidDismiss={() => setEditando(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Editar Oficina</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setEditando(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="floating">Nombre</IonLabel>
              <IonInput
                value={nuevoNombre}
                onIonChange={(e) => setNuevoNombre(e.detail.value!)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Descripción</IonLabel>
              <IonTextarea
                value={nuevaDescripcion}
                onIonChange={(e) => setNuevaDescripcion(e.detail.value!)}
              />
            </IonItem>
            <IonButton expand="full" onClick={handleGuardar} color="primary">
              Guardar
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={openDialog}
          onDidDismiss={() => setOpenDialog(false)}
          header="Confirmación"
          message="¿Estás seguro de que deseas eliminar esta oficina? Esta acción no se puede deshacer."
          buttons={[
            {
              text: "Cancelar",
              role: "cancel",
              handler: () => setOpenDialog(false),
            },
            {
              text: "Eliminar",
              handler: eliminarOficina,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default GestionarOficinas;