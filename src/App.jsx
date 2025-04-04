// src/App.jsx
import React from 'react';

function App() {
  const testBackend = async () => {
    const response = await fetch('http://localhost:5000/');
    const data = await response.text();
    console.log(data);
  };

  return (
    <div>
      <h1>Tu Aplicación React/Ionic</h1>
      <button onClick={testBackend}>Probar Backend</button>
    </div>
  );
}

export default App;