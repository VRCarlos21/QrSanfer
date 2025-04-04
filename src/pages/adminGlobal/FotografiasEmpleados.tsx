import React, { useEffect, useState } from "react";
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    IonMenuButton, IonSearchbar, IonCard, IonImg, IonAlert, IonToast, IonSpinner,
    IonModal, IonGrid, IonRow, IonCol, IonIcon, IonLabel, IonInput, IonItem
} from "@ionic/react";
import { storage } from "../../services/firebaseConfig";
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import { trash, create, cloudUpload, close } from "ionicons/icons";

const FotografiasEmpleados: React.FC = () => {
    const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
    const [search, setSearch] = useState("");
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [showActionModal, setShowActionModal] = useState(false);
    const [currentPhoto, setCurrentPhoto] = useState<{ url: string; name: string } | null>(null);
    const [newPhotoName, setNewPhotoName] = useState("");
    const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
    const [employeeNumber, setEmployeeNumber] = useState("");
    const [visiblePhotos, setVisiblePhotos] = useState<{ url: string; name: string }[]>([]);
    const [page, setPage] = useState(1); // Estado para la paginación
    const photosPerPage = 20; // Número de fotos por página

    useEffect(() => {
        fetchPhotos();
    }, []);

    // 🔹 Función para obtener todas las fotos
    const fetchPhotos = async () => {
        try {
            const folderRef = ref(storage, "fotos/");
            const res = await listAll(folderRef);
            const photoUrls = await Promise.all(
                res.items.map(async (item) => ({
                    url: await getDownloadURL(item),
                    name: item.name,
                }))
            );
            setPhotos(photoUrls);
            setVisiblePhotos(photoUrls.slice(0, photosPerPage)); // Mostrar las primeras 20 fotos
        } catch (error) {
            console.error("Error al obtener las fotos:", error);
            showToastMessage("No se pudieron cargar las fotos.");
        }
    };

    // 🔹 Confirmar eliminación
    const confirmDeletePhoto = (photoName: string) => {
        setPhotoToDelete(photoName);
        setShowDeleteAlert(true);
    };

    // 🔹 Eliminar foto de Firebase Storage
    const deletePhoto = async () => {
        if (photoToDelete) {
            setLoading(true);
            try {
                const photoRef = ref(storage, `fotos/${photoToDelete}`);
                await deleteObject(photoRef);
                showToastMessage("Foto eliminada exitosamente.");
                fetchPhotos();
            } catch (error) {
                console.error("Error al eliminar la foto:", error);
                showToastMessage("Hubo un error al eliminar la foto.");
            }
            setPhotoToDelete(null);
            setShowDeleteAlert(false);
            setLoading(false);
        }
    };

    // 🔹 Subir nueva foto
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (file.type === "image/jpeg") {
                setSelectedFile(file);
            } else {
                showToastMessage("Solo se permiten archivos JPG.");
            }
        }
    };

    const uploadPhoto = async () => {
        if (selectedFile && employeeNumber) {
            setLoading(true);
            try {
                const photoName = `${employeeNumber}.jpg`; // Nombre de la foto
                const photoRef = ref(storage, `fotos/${photoName}`);
                await uploadBytes(photoRef, selectedFile);
                showToastMessage("Foto subida exitosamente.");
                fetchPhotos();
                setShowUploadModal(false);
                setEmployeeNumber(""); // Limpiar el campo después de subir
            } catch (error) {
                console.error("Error al subir la foto:", error);
                showToastMessage("Hubo un error al subir la foto.");
            }
            setSelectedFile(null);
            setLoading(false);
        } else {
            showToastMessage("Por favor, ingresa el número del empleado y selecciona una foto.");
        }
    };

    // 🔹 Mostrar mensajes toast
    const showToastMessage = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
    };

    // 🔹 Abrir modal de acciones (editar/eliminar)
    const openActionModal = (photo: { url: string; name: string }) => {
        setCurrentPhoto(photo);
        setEmployeeNumber(photo.name.replace(".jpg", "")); // Usamos employeeNumber en lugar de newPhotoName
        setNewPhotoFile(null); // Resetear nueva foto al abrir modal
        setShowActionModal(true);
    };


    // 🔹 Editar foto
    // 🔹 Función editPhoto final optimizada
    const editPhoto = async () => {
        if (!currentPhoto || !employeeNumber) return;
    
        setLoading(true);
        try {
            const newFileName = `${employeeNumber}.jpg`;
            const hasNameChanged = newFileName !== currentPhoto.name;
            const hasNewPhoto = Boolean(newPhotoFile);
    
            if (!hasNameChanged && !hasNewPhoto) {
                showToastMessage("No se detectaron cambios.");
                return;
            }
    
            const newPhotoRef = ref(storage, `fotos/${newFileName}`);
    
            // Caso 1: Hay nueva foto (funciona bien)
            if (newPhotoFile) {
                await uploadBytes(newPhotoRef, newPhotoFile);
            } 
            // Caso 2: Solo cambio de nombre (solución alternativa)
            else if (hasNameChanged) {
                // Obtener referencia al archivo original
                const originalRef = ref(storage, `fotos/${currentPhoto.name}`);
                
                // SOLUCIÓN CLAVE: Copiar el archivo directamente en Firebase
                // Esto evita tener que descargar y re-subir
                const downloadURL = await getDownloadURL(originalRef);
                
                // Usamos XMLHttpRequest que maneja mejor CORS
                const blob = await new Promise<Blob>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.responseType = 'blob';
                    xhr.onload = () => resolve(xhr.response);
                    xhr.onerror = () => reject(new Error('Error al descargar'));
                    xhr.open('GET', downloadURL);
                    xhr.send();
                });
                
                await uploadBytes(newPhotoRef, blob);
            }
    
            // Eliminar el original si el nombre cambió
            if (hasNameChanged) {
                const oldPhotoRef = ref(storage, `fotos/${currentPhoto.name}`);
                await deleteObject(oldPhotoRef);
            }
    
            showToastMessage("Cambios guardados exitosamente");
            fetchPhotos();
            setShowActionModal(false);
        } catch (error) {
            console.error("Error al editar:", error);
            showToastMessage("Error al guardar cambios");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Filtrar fotos según la búsqueda
    const filteredPhotos = photos.filter(photo =>
        photo.name.toLowerCase().startsWith("m") &&
        photo.name.toLowerCase().includes(search.toLowerCase())
    );

    // 🔹 Cargar más fotos
    const loadMorePhotos = () => {
        const nextPage = page + 1;
        const startIndex = nextPage * photosPerPage;
        const newVisiblePhotos = photos.slice(0, startIndex);
        setVisiblePhotos(newVisiblePhotos);
        setPage(nextPage);
    };

    // 🔹 Reiniciar paginación al buscar
    useEffect(() => {
        setVisiblePhotos(filteredPhotos.slice(0, photosPerPage));
        setPage(1);
    }, [search]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton />
                    </IonButtons>
                    <IonTitle>Gestión de Fotos</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <h3>Fotos de Empleados</h3>
                <IonSearchbar
                    value={search}
                    onIonInput={(e) => setSearch(e.detail.value!)}
                    placeholder="Buscar por número de empleado..."
                />

                {/* Botón para subir fotos */}
                <IonButton expand="block" onClick={() => setShowUploadModal(true)}>
                    <IonIcon icon={cloudUpload} slot="start" />
                    Subir Foto
                </IonButton>

                {/* Grid de fotos (4 columnas) */}
                <IonGrid>
                    <IonRow>
                        {visiblePhotos.length > 0 ? (
                            visiblePhotos.map(photo => (
                                <IonCol size="6" sizeMd="3" key={photo.name}>
                                    <IonCard style={{ margin: "10px", height: "300px" }}>
                                        <IonImg src={photo.url} style={{ width: "100%", height: "250px" }} />
                                        <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                                            <IonButton
                                                color="warning"
                                                onClick={() => openActionModal(photo)}
                                                style={{ margin: "0 5px" }}
                                            >
                                                <IonIcon icon={create} />
                                            </IonButton>
                                            <IonButton
                                                color="danger"
                                                onClick={() => confirmDeletePhoto(photo.name)}
                                                style={{ margin: "0 5px" }}
                                            >
                                                <IonIcon icon={trash} />
                                            </IonButton>
                                        </div>
                                    </IonCard>
                                </IonCol>
                            ))
                        ) : (
                            <IonLabel>No hay fotos disponibles.</IonLabel>
                        )}
                    </IonRow>
                </IonGrid>

                {/* Botón "Cargar más" */}
                {visiblePhotos.length < filteredPhotos.length && (
                    <IonButton expand="block" onClick={loadMorePhotos}>
                        Cargar más
                    </IonButton>
                )}
            </IonContent>

            {/* Modal para subir fotos */}
            <IonModal isOpen={showUploadModal} onDidDismiss={() => setShowUploadModal(false)}>
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>Subir Foto</IonTitle>
                        <IonButtons slot="end">
                            <IonButton onClick={() => setShowUploadModal(false)}>
                                <IonIcon icon={close} />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>
                <IonContent className="ion-padding">
                    <IonItem>
                        <IonLabel position="stacked">Número del empleado</IonLabel>
                        <IonInput
                            value={employeeNumber}
                            onIonChange={(e) => setEmployeeNumber(e.detail.value!)}
                            placeholder="Ej: M1501"
                        />
                    </IonItem>
                    <input type="file" accept="image/jpeg" onChange={handleFileChange} />
                    <IonButton expand="block" onClick={uploadPhoto} disabled={!selectedFile || !employeeNumber || loading}>
                        {loading ? <IonSpinner /> : "Subir Foto"}
                    </IonButton>
                </IonContent>
            </IonModal>

            {/* Modal pequeño para editar/eliminar */}
            <IonModal isOpen={showActionModal} onDidDismiss={() => setShowActionModal(false)}>
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>Editar Foto</IonTitle>
                        <IonButtons slot="end">
                            <IonButton onClick={() => setShowActionModal(false)}>
                                <IonIcon icon={close} />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>
                <IonContent className="ion-padding">
                    {currentPhoto && (
                        <>
                            {/* Previsualización de la foto actual */}
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <IonLabel>Foto Actual:</IonLabel>
                                <IonImg
                                    src={currentPhoto.url}
                                    style={{
                                        maxWidth: '300px',
                                        maxHeight: '300px',
                                        margin: '10px auto',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px'
                                    }}
                                />
                            </div>

                            {/* Campo para número de empleado */}
                            <IonItem>
                                <IonLabel position="stacked">Número de Empleado</IonLabel>
                                <IonInput
                                    value={employeeNumber}
                                    onIonChange={(e) => setEmployeeNumber(e.detail.value!)}
                                    placeholder="Ej: M1501"
                                />
                            </IonItem>

                            {/* Selector de nueva foto */}
                            <IonItem>
                                <IonLabel>Nueva Foto (Opcional)</IonLabel>
                                <input
                                    type="file"
                                    accept="image/jpeg"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setNewPhotoFile(e.target.files[0]);
                                        }
                                    }}
                                    style={{ marginTop: '10px' }}
                                />
                            </IonItem>

                            {/* Previsualización de la nueva foto (si se seleccionó) */}
                            {newPhotoFile && (
                                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                    <img
                                        src={URL.createObjectURL(newPhotoFile)}
                                        style={{
                                            maxWidth: '300px',
                                            maxHeight: '300px',
                                            margin: '10px auto',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px'
                                        }}
                                        alt="Vista previa nueva foto"
                                    />
                                </div>
                            )}

                            {/* Botón de guardar */}
                            <IonButton
                                expand="block"
                                onClick={editPhoto}
                                disabled={!employeeNumber || loading}
                                style={{ marginTop: '20px' }}
                            >
                                {loading ? <IonSpinner /> : "Guardar Cambios"}
                            </IonButton>
                        </>
                    )}
                </IonContent>
            </IonModal>

            {/* Alerta de confirmación para eliminar foto */}
            <IonAlert
                isOpen={showDeleteAlert}
                onDidDismiss={() => setShowDeleteAlert(false)}
                header="Eliminar Foto"
                message="¿Estás seguro de que deseas eliminar esta foto?"
                buttons={[
                    { text: "Cancelar", role: "cancel" },
                    { text: "Eliminar", handler: deletePhoto }
                ]}
            />

            {/* Toast para mensajes */}
            <IonToast
                isOpen={showToast}
                onDidDismiss={() => setShowToast(false)}
                message={toastMessage}
                duration={2000}
            />
        </IonPage>
    );
};

export default FotografiasEmpleados;