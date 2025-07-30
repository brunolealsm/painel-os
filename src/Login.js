import React, { useState, useEffect } from 'react';
import './Login.css';

const API_BASE_URL = 'http://localhost:3002';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verificar se já existe um token válido ao carregar
  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();
          
          console.log('🔍 DEBUG: Resultado da verificação de token:', result);
          console.log('🔍 DEBUG: result.user:', result.user);
          console.log('🔍 DEBUG: result.user.name:', result.user?.name);
          console.log('🔍 DEBUG: result.user.username:', result.user?.username);
          
          if (result.success) {
            // Token válido, fazer login automático
            localStorage.setItem('userData', JSON.stringify(result.user));
            onLoginSuccess(result.user);
          } else {
            // Token inválido, remover do localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
          }
        } catch (error) {
          console.error('Erro ao verificar token:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      }
    };

    checkExistingToken();
  }, [onLoginSuccess]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro quando o usuário digita
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password
        })
      });

      const result = await response.json();

      console.log('🔍 DEBUG: Resultado do login:', result);
      console.log('🔍 DEBUG: result.user:', result.user);
      console.log('🔍 DEBUG: result.user.name:', result.user?.name);
      console.log('🔍 DEBUG: result.user.username:', result.user?.username);

      if (result.success) {
        // Salvar token e dados do usuário
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('userData', JSON.stringify(result.user));
        
        // Chamar callback de sucesso
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Erro no login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setError('Erro de conexão. Verifique se o servidor está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <i className="bi bi-gear-fill"></i>
          </div>
          <h1>PainelOS</h1>
          <p>Sistema de Gestão de Ordens de Serviço</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <div className="input-container">
              <i className="bi bi-person input-icon"></i>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Digite seu usuário"
                className="form-input"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="input-container">
              <i className="bi bi-lock input-icon"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua senha"
                className="form-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <i className="bi bi-exclamation-circle"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="bi bi-arrow-repeat spin"></i>
                Entrando...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right"></i>
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2024 PainelOS - Sistema de Gestão</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 