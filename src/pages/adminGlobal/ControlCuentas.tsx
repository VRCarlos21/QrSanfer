import React, { useState, useEffect } from "react";
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonMenuButton, IonSegment, IonSegmentButton,
    IonLabel, IonInput, IonButton, IonGrid, IonRow, IonCol, IonIcon,
    IonCard, IonCardContent, IonBadge, IonAlert, IonModal,
    IonSelect,
    IonSelectOption,
    IonSearchbar
} from "@ionic/react";
import { lockClosed, lockOpen, trash, create, star } from "ionicons/icons";
import { db } from "../../services/firebaseConfig";
import "../Home.css";
import { collection, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, setDoc, onSnapshot, query, where  } from "firebase/firestore";
import { getAuth, deleteUser as deleteAuthUser } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

type User = {
    id: string;
    role: string;
    email: string;
    employeeNumber: string;
    name?: string;
    status?: string;
};

const ControlCuentas: React.FC = () => {
    const [role, setRole] = useState("admin");
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showStatusAlert, setShowStatusAlert] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string, status: string } | null>(null);
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const auth = getAuth();
    const db = getFirestore();

    useEffect(() => {
        const q = collection(db, "users");
    
        // Escuchar cambios en la colección "users"
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
    
            setUsers(data.filter(user => role === "admin" ? user.role.includes("admin") : user.role === role));
        });
    
        // Guardar el ID del usuario actual si está autenticado
        const user = auth.currentUser;
        if (user) {
            setCurrentUserId(user.uid);
        }
    
        return () => unsubscribe(); // Se limpia el listener cuando el componente se desmonta
    }, [role]);
    

    const fetchUsers = async () => {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "users"));
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as User[];
        setUsers(data.filter(user => role === "admin" ? user.role.includes("admin") : user.role === role));
        setLoading(false);
    };

    const logActivity = async (activity: {
        tipo: string;
        descripcion: string;
        userAffected?: {
            id: string;
            name?: string;
            email?: string;
            role?: string;
            employeeNumber?: string;
            status?: string;
        };
        changes?: {
            field: string;
            oldValue: any;
            newValue: any;
        }[];
    }) => {
        const user = auth.currentUser;
        if (!user) return;

        const logRef = doc(collection(db, "logs"));

        await setDoc(logRef, {
            tipo: activity.tipo, // Asegúrate de usar 'tipo' aquí
            descripcion: activity.descripcion,
            performedBy: {
                id: user.uid,
                correo: user.email || "unknown"
            },
            userAffected: activity.userAffected || null,
            changes: activity.changes || null,
            timestamp: serverTimestamp()
        });
    };
    const toggleStatus = async () => {
        if (pendingStatusChange) {
            const newStatus = pendingStatusChange.status === "active" ? "inactive" : "active";
            const user = users.find(u => u.id === pendingStatusChange.id);

            try {
                await updateDoc(doc(db, "users", pendingStatusChange.id), {
                    status: newStatus
                });

                await logActivity({
                    tipo: `Usuario ${newStatus === "active" ? "activado" : "desactivado"}`,
                    descripcion: `El usuario ${user?.email} fue ${newStatus === "active" ? "activado" : "desactivado"}`,
                    userAffected: {
                        id: pendingStatusChange.id,
                        email: user?.email,
                        name: user?.name,
                        status: newStatus
                    },
                    changes: [{
                        field: "status",
                        oldValue: pendingStatusChange.status,
                        newValue: newStatus
                    }]
                });

                fetchUsers();
            } catch (error) {
                console.error("Error al cambiar el estado:", error);
            }

            setPendingStatusChange(null);
        }
    };

    const deleteUser = async (id: string, email: string) => {
        if (!id) return;
        const userToDelete = users.find(u => u.id === id);
    
        try {
            await logActivity({
                tipo: "Usuario eliminado",
                descripcion: `El usuario ${userToDelete?.email} fue eliminado del sistema`,
                userAffected: {
                    id: id,
                    email: userToDelete?.email,
                    name: userToDelete?.name,
                    role: userToDelete?.role
                }
            });
    
            // Eliminar de Firestore
            await deleteDoc(doc(db, "users", id));
    
            // Llamar a Firebase Functions para eliminar el usuario de Authentication
            const functions = getFunctions();
            const deleteAuthUser = httpsCallable(functions, "deleteAuthUser");
            await deleteAuthUser({ email });
    
            fetchUsers();
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
        }
    };
    

    const handleEdit = async () => {
        if (selectedUser && editedUser) {
            const changes = [];

            if (selectedUser.name !== editedUser.name) {
                changes.push({
                    field: "name",
                    oldValue: selectedUser.name,
                    newValue: editedUser.name
                });
            }
            if (selectedUser.email !== editedUser.email) {
                changes.push({
                    field: "email",
                    oldValue: selectedUser.email,
                    newValue: editedUser.email
                });
            }
            if (selectedUser.role !== editedUser.role) {
                changes.push({
                    field: "role",
                    oldValue: selectedUser.role,
                    newValue: editedUser.role
                });
            }
            if (selectedUser.employeeNumber !== editedUser.employeeNumber) {
                changes.push({
                    field: "employeeNumber",
                    oldValue: selectedUser.employeeNumber,
                    newValue: editedUser.employeeNumber
                });
            }

            try {
                await updateDoc(doc(db, "users", selectedUser.id), {
                    name: editedUser.name,
                    email: editedUser.email,
                    role: editedUser.role,
                    employeeNumber: editedUser.employeeNumber
                });

                if (changes.length > 0) {
                    await logActivity({
                        tipo: "Usuario editado",
                        descripcion: `Se editaron ${changes.length} campos del usuario ${editedUser.email}`,
                        userAffected: {
                            id: selectedUser.id,
                            email: editedUser.email,
                            name: editedUser.name
                        },
                        changes: changes
                    });
                }

                setShowModal(false);
                fetchUsers();
            } catch (error) {
                console.error("Error al editar usuario:", error);
            }
        }
    };

    const getRoleDisplayName = (role: string) => {
        switch (role) {
            case "admin":
                return "Administrador Qr";
            case "adminGlobal":
                return "Administrador General";
            case "vigilante":
                return "Vigilante";
            case "user":
                return "Usuario";
            default:
                return role;
        }
    };

    const filteredUsers = users
        .filter(user =>
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.employeeNumber.includes(search) ||
            (user.name && user.name.toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => {
            if (a.id === currentUserId) return -1;
            if (b.id === currentUserId) return 1;
            return 0;
        });


    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton />
                        <IonTitle>Control de Cuentas</IonTitle>
                    </IonButtons>
                    <IonButtons slot="end">
                        <IonSearchbar
                            placeholder="Buscar por nombre, etc."
                            value={search}
                            onIonChange={e => setSearch(e.detail.value!)}
                            style={{ width: "300px", marginRight: "10px", textAlign: "left" }}
                        />
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <IonSegment value={role} onIonChange={e => setRole((e.detail.value as string) ?? "admin")}>
                    <IonSegmentButton value="admin">
                        <IonLabel>Administradores</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="vigilante">
                        <IonLabel>Vigilantes</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="user">
                        <IonLabel>Usuarios</IonLabel>
                    </IonSegmentButton>
                </IonSegment>

                <IonGrid>
                    {filteredUsers.map(user => (
                        <IonCard key={user.id} className="card-user">
                            <IonCardContent>
                                <IonRow className="desktop-row">
                                    <IonCol size="12" sizeMd="2" className="ion-text-center employee-number">
                                        {currentUserId === user.id && <IonIcon icon={star} color="warning" />}
                                        <strong>{user.employeeNumber}</strong>
                                    </IonCol>
                                    <IonCol size="12" sizeMd="2" className="ion-text-center employee-name">
                                        {user.name || ""}
                                    </IonCol>
                                    <IonCol size="12" sizeMd="3" className="ion-text-center employee-email ellipsis">
                                        {user.email}
                                    </IonCol>
                                    <IonCol size="12" sizeMd="2" className="ion-text-center employee-role">
                                        {getRoleDisplayName(user.role)}
                                    </IonCol>
                                    <IonCol size="12" sizeMd="1" className="ion-text-center employee-status">
                                        <IonBadge color={user.status === "inactive" ? "danger" : "success"}>
                                            {user.status === "inactive" ? "INACTIVO" : "ACTIVO"}
                                        </IonBadge>
                                    </IonCol>
                                    <IonCol size="12" sizeMd="2" className="ion-text-center button-container">
                                        <IonButton fill="clear" onClick={() => {
                                            setSelectedUser(user);
                                            setPendingStatusChange({ id: user.id, status: user.status ?? "active" });
                                            setShowStatusAlert(true);
                                        }}>
                                            <IonIcon icon={user.status === "inactive" ? lockOpen : lockClosed} />
                                        </IonButton>
                                        <IonButton fill="clear" onClick={() => {
                                            setSelectedUser(user);
                                            setEditedUser({ ...user });
                                            setShowModal(true);
                                        }}>
                                            <IonIcon icon={create} />
                                        </IonButton>
                                        <IonButton fill="clear" color="danger" onClick={() => {
                                            setSelectedUser(user);
                                            setShowAlert(true);
                                        }}>
                                            <IonIcon icon={trash} />
                                        </IonButton>
                                    </IonCol>
                                </IonRow>
                            </IonCardContent>
                        </IonCard>
                    ))}
                </IonGrid>
            </IonContent>

            <IonAlert
                isOpen={showAlert}
                onDidDismiss={() => setShowAlert(false)}
                header="Confirmar Eliminación"
                message="¿Estás seguro de que deseas eliminar esta cuenta?"
                buttons={[
                    { text: "Cancelar", role: "cancel" },
                    { text: "Eliminar", handler: () => deleteUser(selectedUser!.id, selectedUser!.email) }
                ]}
            />

            <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
                <IonHeader>
                    <IonToolbar>
                        <IonButtons slot="start">
                            <IonButton onClick={() => setShowModal(false)}>Cancelar</IonButton>
                        </IonButtons>
                        <IonTitle>Editar Usuario</IonTitle>
                        <IonButtons slot="end">
                            <IonButton onClick={handleEdit}>Guardar</IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                <IonContent>
                    {editedUser && (
                        <>
                            <IonInput
                                label="Número de Empleado"
                                value={editedUser.employeeNumber || ""}
                                onIonChange={e => setEditedUser({ ...editedUser, employeeNumber: e.detail.value! })}
                                placeholder="Ingresa el número de empleado"
                            />
                            <IonInput
                                label="Nombre"
                                value={editedUser.name || ""}
                                onIonChange={e => setEditedUser({ ...editedUser, name: e.detail.value! })}
                                placeholder="Ingresa el nombre"
                            />
                            <IonInput
                                label="Correo"
                                value={editedUser.email || ""}
                                onIonChange={e => setEditedUser({ ...editedUser, email: e.detail.value! })}
                                placeholder="Ingresa el correo"
                            />
                            <IonSelect
                                label="Rol"
                                value={editedUser.role}
                                onIonChange={e => setEditedUser({ ...editedUser, role: e.detail.value! })}
                            >
                                <IonSelectOption value="admin">Administrador Qr</IonSelectOption>
                                <IonSelectOption value="adminGlobal">Administrador General</IonSelectOption>
                                <IonSelectOption value="vigilante">Vigilante</IonSelectOption>
                                <IonSelectOption value="user">Usuario</IonSelectOption>
                            </IonSelect>
                        </>
                    )}
                </IonContent>
            </IonModal>

            <IonAlert
                isOpen={showStatusAlert}
                onDidDismiss={() => setShowStatusAlert(false)}
                header="Confirmar Acción"
                message="¿Estás seguro de que deseas cambiar el estado de esta cuenta?"
                buttons={[
                    { text: "Cancelar", role: "cancel" },
                    { text: "Confirmar", handler: toggleStatus }
                ]}
            />
        </IonPage>
    );
};

export default ControlCuentas;