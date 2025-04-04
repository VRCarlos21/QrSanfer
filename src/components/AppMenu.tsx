import React from "react";
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonMenuToggle,
} from "@ionic/react";
import {
  logOutOutline,
  settingsOutline,
  clipboardOutline,
  qrCodeOutline,
  peopleOutline,
  cameraOutline,
  checkmarkDoneOutline,
  helpCircleOutline,   // ❓ Ayuda y preguntas
  fileTrayFullOutline, // 📋 Registros de uso del QR
  personAddOutline,    // 👤 Crear usuarios
  businessOutline,     // 🏢 Agregar oficinas
  barChartOutline,     // 📊 Reportes / estadísticas
  listOutline,         // 📜 Control de equipos / historial
  scanOutline,
  business,         // 📷 Escanear QR
  calendarOutline,  // 📅 Reporte Semanal
  keyOutline,       // 🔑 Control de Cuentas
  documentTextOutline,
  calendar,
  home, // 📄 Historial de Actividaeds
} from "ionicons/icons";

interface MenuProps {
  userRole: string | null;
  handleSignOut: () => void;
}

const Menu: React.FC<MenuProps> = ({ userRole, handleSignOut }) => {
  // 🔹 Definir los ítems del menú por rol
  const menuItems: { label: string; icon: string; path: string }[] = [];

  if (userRole === "user") {
    menuItems.push(
      { label: "Solicitud de Qr", icon: documentTextOutline, path: "/Home" },
      { label: "Seguimiento de Solicitud", icon: clipboardOutline, path: "/SeguimientoSolicitud" },
      //{ label: "Registros de usos del QR", icon: fileTrayFullOutline, path: "/registrosdeUso" },
    );
  } else if (userRole === "admin") {
    menuItems.push(
      { label: "Panel de Gestión", icon: peopleOutline, path: "/admin" },
      { label: "Subir Fotos de Empleado", icon: cameraOutline, path: "/SubirFoto" },
      { label: "Historial de Solicitudes", icon: documentTextOutline, path: "/HistorialSolicitud" },
    );
  } else if (userRole === "vigilante") {
    menuItems.push(
      { label: "Escanear QR", icon: scanOutline, path: "/userpanel" },
      { label: "Control de equipos", icon: listOutline, path: "/ControlEquipos" },
      { label: "Reportes", icon: barChartOutline, path: "/ReportesVigilante" },
      { label: "Historial de Lecturas", icon: documentTextOutline, path: "/HistorialLecturas" },
    );
  } else if (userRole === "adminGlobal") { // 🔹 Agregar adminGlobal
    menuItems.push(
      { label: "Inicio", icon: home, path: "/AdminGlobal" },
      { label: "Crear Usarios", icon: personAddOutline, path: "/CrearUsuarios" },
      { label: "Gestionar Oficina", icon: businessOutline, path: "/GestionarOficina" },
      { label: "Control de Cuentas", icon: keyOutline, path: "/ControlCuentas" },
      {label: "Fotografías de Empleados", icon: cameraOutline, path: "/FotografiasEmpleados"},
      {label: "Cambio de Oficina", icon: business, path: "/CambioOficina"},
      { label: "Historial de Actividades", icon: documentTextOutline, path: "/HistorialActividades" },
    );
  }
  
  // 🔹 Ajustes y Cerrar sesión en todos los menús
  menuItems.push(
    { label: "Ajustes", icon: settingsOutline, path: "/Settings" }
  );
  

  return (
    <IonMenu contentId="main-content">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Menú</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {/* 🔹 Renderizar los ítems del menú dinámicamente */}
          {menuItems.map((item, index) => (
            <IonMenuToggle key={index}>
              <IonItem button routerLink={item.path}>
                <IonIcon slot="start" icon={item.icon} />
                <IonLabel>{item.label}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}

          {/* 🔹 Botón de Cerrar Sesión */}
          <IonMenuToggle>
            <IonItem button onClick={handleSignOut}>
              <IonIcon slot="start" icon={logOutOutline} />
              <IonLabel>Cerrar sesión</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
