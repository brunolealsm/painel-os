import './App.css';

function App() {
  return (
    <div className="App">
      <div className="container">
        <div className="hello-world-card">
          <h1 className="title">Hello World! 🌍</h1>
          <h2 className="subtitle">Bem-vindo ao PainelOS</h2>
          <p className="description">
            Este é o início do seu novo projeto React conectado ao GitHub CLI.
            Agora você pode começar a desenvolver suas funcionalidades incríveis!
          </p>
          <div className="features">
            <div className="feature">
              <span className="icon">⚛️</span>
              <span>React</span>
            </div>
            <div className="feature">
              <span className="icon">📦</span>
              <span>Git</span>
            </div>
            <div className="feature">
              <span className="icon">🚀</span>
              <span>GitHub CLI</span>
            </div>
          </div>
          <button className="start-button" onClick={() => alert('Vamos começar a desenvolver!')}>
            Começar a Desenvolver
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
