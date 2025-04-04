import React, { useState, useEffect } from "react";
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route, Switch } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./services/firebaseConfig";

// Importación de componentes (organizados por categoría)
import Menu from "./components/AppMenu";
import ProtectedRoute from "./components/AuthGuard";

// Páginas públicas
import Login from "./pages/auth/login/login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Unauthorized from "./pages/Unauthorized";

// Páginas por rol
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import UserPanel from "./pages/UserPanel";
import AdminGlobal from "./pages/AdminGlobal";

// Componentes específicos
import SubirFoto from "./pages/admin/SubirFoto";
import HistorialSolicitud from "./pages/admin/HistorialSolicitud";
import CambioOficina from "./pages/admin/CambioOficina";
import SeguimientoSolicitud from "./pages/user/SeguimientoSolicitud";
import Settings from "./pages/user/Settings";
import CambiarPassword from "./pages/user/CambiarPassword";
import SelectOffice from "./pages/user/SelectOffice";
import ControlEquipos from "./pages/vigilante/ControlEquipos";
import ReportesVigilante from "./pages/vigilante/Reportes";
import HistorialLecturas from "./pages/vigilante/HistorialLecturas";
import GestionarOficina from "./pages/adminGlobal/GestionarOficinas";
import ControlRegistros from "./pages/adminGlobal/ControlRegistro";
import CrearUsuarios from "./pages/adminGlobal/CrearUsuarios";
import ControlCuentas from "./pages/adminGlobal/ControlCuentas";
import HistorialActividades from "./pages/adminGlobal/HistorialActividades";
import FotografiasEmpleados from "./pages/adminGlobal/FotografiasEmpleados";

// Estilos
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/palettes/dark.system.css";
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const auth = getAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Sesión cerrada exitosamente.");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            setUserRole(null);
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error:", error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <IonApp>
      <IonReactRouter>
        <Menu userRole={userRole} handleSignOut={handleSignOut} />

        <IonRouterOutlet id="main-content">
          <Switch>
            {/* --- Rutas Públicas --- */}
            <Route exact path="/login" component={Login} />
            <Route exact path="/register" component={Register} />
            <Route exact path="/verify-email" component={VerifyEmail} />
            <Route exact path="/unauthorized" component={Unauthorized} />

            {/* --- Rutas de Usuario Normal --- */}
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
              path="/ElegirOficina"
              component={SelectOffice}
              allowedRoles={['user']}
              userRole={userRole}
              handleSignOut={handleSignOut}

            />
            <ProtectedRoute
              exact
              path="/SeguimientoSolicitud"
              component={SeguimientoSolicitud}
              allowedRoles={['user']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/Settings"
              component={Settings}
              allowedRoles={['user', 'admin', 'vigilante', 'adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/CambiarPassword"
              component={CambiarPassword}
              allowedRoles={['user', 'admin', 'vigilante']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />

            {/* --- Rutas de Admin --- */}
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
              path="/SubirFoto"
              component={SubirFoto}
              allowedRoles={['admin']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/HistorialSolicitud"
              component={HistorialSolicitud}
              allowedRoles={['admin']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />

            {/* --- Rutas de Vigilante --- */}
            <ProtectedRoute
              exact
              path="/UserPanel"
              component={UserPanel}
              allowedRoles={['vigilante']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/ControlEquipos"
              component={ControlEquipos}
              allowedRoles={['vigilante']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/HistorialLecturas"
              component={HistorialLecturas}
              allowedRoles={['vigilante']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/ReportesVigilante"
              component={ReportesVigilante}
              allowedRoles={['vigilante']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />

            {/* --- Rutas de Admin Global --- */}
            <ProtectedRoute
              exact
              path="/adminGlobal"
              component={AdminGlobal}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/GestionarOficina"
              component={GestionarOficina}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/CambioOficina"
              component={CambioOficina}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/CrearUsuarios"
              component={CrearUsuarios}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/ControlRegistro"
              component={ControlRegistros}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/ControlCuentas"
              component={ControlCuentas}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/HistorialActividades"
              component={HistorialActividades}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />
            <ProtectedRoute
              exact
              path="/FotografiasEmpleados"
              component={FotografiasEmpleados}
              allowedRoles={['adminGlobal']}
              userRole={userRole}
              handleSignOut={handleSignOut}
            />

            <Route exact path="/">
              {userRole ? <Redirect to="/home" /> : <Redirect to="/login" />}
            </Route>
            <Route>
              <Redirect to="/login" />
            </Route>
          </Switch>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};
export default App;