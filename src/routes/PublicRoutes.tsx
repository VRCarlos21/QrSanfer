import React from "react";
import { Route, Redirect, Switch } from "react-router-dom";
import Login from "../pages/auth/login/login";
import Register from "../pages/Register";
import VerifyEmail from "../pages/VerifyEmail";
import Unauthorized from "../pages/Unauthorized";

const PublicRoutes: React.FC = () => {
  return (
    <Switch>
      {/* Rutas Públicas */}
      <Route exact path="/login" component={Login} />
      <Route exact path="/register" component={Register} />
      <Route exact path="/verify-email" component={VerifyEmail} />
      <Route exact path="/unauthorized" component={Unauthorized} />

      {/* Redirección por defecto al login */}
      <Route exact path="/">
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
};

export default PublicRoutes;