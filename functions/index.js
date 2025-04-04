const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');


admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "joavazrst123@gmail.com",
    pass: "oikaffnktckkpnzz",
  },
});

// 🔹 Función para enviar correo de confirmación de solicitud
exports.sendRequestConfirmation = functions.firestore
  .document('requests/{requestId}')
  .onCreate(async (snap, context) => {
    const requestData = snap.data();

    const mailOptions = {
      from: "joavazrst123@gmail.com",
      to: requestData.email,
      subject: "Solicitud recibida",
      html: `
        <h2>¡Hola ${requestData.name}!</h2>
        <p>Tu solicitud ha sido registrada correctamente y está en proceso de validación.</p>
        <p>En breve recibirás una respuesta.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Correo de confirmación enviado a", requestData.email);
    } catch (error) {
      console.error("Error al enviar el correo:", error);
    }
  });

// 🔹 Función que detecta cambios en la solicitud
exports.processRequest = functions.firestore
  .document("requests/{requestId}")
  .onUpdate(async (change, context) => {
    const requestId = context.params.requestId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // ✅ **Si la solicitud fue APROBADA**
    if (beforeData.status !== "Aprobado" && afterData.status === "Aprobado") {
      try {
        console.log(`✅ Generando QR para la solicitud ${requestId}`);

        // 🔹 1️⃣ Generar el código QR con los datos de la solicitud
        const qrData = `Nombre: ${afterData.name}
        Empleado: ${afterData.employeeNumber}
        Fecha: ${afterData.date}
        PDF: ${afterData.pdfUrl}`;

        const qrFilePath = path.join("/tmp", `qr_${requestId}.png`);

        // Generar el QR y guardarlo como archivo PNG en /tmp
        await QRCode.toFile(qrFilePath, qrData);

        console.log(`✅ QR generado y guardado en: ${qrFilePath}`);

        // 🔹 2️⃣ Leer el QR como base64 para almacenarlo en Firestore
        const qrImageBase64 = fs.readFileSync(qrFilePath, { encoding: "base64" });
        const qrImageDataUrl = `data:image/png;base64,${qrImageBase64}`;

        // 🔹 3️⃣ Guardar el QR en Firestore
        await admin.firestore().doc(`requests/${requestId}`).update({ qrUrl: qrImageDataUrl });

        console.log(`✅ QR guardado en Firestore para la solicitud ${requestId}`);

        // 🔹 4️⃣ Enviar correo con el QR como archivo adjunto
        const mailOptions = {
          from: "joavazrst123@gmail.com",
          to: afterData.email,
          subject: "Solicitud Aprobada - Código QR",
          html: `
            <h2>¡Hola ${afterData.name}!</h2>
            <p>Tu solicitud ha sido aprobada.</p>
            <p><strong>DESCARGA EL QR.</strong></p>
          `,
          attachments: [
            {
              filename: `QR_${afterData.employeeNumber}.png`,
              path: qrFilePath,
              contentType: "image/png",
            },
          ],
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo enviado a ${afterData.email} con el QR adjunto.`);

        // 🔹 5️⃣ Eliminar el archivo temporal para ahorrar espacio
        fs.unlinkSync(qrFilePath);
        console.log(`✅ Archivo QR eliminado de /tmp.`);

      } catch (error) {
        console.error("❌ Error generando el QR o enviando el correo:", error);
      }
    }

    // ❌ **Si la solicitud fue RECHAZADA**
    if (beforeData.status !== "Rechazado" && afterData.status === "Rechazado") {
      try {
        console.log(`❌ Enviando correo de rechazo para la solicitud ${requestId}`);

        const rejectionMailOptions = {
          from: "joavazrst123@gmail.com",
          to: afterData.email,
          subject: "Solicitud Rechazada",
          html: `
            <h2>¡Hola ${afterData.name}!</h2>
            <p>Lo sentimos, pero tu solicitud ha sido <strong>rechazada</strong>.</p>
            <p>Si necesitas más información, por favor contacta al administrador.</p>
          `,
        };

        await transporter.sendMail(rejectionMailOptions);
        console.log(`✅ Correo de rechazo enviado a ${afterData.email}`);

      } catch (error) {
        console.error("❌ Error enviando el correo de rechazo:", error);
      }
    }

    return null;
  });

// 🔹 Función para registrar usuarios con roles
exports.createUserWithRole = functions.https.onCall(async (data, context) => {
  const { email, password, role } = data;

  if (!email || !password || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Faltan campos obligatorios (email, password, role)."
    );
  }

  try {
    // Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Guardar el rol del usuario en Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email,
      role,
    });

    return { message: "Usuario creado con éxito.", userId: userRecord.uid };
  } catch (error) {
    console.error("Error al crear usuario:", error);
    throw new functions.https.HttpsError("internal", "Error al crear usuario.");
  }
});

// 🔹 Función para verificar el rol del usuario
exports.checkUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión para acceder a esta función.");
  }

  const userId = context.auth.uid;

  try {
    const userDocRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "No se encontraron datos del usuario.");
    }

    const userData = userDoc.data();
    return { role: userData.role };
  } catch (error) {
    console.error("Error al verificar el rol del usuario:", error);
    throw new functions.https.HttpsError("internal", "Error al verificar el rol del usuario.");
  }
});


exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
  const { email } = data;

  if (!email) {
      throw new functions.https.HttpsError("invalid-argument", "Se requiere un correo electrónico.");
  }

  try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(user.uid);
      return { success: true, message: `Usuario con correo ${email} eliminado correctamente.` };
  } catch (error) {
      console.error("Error al eliminar usuario:", error);
      throw new functions.https.HttpsError("internal", "No se pudo eliminar el usuario.");
  }
});
