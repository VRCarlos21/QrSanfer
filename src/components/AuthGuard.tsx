import React from "react";
import { Route, Redirect, RouteProps } from "react-router-dom";

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType<any>; // El componente que se renderizará
  allowedRoles: string[]; // Roles permitidos para acceder a la ruta
  userRole: string | null; // Rol del usuario (prop pasado desde App)
  handleSignOut: () => void; // Función para cerrar sesión
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, allowedRoles, userRole, ...rest }) => {
  return (
    <Route
      {...rest}
      render={(props) =>
        userRole && allowedRoles.includes(userRole) ? (
          <Component {...props} />
        ) : (
          <Redirect to="/unauthorized" />
        )
      }
    />
  );
};

export default ProtectedRoute;