import { auth, db } from "../config/firebase.js";
import Usuario from "../models/Usuario.js";

/**
 * Registro de usuario con Firebase Auth y Firestore
 */
export const registrarUsuario = async (req, res) => {
  const { nombre, correo, password, rol } = req.body;

  try {
    const userRecord = await auth.createUser({
      email: correo,
      password: password,
      displayName: nombre,
    });

    const nuevoUsuario = new Usuario(userRecord.uid, nombre, correo, rol);

    await db.collection("usuarios").doc(userRecord.uid).set(nuevoUsuario);

    res.status(201).json({ message: "Usuario registrado con éxito", user: nuevoUsuario });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Inicio de sesión con Firebase Auth
 */
export const iniciarSesion = async (req, res) => {
  const { correo, password } = req.body;

  try {
    const userRecord = await auth.getUserByEmail(correo);

    if (!userRecord) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userDoc = await db.collection("usuarios").doc(userRecord.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no registrado en la base de datos" });
    }

    res.status(200).json({ message: "Inicio de sesión exitoso", user: userDoc.data() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
