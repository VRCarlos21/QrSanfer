import { auth, db } from "../config/firebase.js";

/**
 * Middleware para verificar token de autenticación
 */
export const verificarToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado, token no proporcionado" });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
};

/**
 * Middleware para verificar rol de usuario
 */
export const verificarRol = (rolesPermitidos) => {
  return async (req, res, next) => {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get();

    if (!userDoc.exists || !rolesPermitidos.includes(userDoc.data().rol)) {
      return res.status(403).json({ error: "Acceso denegado, permisos insuficientes" });
    }

    next();
  };
};
