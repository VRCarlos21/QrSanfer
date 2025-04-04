import React from "react";
import ProtectedRoute from "../components/AuthGuard";
import Home from "../pages/Home";
import Admin from "../pages/Admin";
import UserPanel from "../pages/UserPanel";

interface ProtectedRoutesProps {
  userRole: string | null; // Rol del usuario
  handleSignOut: () => void; // Función para cerrar sesión
}

const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ userRole, handleSignOut }) => {
  return (
    <>
      {/* Rutas Protegidas */}
      <ProtectedRoute
        exact
        path="/Admin"
        component={Admin}
        allowedRoles={['admin']}
        userRole={userRole}
        handleSignOut={handleSignOut}
      />
      <ProtectedRoute
        exact
        path="/Home"
        component={Home}
        allowedRoles={['user']}
        userRole={userRole}
        handleSignOut={handleSignOut}
      />
      <ProtectedRoute
        exact
        path="/UserPanel"
        component={UserPanel}
        allowedRoles={['vigilante']}
        userRole={userRole}
        handleSignOut={handleSignOut}
      />
    </>
  );
};

export default ProtectedRoutes;