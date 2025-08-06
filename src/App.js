import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  ConnectionLineType, 
  MarkerType, 
  Position 
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import html2canvas from 'html2canvas';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import Login from './Login';

// Configuração da API
const API_BASE_URL = 'http://localhost:3002';

// Mock data removido - agora usando dados reais da base de dados

// Dados de ordens são carregados via API - inicialização vazia
const availableOrders = [];

// Componente de configuração do banco de dados (movido para fora para evitar recriação)
const DatabaseConfig = ({ 
  dbConfig, 
  setDbConfig, 
  connectionStatus, 
  setConnectionStatus, 
  isTestingConnection, 
  setIsTestingConnection, 
  connectionTested, 
  setConnectionTested 
}) => {
  const handleInputChange = (field, value) => {
    setDbConfig(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset status quando alterar configurações
    setConnectionStatus(null);
    setConnectionTested(false);
  };

  const testConnection = async () => {
    if (!dbConfig.host || !dbConfig.database || !dbConfig.username || !dbConfig.password) {
      setConnectionStatus({
        success: false,
        message: 'Por favor, preencha todos os campos obrigatórios.'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      console.log('🔄 Testando conexão com o banco de dados...');
      const response = await fetch(`${API_BASE_URL}/api/config/database/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: dbConfig.host,
          database: dbConfig.database,
          username: dbConfig.username,
          password: dbConfig.password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Conexão testada com sucesso!');
        setConnectionStatus({
          success: true,
          message: result.message
        });
        setConnectionTested(true);
      } else {
        console.log('❌ Erro na conexão:', result.message);
        setConnectionStatus({
          success: false,
          message: result.message
        });
        setConnectionTested(false);
      }
    } catch (error) {
      console.error('❌ Erro ao testar conexão:', error);
      setConnectionStatus({
        success: false,
        message: `Erro de conexão: ${error.message}`
      });
      setConnectionTested(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveConfiguration = async () => {
    if (!connectionTested) {
      setConnectionStatus({
        success: false,
        message: 'É necessário testar a conexão antes de salvar.'
      });
      return;
    }

    try {
      console.log('💾 Salvando configuração do banco de dados...');
      const response = await fetch(`${API_BASE_URL}/api/config/database/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: dbConfig.host,
          database: dbConfig.database,
          username: dbConfig.username,
          password: dbConfig.password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Configuração salva com sucesso!');
        // Também salvar no localStorage para persistência local
        localStorage.setItem('dbConfig', JSON.stringify(dbConfig));
        
        setConnectionStatus({
          success: true,
          message: result.message
        });
      } else {
        console.log('❌ Erro ao salvar:', result.message);
        setConnectionStatus({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      setConnectionStatus({
        success: false,
        message: `Erro ao salvar: ${error.message}`
      });
    }
  };

  return (
    <div className="database-config">
      <h3 className="config-title">Configuração do Banco de Dados</h3>
      <p className="config-description">Configure a conexão com o Microsoft SQL Server</p>
      
      <div className="config-form">
        <div className="form-group">
          <label htmlFor="host">IP ou Hostname *</label>
          <input
            type="text"
            id="host"
            value={dbConfig.host}
            onChange={(e) => handleInputChange('host', e.target.value)}
            placeholder="192.168.1.100 ou servidor.empresa.com"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="database">Nome da Base de Dados *</label>
          <input
            type="text"
            id="database"
            value={dbConfig.database}
            onChange={(e) => handleInputChange('database', e.target.value)}
            placeholder="PainelOS_DB"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">Usuário *</label>
          <input
            type="text"
            id="username"
            value={dbConfig.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="sa ou usuario_db"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha *</label>
          <input
            type="password"
            id="password"
            value={dbConfig.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="••••••••"
            className="form-input"
          />
        </div>

        <div className="form-actions">
          <button 
            onClick={testConnection}
            disabled={isTestingConnection}
            className="btn-test"
          >
            {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
          </button>

          <button 
            onClick={saveConfiguration}
            disabled={!connectionTested}
            className="btn-save"
          >
            Salvar Configuração
          </button>
        </div>

        {connectionStatus && (
          <div className={`connection-status ${connectionStatus.success ? 'success' : 'error'}`}>
            <span className="status-icon">
              {connectionStatus.success ? '✓' : '✗'}
            </span>
            <span className="status-message">{connectionStatus.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de configuração dos processos
const ProcessConfig = () => {
  // Estado usando useRef para evitar problemas de renderização
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Usar refs para os inputs - abordagem mais direta
  const statusInserviceRef = useRef(null);
  const statusForwardRef = useRef(null);
  const statusTomorrowRef = useRef(null);
  const statusUptodateRef = useRef(null);
  const statusOpenRef = useRef(null);
  const statusFinishRef = useRef(null);

  // Função para carregar dados da API
  const loadData = async () => {
    try {
      setIsLoading(true);
      setMessage('');
      
      const response = await fetch(`${API_BASE_URL}/api/config/process`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Definir valores diretamente nos inputs
        if (statusInserviceRef.current) statusInserviceRef.current.value = result.data.status_inservice || '';
        if (statusForwardRef.current) statusForwardRef.current.value = result.data.status_forward || '';
        if (statusTomorrowRef.current) statusTomorrowRef.current.value = result.data.status_tomorrow || '';
        if (statusUptodateRef.current) statusUptodateRef.current.value = result.data.status_uptodate || '';
        if (statusOpenRef.current) statusOpenRef.current.value = result.data.status_open || '';
        if (statusFinishRef.current) statusFinishRef.current.value = result.data.status_finish || '';
      } else {
        // Valores padrão
        if (statusInserviceRef.current) statusInserviceRef.current.value = 'ES';
        if (statusForwardRef.current) statusForwardRef.current.value = 'ET';
        if (statusTomorrowRef.current) statusTomorrowRef.current.value = 'PD';
        if (statusUptodateRef.current) statusUptodateRef.current.value = 'ED';
        if (statusOpenRef.current) statusOpenRef.current.value = 'EA';
        if (statusFinishRef.current) statusFinishRef.current.value = 'FN';
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados da API');
      // Valores padrão em caso de erro
      if (statusInserviceRef.current) statusInserviceRef.current.value = 'ES';
      if (statusForwardRef.current) statusForwardRef.current.value = 'ET';
      if (statusTomorrowRef.current) statusTomorrowRef.current.value = 'PD';
      if (statusUptodateRef.current) statusUptodateRef.current.value = 'ED';
      if (statusOpenRef.current) statusOpenRef.current.value = 'EA';
      if (statusFinishRef.current) statusFinishRef.current.value = 'FN';
    } finally {
      setIsLoading(false);
    }
  };

  // Função para salvar dados
  const saveData = async () => {
    try {
      setIsSaving(true);
      setMessage('');
      
      const formData = {
        status_inservice: statusInserviceRef.current?.value || '',
        status_forward: statusForwardRef.current?.value || '',
        status_tomorrow: statusTomorrowRef.current?.value || '',
        status_uptodate: statusUptodateRef.current?.value || '',
        status_open: statusOpenRef.current?.value || '',
        status_finish: statusFinishRef.current?.value || ''
      };
      
      const response = await fetch(`${API_BASE_URL}/api/config/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('Configurações salvas com sucesso!');
      } else {
        setMessage('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  // Função para converter para maiúsculas
  const handleInputChange = (ref) => {
    if (ref.current) {
      ref.current.value = ref.current.value.toUpperCase();
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="database-config">
        <h3 className="config-title">Configuração de processos</h3>
        <p className="config-description">Configure o processo de ordens de serviço</p>
        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
          Carregando configurações...
        </div>
      </div>
    );
  }

  return (
    <div className="database-config">
      <h3 className="config-title">Configuração de processos</h3>
      <p className="config-description">Configure o processo de ordens de serviço</p>
      
      <div className="config-form">
        <div className="form-group">
          <label htmlFor="status_inservice">Em serviço</label>
          <input
            ref={statusInserviceRef}
            type="text"
            id="status_inservice"
            placeholder="Ex: ES"
            className="form-input process-input"
            maxLength="2"
            onChange={() => handleInputChange(statusInserviceRef)}
            style={{
              textTransform: 'uppercase',
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: '1px',
              width: '50px',
              maxWidth: '50px',
              minWidth: '50px',
              fontSize: '12px',
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '3px',
              boxSizing: 'border-box',
              height: '20px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status_forward">Encaminhado ao técnico</label>
          <input
            ref={statusForwardRef}
            type="text"
            id="status_forward"
            placeholder="Ex: ET"
            className="form-input process-input"
            maxLength="2"
            onChange={() => handleInputChange(statusForwardRef)}
            style={{
              textTransform: 'uppercase',
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: '1px',
              width: '50px',
              maxWidth: '50px',
              minWidth: '50px',
              fontSize: '12px',
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '3px',
              boxSizing: 'border-box',
              height: '20px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status_tomorrow">Para atender no próximo dia</label>
          <input
            ref={statusTomorrowRef}
            type="text"
            id="status_tomorrow"
            placeholder="Ex: PD"
            className="form-input process-input"
            maxLength="2"
            onChange={() => handleInputChange(statusTomorrowRef)}
            style={{
              textTransform: 'uppercase',
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: '1px',
              width: '50px',
              maxWidth: '50px',
              minWidth: '50px',
              fontSize: '12px',
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '3px',
              boxSizing: 'border-box',
              height: '20px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status_uptodate">Em dia ou futura</label>
          <input
            ref={statusUptodateRef}
            type="text"
            id="status_uptodate"
            placeholder="Ex: ED"
            className="form-input process-input"
            maxLength="2"
            onChange={() => handleInputChange(statusUptodateRef)}
            style={{
              textTransform: 'uppercase',
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: '1px',
              width: '50px',
              maxWidth: '50px',
              minWidth: '50px',
              fontSize: '12px',
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '3px',
              boxSizing: 'border-box',
              height: '20px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status_open">Em Aberto</label>
          <input
            ref={statusOpenRef}
            type="text"
            id="status_open"
            placeholder="Ex: EA"
            className="form-input process-input"
            maxLength="2"
            onChange={() => handleInputChange(statusOpenRef)}
            style={{
              textTransform: 'uppercase',
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: '1px',
              width: '50px',
              maxWidth: '50px',
              minWidth: '50px',
              fontSize: '12px',
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '3px',
              boxSizing: 'border-box',
              height: '20px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status_finish">Finalizado</label>
          <input
            ref={statusFinishRef}
            type="text"
            id="status_finish"
            placeholder="Ex: FN"
            className="form-input process-input"
            maxLength="2"
            onChange={() => handleInputChange(statusFinishRef)}
            style={{
              textTransform: 'uppercase',
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: '1px',
              width: '50px',
              maxWidth: '50px',
              minWidth: '50px',
              fontSize: '12px',
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '3px',
              boxSizing: 'border-box',
              height: '20px'
            }}
          />
        </div>

        <div className="form-actions">
          <button 
            onClick={saveData}
            disabled={isSaving}
            style={{
              background: '#7c4dff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {isSaving ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            background: message.includes('sucesso') ? '#f0fff4' : '#fed7d7',
            color: message.includes('sucesso') ? '#22543d' : '#742a2a',
            border: `1px solid ${message.includes('sucesso') ? '#9ae6b4' : '#fc8181'}`
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de configuração da empresa
const CompanyConfig = () => {
  // Estado usando useRef para evitar problemas de renderização
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Usar refs para os inputs - abordagem mais direta
  const companyRef = useRef(null);
  const tokenRef = useRef(null);

  // Função para carregar dados da API
  const loadData = async () => {
    try {
      setIsLoading(true);
      setMessage('');
      
      const response = await fetch(`${API_BASE_URL}/api/config/company`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Definir valores diretamente nos inputs
        if (companyRef.current) companyRef.current.value = result.data.company || '';
        if (tokenRef.current) tokenRef.current.value = result.data.token || '';
      } else {
        // Valores padrão
        if (companyRef.current) companyRef.current.value = '';
        if (tokenRef.current) tokenRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
      setMessage('Erro ao carregar dados da API');
      // Valores padrão em caso de erro
      if (companyRef.current) companyRef.current.value = '';
      if (tokenRef.current) tokenRef.current.value = '';
    } finally {
      setIsLoading(false);
    }
  };

  // Função para salvar dados
  const saveData = async () => {
    try {
      setIsSaving(true);
      setMessage('');
      
      const formData = {
        company: companyRef.current?.value || '',
        token: tokenRef.current?.value || ''
      };
      
      const response = await fetch(`${API_BASE_URL}/api/config/company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('Configurações da empresa salvas com sucesso!');
        // Recarregar a página para atualizar o header com o novo nome da empresa
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage('Erro ao salvar configurações da empresa');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage('Erro ao salvar configurações da empresa');
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="database-config">
        <h3 className="config-title">Configuração da empresa</h3>
        <p className="config-description">Configure as informações da empresa</p>
        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
          Carregando configurações...
        </div>
      </div>
    );
  }

  return (
    <div className="database-config">
      <h3 className="config-title">Configuração da empresa</h3>
      <p className="config-description">Configure as informações da empresa</p>
      
      <div className="config-form">
        <div className="form-group">
          <label htmlFor="company">Nome da Empresa</label>
          <input
            ref={companyRef}
            type="text"
            id="company"
            placeholder="Digite o nome da empresa"
            className="form-input"
            style={{
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '14px',
              width: '100%',
              maxWidth: '400px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="token">Token</label>
          <input
            ref={tokenRef}
            type="text"
            id="token"
            placeholder="Digite o token"
            className="form-input"
            style={{
              background: 'white',
              color: '#2d3748',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '14px',
              width: '100%',
              maxWidth: '400px'
            }}
          />
        </div>

        <div className="form-actions">
          <button 
            onClick={saveData}
            disabled={isSaving}
            style={{
              background: '#7c4dff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {isSaving ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            background: message.includes('sucesso') ? '#f0fff4' : '#fed7d7',
            color: message.includes('sucesso') ? '#22543d' : '#742a2a',
            border: `1px solid ${message.includes('sucesso') ? '#9ae6b4' : '#fc8181'}`
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para mostrar nome de técnico com tooltip se necessário
const TechnicianName = ({ name, maxLength = 25 }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const shouldTruncate = name.length > maxLength;
  const truncatedName = shouldTruncate ? `${name.substring(0, maxLength)}...` : name;
  
  return (
    <span 
      className={`technician-name ${shouldTruncate ? 'truncated' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title={shouldTruncate ? name : undefined}
    >
      {truncatedName}
      {shouldTruncate && showTooltip && (
        <div className="technician-tooltip">
          {name}
        </div>
      )}
    </span>
  );
};

// Modal de carregamento inicial
const InitialLoadingModal = ({ isOpen, steps, hasError, errorMessage, onContinue }) => {
  if (!isOpen) return null;

  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <i className="bi bi-check-circle-fill step-icon completed"></i>;
      case 'loading':
        return <i className="bi bi-arrow-repeat step-icon loading spin"></i>;
      case 'error':
        return <i className="bi bi-x-circle-fill step-icon error"></i>;
      case 'skipped':
        return <i className="bi bi-dash-circle step-icon skipped"></i>;
      default:
        return <i className="bi bi-circle step-icon pending"></i>;
    }
  };

  const getStepClass = (status) => {
    switch (status) {
      case 'completed':
        return 'step-completed';
      case 'loading':
        return 'step-loading';
      case 'error':
        return 'step-error';
      case 'skipped':
        return 'step-skipped';
      default:
        return 'step-pending';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'loading':
        return 'Carregando...';
      case 'error':
        return 'Erro';
      case 'skipped':
        return 'Ignorado';
      default:
        return 'Aguardando';
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const hasErrors = steps.some(s => s.status === 'error');

  return (
    <div className="initial-loading-overlay">
      <div className="initial-loading-modal">
        <div className={`loading-header ${hasErrors ? 'error' : ''}`}>
          <div className="loading-logo">
            <i className={hasErrors ? "bi bi-exclamation-triangle-fill" : "bi bi-gear-fill"}></i>
          </div>
          <h2>{hasErrors ? 'Problema na Inicialização' : 'Inicializando Sistema'}</h2>
          <p>{hasErrors ? 'Alguns problemas foram encontrados durante o carregamento.' : 'Carregando dados e configurações...'}</p>
        </div>
        
        {hasError && errorMessage && (
          <div className="loading-error-message">
            <div className="error-icon">
              <i className="bi bi-exclamation-circle"></i>
            </div>
            <div className="error-text">{errorMessage}</div>
          </div>
        )}
        
        <div className="loading-steps">
          {steps.map((step, index) => (
            <div key={step.id} className={`loading-step ${getStepClass(step.status)}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <div className="step-title">{step.name}</div>
                <div className="step-status">
                  {getStatusText(step.status)}
                </div>
              </div>
              <div className="step-icon-container">
                {getStepIcon(step.status)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="loading-footer">
          <div className="loading-progress">
            <div className="progress-bar">
              <div 
                className={`progress-fill ${hasErrors ? 'error' : ''}`}
                style={{
                  width: `${(completedSteps / steps.length) * 100}%`
                }}
              ></div>
            </div>
            <div className="progress-text">
              {hasErrors ? 
                `${completedSteps} de ${steps.length} etapas concluídas (com problemas)` :
                `${completedSteps} de ${steps.length} etapas concluídas`
              }
            </div>
          </div>
          
          {hasError && onContinue && (
            <div className="loading-actions">
              <button className="btn-continue" onClick={onContinue}>
                <i className="bi bi-arrow-right"></i>
                Continuar mesmo assim
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal de status das ordens
const OrderStatusModal = ({ isOpen, results, summary, onClose }) => {
  if (!isOpen) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <i className="bi bi-check-circle-fill status-icon success"></i>;
      case 'error':
        return <i className="bi bi-x-circle-fill status-icon error"></i>;
      default:
        return <i className="bi bi-dash-circle status-icon pending"></i>;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'success':
        return 'order-status-success';
      case 'error':
        return 'order-status-error';
      default:
        return 'order-status-pending';
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="modal-overlay">
      <div className="order-status-modal">
        <div className="order-status-header">
          <div className="order-status-title">
            <i className="bi bi-arrows-move"></i>
            <h3>Status da Movimentação</h3>
          </div>
          <button className="btn-close-status" onClick={onClose}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div className="order-status-summary">
          <div className="summary-stats">
            <div className="stat-item success">
              <i className="bi bi-check-circle"></i>
              <span className="stat-number">{successCount}</span>
              <span className="stat-label">Sucesso</span>
            </div>
            {errorCount > 0 && (
              <div className="stat-item error">
                <i className="bi bi-x-circle"></i>
                <span className="stat-number">{errorCount}</span>
                <span className="stat-label">Erro</span>
              </div>
            )}
          </div>
          {summary && (
            <div className="summary-info">
              <strong>Seção:</strong> {summary.targetSection}<br/>
              <strong>Técnico:</strong> {summary.technicianName || 'N/A'}
            </div>
          )}
        </div>

        <div className="order-status-content">
          <div className="order-status-list">
            {results.map((result, index) => (
              <div key={index} className={`order-status-item ${getStatusClass(result.status)}`}>
                <div className="order-status-info">
                  <div className="order-status-icon">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="order-status-details">
                    <div className="order-id">#{result.orderId}</div>
                    <div className="order-cliente">{result.cliente}</div>
                    {result.tecnico && result.tecnico !== 'N/A' && (
                      <div className="order-tecnico">Técnico: {result.tecnico}</div>
                    )}
                    {result.status === 'success' && (
                      <div className="order-status-text success">
                        Movida para "{result.targetSection || 'Em Aberto'}"
                      </div>
                    )}
                    {result.status === 'error' && (
                      <div className="order-status-text error">
                        {result.errorMessage || 'Erro desconhecido'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-status-footer">
          <button className="btn-close-status-primary" onClick={onClose}>
            <i className="bi bi-check2"></i>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de carregamento para atualização de dados
const RefreshLoadingModal = ({ isOpen, progress }) => {
  if (!isOpen) return null;

  return (
    <div className="refresh-loading-overlay">
      <div className="refresh-loading-modal">
        <div className="refresh-loading-content">
          <div className="refresh-loading-icon">
            <div className="refresh-spinner"></div>
          </div>
          <h3 className="refresh-loading-title">Atualizando dados</h3>
          <p className="refresh-loading-message">{progress.message}</p>
          
          <div className="refresh-progress-container">
            <div className="refresh-progress-bar">
              <div 
                className="refresh-progress-fill"
                style={{ 
                  width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%'
                }}
              ></div>
            </div>
            <div className="refresh-progress-text">
              {progress.total > 0 ? `${progress.current} de ${progress.total} etapas concluídas` : 'Iniciando...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de gerenciamento de usuários
const UserManagement = ({
  users,
  setUsers,
  isLoadingUsers,
  setIsLoadingUsers,
  showUserForm,
  setShowUserForm,
  editingUser,
  setEditingUser,
  showPasswordUser,
  setShowPasswordUser,
  userFormData,
  setUserFormData,
  userFormErrors,
  setUserFormErrors
}) => {
  
  // Função para carregar usuários
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.users);
      } else {
        console.error('Erro ao carregar usuários:', result.message);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Carregar usuários ao montar o componente
  useEffect(() => {
    loadUsers();
  }, []);

  // Função para abrir formulário de novo usuário
  const handleNewUser = () => {
    setUserFormData({
      user: '',
      password: '',
      type: 'Usuário',
      coordinator: false,
      blacktheme: false
    });
    setEditingUser(null);
    setUserFormErrors({});
    setShowUserForm(true);
  };

  // Função para editar usuário
  const handleEditUser = (user) => {
    setUserFormData({
      user: user.user,
      password: '',
      type: user.type,
      coordinator: user.coordinator,
      blacktheme: user.blacktheme
    });
    setEditingUser(user);
    setUserFormErrors({});
    setShowUserForm(true);
  };

  // Função para excluir usuário
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Deseja realmente excluir este usuário?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        loadUsers(); // Recarregar lista
        alert('Usuário excluído com sucesso!');
      } else {
        alert('Erro ao excluir usuário: ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    }
  };

  // Função para alterar campos do formulário
  const handleFormChange = (field, value) => {
    setUserFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo
    if (userFormErrors[field]) {
      setUserFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Função para salvar usuário
  const handleSaveUser = async () => {
    const errors = {};
    
    // Validações
    if (!userFormData.user.trim()) {
      errors.user = 'Nome do usuário é obrigatório';
    }
    
    if (!userFormData.password || userFormData.password.length < 4) {
      errors.password = 'Senha deve ter no mínimo 4 caracteres';
    }
    
    if (Object.keys(errors).length > 0) {
      setUserFormErrors(errors);
      return;
    }

    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser 
        ? `${API_BASE_URL}/api/users/${editingUser.id}` 
        : `${API_BASE_URL}/api/users`;
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userFormData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowUserForm(false);
        loadUsers(); // Recarregar lista
        alert(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
      } else {
        alert('Erro ao salvar usuário: ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário');
    }
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h3 className="config-title">Gerenciamento de Usuários</h3>
        <button 
          className="btn-new-user"
          onClick={handleNewUser}
        >
          + Novo Usuário
        </button>
      </div>

      {isLoadingUsers ? (
        <div className="loading-users">Carregando usuários...</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome de Usuário</th>
                <th>Tipo</th>
                <th>Coordenador</th>
                <th>Tema Escuro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.user}</td>
                  <td>
                    <span className={`user-type-badge ${user.type === 'Administrador' ? 'admin' : 'user'}`}>
                      {user.type}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.coordinator ? 'yes' : 'no'}`}>
                      {user.coordinator ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.blacktheme ? 'yes' : 'no'}`}>
                      {user.blacktheme ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td>
                    <div className="user-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => handleEditUser(user)}
                        title="Editar usuário"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Excluir usuário"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {users.length === 0 && (
            <div className="no-users">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      )}

      {showUserForm && (
        <div className="user-form-overlay">
          <div className="user-form">
            <div className="user-form-header">
              <h4>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h4>
              <button 
                className="btn-close"
                onClick={() => setShowUserForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="user-form-content">
              <div className="form-group">
                <label>Nome do Usuário *</label>
                <input
                  type="text"
                  value={userFormData.user}
                  onChange={(e) => handleFormChange('user', e.target.value)}
                  className={`form-input ${userFormErrors.user ? 'error' : ''}`}
                  placeholder="Digite o nome do usuário"
                />
                {userFormErrors.user && (
                  <span className="error-message">{userFormErrors.user}</span>
                )}
              </div>

              <div className="form-group">
                <label>Senha *</label>
                <div className="password-input-container">
                  <input
                    type={showPasswordUser ? 'text' : 'password'}
                    value={userFormData.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    className={`form-input ${userFormErrors.password ? 'error' : ''}`}
                    placeholder="Digite a senha (mínimo 4 caracteres)"
                  />
                  <button 
                    type="button"
                    className="btn-show-password"
                    onClick={() => setShowPasswordUser(!showPasswordUser)}
                  >
                    {showPasswordUser ? '🙈' : '👁️'}
                  </button>
                </div>
                {userFormErrors.password && (
                  <span className="error-message">{userFormErrors.password}</span>
                )}
              </div>

              <div className="form-group">
                <label>Tipo de Usuário *</label>
                <select
                  value={userFormData.type}
                  onChange={(e) => handleFormChange('type', e.target.value)}
                  className="form-select"
                >
                  <option value="Usuário">Usuário</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={userFormData.coordinator}
                    onChange={(e) => handleFormChange('coordinator', e.target.checked)}
                  />
                  <span className="checkbox-text">Coordenador</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={userFormData.blacktheme}
                    onChange={(e) => handleFormChange('blacktheme', e.target.checked)}
                  />
                  <span className="checkbox-text">Tema Escuro</span>
                </label>
              </div>
            </div>

            <div className="user-form-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowUserForm(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-save"
                onClick={handleSaveUser}
              >
                {editingUser ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  // Estados de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const [activeSection, setActiveSection] = useState('Board');
  const [activeFilters, setActiveFilters] = useState({
    coordenador: null,
    area: null,
    tecnico: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [techniqueColumns, setTechniqueColumns] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [isDragOverOpen, setIsDragOverOpen] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  
  // Estados para filtros da coluna Em Aberto
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState('cidade');
  const [selectedColumnFilters, setSelectedColumnFilters] = useState({
    cidade: [],
    bairro: [],
    cliente: [],
    tipoOS: [], // Removido filtro padrão para mostrar todos os tipos
    sla: [], // Filtro SLA
    equipamento: [], // Filtro Equipamento
    status: [] // Novo filtro Status
  });
  
  // Estado para controlar se o filtro inicial foi aplicado
  const [initialFilterApplied, setInitialFilterApplied] = useState(false);

  // Estados para filtros das colunas de técnicos
  const [technicianFilters, setTechnicianFilters] = useState({});
  const [showTechnicianFilter, setShowTechnicianFilter] = useState({});
  const [technicianFilterPositions, setTechnicianFilterPositions] = useState({});
  
  // Estados para menu das colunas de técnicos
  const [showTechnicianMenu, setShowTechnicianMenu] = useState({});
  const [technicianMenuPositions, setTechnicianMenuPositions] = useState({});
  
  // Estados para modal do roteiro de hoje
  const [showTodayRouteModal, setShowTodayRouteModal] = useState({});
  
  // Estados para o modal de rota
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeModalData, setRouteModalData] = useState(null);
  const [routeModalLoading, setRouteModalLoading] = useState(false);
  const [routeModalError, setRouteModalError] = useState(null);
  
  // Ref e estado para preservar posição do scroll da coluna Em Aberto
  const openColumnScrollRef = useRef(null);
  const lastScrollPosition = useRef(0);
  const cityScrollPositions = useRef({});
  const [openCityDropdown, setOpenCityDropdown] = useState(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const clickTimeoutRef = useRef(null);
  
  // Estados para a barra lateral do pedido
  const [showOrderSidebar, setShowOrderSidebar] = useState(false);
  const [selectedOrderData, setSelectedOrderData] = useState(null);
  const [pedidoDetails, setPedidoDetails] = useState(null);
  const [loadingPedido, setLoadingPedido] = useState(false);
  const [pedidoError, setPedidoError] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState(null);
  
  // Estados para a barra lateral do equipamento
  const [showEquipmentSidebar, setShowEquipmentSidebar] = useState(false);
  const [selectedEquipmentData, setSelectedEquipmentData] = useState(null);

  // Estados para área Equipe
  const [teamData, setTeamData] = useState({
    coordenadores: [],
    areas: [],
    tecnicos: []
  });
  
  // Estados para carregar técnicos da API
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);
  const [techniciansError, setTechniciansError] = useState(null);
  
  // Estados para carregar áreas da API
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [areasError, setAreasError] = useState(null);
  
  // Estados para carregar coordenadores da API
  const [isLoadingCoordinators, setIsLoadingCoordinators] = useState(false);
  const [coordinatorsError, setCoordinatorsError] = useState(null);
  
  // Estados para carregar vínculos técnico-área da API
  const [isLoadingAreaTeam, setIsLoadingAreaTeam] = useState(false);
  const [areaTeamError, setAreaTeamError] = useState(null);
  
  // Estados para carregar vínculos área-coordenador da API
  const [isLoadingAreaCoord, setIsLoadingAreaCoord] = useState(false);
  const [areaCoordError, setAreaCoordError] = useState(null);
  
  // Estados para criação de nova área
  const [newAreaName, setNewAreaName] = useState('');
  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [createAreaError, setCreateAreaError] = useState('');
  
  // Estados para modal de erro de exclusão
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedType, setDraggedType] = useState(null);
  
  // Estados para modal de status das ordens
  const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
  const [orderStatusResults, setOrderStatusResults] = useState([]);
  const [orderStatusSummary, setOrderStatusSummary] = useState(null);
  
  // Novos states para as melhorias
  const [technicianSearchTerm, setTechnicianSearchTerm] = useState('');
  const [areaOptionsMenus, setAreaOptionsMenus] = useState({});
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [editingAreaName, setEditingAreaName] = useState('');
  const [areaActionMenus, setAreaActionMenus] = useState({});
  const [showManagementDiagram, setShowManagementDiagram] = useState(false);
  
  // Listener para capturar mudanças de scroll
  React.useEffect(() => {
    const scrollElement = openColumnScrollRef.current;
    if (scrollElement) {
      const handleScroll = () => {
        lastScrollPosition.current = scrollElement.scrollTop;
      };
      
      scrollElement.addEventListener('scroll', handleScroll);
      
      // Configurar listeners para os scrolls dos grupos de cidade
      const setupCityScrollListeners = () => {
        const cityContainers = scrollElement.querySelectorAll('.city-orders-container');
        cityContainers.forEach((container, index) => {
          const cityElement = container.closest('.city-group');
          const cityTitle = cityElement?.querySelector('.city-title')?.textContent;
          
          if (cityTitle) {
            const handleCityScroll = () => {
              cityScrollPositions.current[cityTitle] = container.scrollTop;
            };
            
            container.addEventListener('scroll', handleCityScroll);
          }
        });
      };
      
      // Configurar listeners inicialmente
      setupCityScrollListeners();
      
      // Reconfigurar quando o DOM muda
      const observer = new MutationObserver(() => {
        setTimeout(setupCityScrollListeners, 100);
      });
      
      observer.observe(scrollElement, {
        childList: true,
        subtree: true
      });
      
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
        observer.disconnect();
      };
    }
  }, []);

  // Preservar scroll quando selectedOrders muda
  React.useEffect(() => {
    const scrollElement = openColumnScrollRef.current;
    if (scrollElement) {
      // Restaurar scroll da coluna principal
      if (lastScrollPosition.current > 0) {
        if (scrollElement.scrollTop === 0) {
          scrollElement.scrollTop = lastScrollPosition.current;
        }
      }
      
      // Restaurar scrolls dos grupos de cidade
      setTimeout(() => {
        const cityContainers = scrollElement.querySelectorAll('.city-orders-container');
        cityContainers.forEach(container => {
          const cityElement = container.closest('.city-group');
          const cityTitle = cityElement?.querySelector('.city-title')?.textContent;
          
          if (cityTitle && cityScrollPositions.current[cityTitle] > 0) {
            const savedPosition = cityScrollPositions.current[cityTitle];
            if (container.scrollTop === 0) {
              container.scrollTop = savedPosition;
            }
          }
        });
      }, 10);
    }
  }, [selectedOrders]);
  

  


  // Fechar filtro da coluna quando clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // Fechar filtros da coluna Em Aberto
      if ((showColumnFilter || showFilterOptions) && 
          !event.target.closest('.column-filter-overlay') && 
          !event.target.closest('.column-filter-container') &&
          !event.target.closest('.filter-options-dropdown')) {
        setShowColumnFilter(false);
        setShowFilterOptions(false);
      }

      // Fechar filtros das colunas de técnicos
      const hasOpenTechnicianFilter = Object.values(showTechnicianFilter).some(Boolean);
      if (hasOpenTechnicianFilter && 
          !event.target.closest('.technician-filter-modal') && 
          !event.target.closest('.technician-filter-container')) {
        setShowTechnicianFilter({});
      }
      
      // Fechar menus das colunas de técnicos
      const hasOpenTechnicianMenu = Object.values(showTechnicianMenu).some(Boolean);
      if (hasOpenTechnicianMenu && 
          !event.target.closest('.technician-menu-modal') && 
          !event.target.closest('.technician-menu-container')) {
        setShowTechnicianMenu({});
      }

      // Fechar dropdown de cidade
      if (openCityDropdown && 
          !event.target.closest('.city-dropdown') && 
          !event.target.closest('.city-header')) {
        setOpenCityDropdown(null);
      }

      // Fechar barra lateral do pedido
      if (showOrderSidebar && 
          !event.target.closest('.order-sidebar') && 
          !event.target.closest('.order-detail-maps-btn')) {
        setShowOrderSidebar(false);
        setPedidoDetails(null);
        setPedidoError(null);
        setLoadingPedido(false);
        setShowTimeline(false);
        setTimelineData(null);
        setTimelineError(null);
        setLoadingTimeline(false);
      }

      // Fechar barra lateral do equipamento
      if (showEquipmentSidebar && 
          !event.target.closest('.equipment-sidebar') && 
          !event.target.closest('.equipment-detail-btn')) {
        setShowEquipmentSidebar(false);
        setSelectedEquipmentData(null);
      }

      // Fechar menus de opções das áreas
      const hasOpenAreaOptions = Object.values(areaOptionsMenus).some(Boolean);
      if (hasOpenAreaOptions && 
          !event.target.closest('.area-options-container') && 
          !event.target.closest('.area-options-menu')) {
        setAreaOptionsMenus({});
      }

      // Fechar menus de ação das áreas nos coordenadores
      const hasOpenAreaActions = Object.values(areaActionMenus).some(Boolean);
      if (hasOpenAreaActions && 
          !event.target.closest('.area-action-container') && 
          !event.target.closest('.area-action-menu')) {
        setAreaActionMenus({});
      }

      // Fechar modal do diagrama de gestão
      if (showManagementDiagram && 
          !event.target.closest('.management-diagram-modal') && 
          event.target.classList.contains('modal-overlay')) {
        setShowManagementDiagram(false);
      }

      // Fechar modal de rota
      if (showRouteModal && 
          !event.target.closest('.route-modal-content') && 
          event.target.classList.contains('modal-overlay')) {
        setShowRouteModal(false);
        setRouteModalData(null);
        setRouteModalError(null);
      }

      // Fechar menu de logout
      if (showLogoutMenu && 
          !event.target.closest('.user-info')) {
        setShowLogoutMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnFilter, showFilterOptions, showTechnicianFilter, showTechnicianMenu, openCityDropdown, showOrderSidebar, showEquipmentSidebar, areaOptionsMenus, areaActionMenus, showManagementDiagram, showRouteModal, showLogoutMenu]);
  const [activeConfigSection, setActiveConfigSection] = useState('database');
  
  // Estado para controlar ordens disponíveis (removidas quando movidas)
  const [availableOrdersState, setAvailableOrdersState] = useState(availableOrders);
  
  // Log para debug do estado
  useEffect(() => {
    console.log('🔍 availableOrdersState mudou:', availableOrdersState);
    console.log('🔍 Número de cidades:', availableOrdersState.length);
    if (availableOrdersState.length > 0) {
      console.log('🔍 Primeira cidade:', availableOrdersState[0]);
    }
  }, [availableOrdersState]);
  
  // Estados para dados da API
  const [apiData, setApiData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataSource, setDataSource] = useState('mock');
  const [companyName, setCompanyName] = useState('Empresa teste');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0, message: '' });
  
  // Estrutura para agrupamentos de técnicos
  const [technicianGroups, setTechnicianGroups] = useState({});
  // Cache para dados de técnicos já carregados
  const [technicianDataCache, setTechnicianDataCache] = useState({});
  // Mapeamento nome->ID para técnicos com ordens
  const [technicianNameToIdMap, setTechnicianNameToIdMap] = useState({});

  // Funções auxiliares para conversão entre nome e ID de técnicos
  const getTechnicianIdByName = React.useCallback((technicianName) => {
    if (!technicianName) return null;
    
    // Primeiro, tentar encontrar na tabela de técnicos cadastrados
    const tecnico = teamData.tecnicos.find(t => t.nome === technicianName);
    if (tecnico) {
      return tecnico.id;
    }
    
    // Se não encontrar, verificar no mapeamento de técnicos com ordens
    if (technicianNameToIdMap[technicianName]) {
      console.log(`🔍 Técnico "${technicianName}" encontrado no mapeamento de ordens, ID: ${technicianNameToIdMap[technicianName]}`);
      return technicianNameToIdMap[technicianName];
    }
    
    console.warn(`⚠️ Técnico "${technicianName}" não encontrado em lugar nenhum`);
    return null;
  }, [teamData, technicianNameToIdMap]);

  const getTechnicianNameById = React.useCallback((technicianId) => {
    if (!technicianId) return null;
    
    const tecnico = teamData.tecnicos.find(t => t.id === technicianId);
    if (tecnico) {
      return tecnico.nome;
    }
    
    // Se não encontrar na tabela de técnicos, retornar null
    // Os nomes reais agora vêm da API /api/orders/technicians/available
    console.log(`⚠️ Técnico ID "${technicianId}" não encontrado na tabela TB01024`);
    return null;
  }, [teamData]);

  // Função OTIMIZADA para pré-carregar dados apenas dos técnicos com ordens de serviço
  const preloadAllTechnicianData = React.useCallback(async () => {
    try {
      console.log('🔄 Pré-carregando dados de técnicos com ordens de serviço...');
      
      // ETAPA 1: Obter apenas técnicos que possuem ordens de serviço COM NOMES REAIS
      console.log('🔄 [1/3] Buscando técnicos com ordens de serviço...');
      const availableResponse = await fetch(`${API_BASE_URL}/api/orders/technicians/available`);
      const availableResult = await availableResponse.json();
      
      if (!availableResult.success || availableResult.data.length === 0) {
        console.log('⚠️ Nenhum técnico com ordens de serviço encontrado');
        return {};
      }
      
      const techniciansWithOrders = availableResult.data;
      console.log(`✅ ${techniciansWithOrders.length} técnicos com ordens encontrados:`, 
        techniciansWithOrders.map(t => `${t.technicianName} (ID: ${t.technicianId}, ${t.orderCount} ordens)`));
      
      // ETAPA 2: Usar nomes reais vindos da API (não precisa mais mapear)
      const technicianCache = {};
      const nameToIdMapping = {};
      const validTechnicians = techniciansWithOrders.map(tech => {
        // Criar mapeamento nome->ID para técnicos com ordens
        nameToIdMapping[tech.technicianName] = tech.technicianId;
        return {
          id: tech.technicianId,
          name: tech.technicianName,
          orderCount: tech.orderCount
        };
      });
      
      console.log(`🔄 [2/3] Carregando dados para ${validTechnicians.length} técnicos válidos...`);
      
      // ETAPA 3: Carregar dados apenas para técnicos com ordens
      const promises = validTechnicians.map(async (tech) => {
        try {
          console.log(`🔄 Carregando dados para técnico "${tech.name}" (ID: ${tech.id}, ${tech.orderCount} ordens)`);
          
          const url = `${API_BASE_URL}/api/orders/technicians?technicianId=${encodeURIComponent(tech.id)}`;
          const response = await fetch(url);
          const result = await response.json();
          
          if (result.success) {
            console.log(`✅ Dados carregados para técnico "${tech.name}":`, result.data);
            technicianCache[tech.name] = result.data;
          } else {
            console.error(`❌ Erro ao carregar dados do técnico "${tech.name}":`, result.message);
            technicianCache[tech.name] = {
              'Em serviço': [],
              'Previsto para hoje': [],
              'Previstas para amanhã': [],
              'Futura': []
            };
          }
        } catch (error) {
          console.error(`❌ Erro na requisição para técnico "${tech.name}":`, error);
          technicianCache[tech.name] = {
            'Em serviço': [],
            'Previsto para hoje': [],
            'Previstas para amanhã': [],
            'Futura': []
          };
        }
      });
      
      // Executar todas as requisições em paralelo
      await Promise.all(promises);
      
      // Atualizar o cache e o mapeamento
      setTechnicianDataCache(technicianCache);
      setTechnicianNameToIdMap(nameToIdMapping);
      
      console.log(`✅ Cache de técnicos preenchido com ${Object.keys(technicianCache).length} técnicos com ordens`);
      console.log(`🎯 PERFORMANCE: Otimização aplicada - apenas ${Object.keys(technicianCache).length} técnicos carregados (em vez de ${teamData.tecnicos.length} total)`);
      console.log('🔍 DEBUG: Cache preenchido com dados:', technicianCache);
      console.log('🔍 DEBUG: Mapeamento nome->ID:', nameToIdMapping);
      
      return technicianCache;
      
    } catch (error) {
      console.error('❌ Erro no pré-carregamento otimizado dos técnicos:', error);
      return {};
    }
  }, [teamData]);

  // Estado para indicar se está carregando colunas de técnicos
  const [isLoadingTechnicianColumns, setIsLoadingTechnicianColumns] = useState(false);
  const [filterSearchTerms, setFilterSearchTerms] = useState({
    coordenador: '',
    area: '',
    tecnico: ''
  });
  const [selectedFilterItems, setSelectedFilterItems] = useState({
    coordenador: [],
    area: [],
    tecnico: []
  });

  // Estados para configuração do banco de dados
  const [dbConfig, setDbConfig] = useState({
    host: '',
    database: '',
    username: '',
    password: ''
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  // Estados para gerenciamento de usuários
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPasswordUser, setShowPasswordUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    user: '',
    password: '',
    type: 'Usuário',
    coordinator: false,
    blacktheme: false
  });
  const [userFormErrors, setUserFormErrors] = useState({});

  // Estados para o modal de carregamento inicial
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState([
    { id: 'config', name: 'Carregando configuração', status: 'pending' },
    { id: 'orders', name: 'Conectando ao banco de dados', status: 'pending' },
    { id: 'team', name: 'Carregando dados da equipe', status: 'pending' },
    { id: 'filters', name: 'Otimizando técnicos com ordens', status: 'pending' },
    { id: 'complete', name: 'Finalizando carregamento', status: 'pending' }
  ]);
  const [loadingHasError, setLoadingHasError] = useState(false);
  const [loadingErrorMessage, setLoadingErrorMessage] = useState('');

  // Funções de autenticação
  const handleLoginSuccess = (user) => {
    console.log('🔍 DEBUG: handleLoginSuccess chamado com user:', user);
    console.log('🔍 DEBUG: user.name:', user.name);
    console.log('🔍 DEBUG: user.username:', user.username);
    console.log('🔍 DEBUG: user object keys:', Object.keys(user));
    
    console.log('🔍 DEBUG: user.name original (login):', user.name);
    console.log('🔍 DEBUG: user.username original (login):', user.username);
    
    setCurrentUser(user);
    setIsAuthenticated(true);
    console.log('✅ Login realizado com sucesso:', user);
    
    // Fechar menu de configurações se o usuário não for administrador
    if (user.type !== '1') {
      setShowConfigMenu(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowLogoutMenu(false);
    console.log('🚪 Logout realizado');
  };

  // Função para carregar nome da empresa
  const loadCompanyName = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/company`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.company) {
        setCompanyName(result.data.company);
        console.log('🏢 Nome da empresa carregado:', result.data.company);
      } else {
        console.log('🏢 Nome da empresa não encontrado, usando padrão');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar nome da empresa:', error);
    }
  }, []);

  // Função para atualizar dados (refresh)
  const refreshData = useCallback(async () => {
    if (isRefreshing) return; // Evita múltiplas atualizações simultâneas
    
    setIsRefreshing(true);
    setRefreshProgress({ current: 0, total: 3, message: 'Iniciando atualização...' });
    
    try {
      console.log('🔄 Iniciando atualização de dados...');
      
      // Passo 1: Carregar ordens em aberto
      setRefreshProgress({ current: 1, total: 3, message: 'Carregando ordens em aberto...' });
      await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno delay para UX
      
      const ordersResponse = await fetch(`${API_BASE_URL}/api/orders/open?t=${Date.now()}`);
      const ordersResult = await ordersResponse.json();
      
      if (ordersResult.success) {
        setApiData(ordersResult.data);
        setDataSource(ordersResult.dataSource);
        setAvailableOrdersState(ordersResult.data);
        console.log('✅ Ordens atualizadas:', ordersResult.data.length, 'cidades');
      }
      
      // Passo 2: Carregar técnicos
      setRefreshProgress({ current: 2, total: 3, message: 'Carregando dados de técnicos...' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const techniciansResponse = await fetch(`${API_BASE_URL}/api/technicians`);
      const techniciansResult = await techniciansResponse.json();
      
      if (techniciansResult.success) {
        const technicianMap = {};
        const nameToIdMap = {};
        
        techniciansResult.data.forEach(tech => {
          const cleanName = tech.NOME_TECNICO?.trim() || 'Sem nome';
          technicianMap[cleanName] = tech;
          nameToIdMap[cleanName] = tech.id || cleanName;
        });
        
        setTechnicianDataCache(technicianMap);
        setTechnicianNameToIdMap(nameToIdMap);
        console.log('✅ Técnicos atualizados:', techniciansResult.data.length, 'técnicos');
      }
      
      // Passo 3: Finalizar
      setRefreshProgress({ current: 3, total: 3, message: 'Finalizando atualização...' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Atualização de dados concluída com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro durante atualização:', error);
      setRefreshProgress({ current: 0, total: 0, message: 'Erro na atualização' });
    } finally {
      // Limpar indicadores após um delay
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshProgress({ current: 0, total: 0, message: '' });
      }, 1000);
    }
  }, [isRefreshing]);

  // Verificar autenticação ao carregar
  useEffect(() => {
    console.log('🔍 DEBUG: Verificando autenticação ao carregar...');
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    console.log('🔍 DEBUG: Token encontrado:', !!token);
    console.log('🔍 DEBUG: UserData encontrado:', !!userData);
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        console.log('🔍 DEBUG: User data from localStorage:', user);
        console.log('🔍 DEBUG: user.name:', user.name);
        console.log('🔍 DEBUG: user.username:', user.username);
        console.log('🔍 DEBUG: user object keys:', Object.keys(user));
        

        
        setCurrentUser(user);
        setIsAuthenticated(true);
        console.log('🔐 Usuário já autenticado:', user);
        
        // Fechar menu de configurações se o usuário não for administrador
        if (user.type !== '1') {
          setShowConfigMenu(false);
        }
        
        // Se o usuário é coordenador, aplicar filtro automático
        console.log('🔍 DEBUG: Verificando se usuário é coordenador:', user);
        console.log('🔍 DEBUG: user.coordinator:', user.coordinator);
        console.log('🔍 DEBUG: typeof user.coordinator:', typeof user.coordinator);
        
        if (user.coordinator) {
          console.log('👨‍💼 Usuário é coordenador, aplicando filtro automático');
          console.log('👨‍💼 Nome do coordenador:', user.name || user.username);
          setSelectedFilterItems(prev => ({
            ...prev,
            coordenador: [user.name || user.username]
          }));
        } else {
          console.log('👤 Usuário não é coordenador');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    } else {
      console.log('🔍 DEBUG: Nenhum token ou userData encontrado');
    }
    
    // Carregar nome da empresa
    loadCompanyName();
  }, [loadCompanyName]);

  // Função para atualizar status de uma etapa
  const updateLoadingStep = useCallback((stepId, status) => {
    setLoadingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  }, []);

  // Função para carregar dados da API
  const loadOrdersFromAPI = useCallback(async () => {
    const startTime = performance.now();
    const startTimestamp = new Date().toLocaleTimeString();
    console.log('📊 PERFORMANCE LOG - Iniciando carregamento de ordens:', startTimestamp);
    
    setIsLoadingData(true);
    try {
      console.log('🔄 [1/3] Fazendo requisição para /api/orders/open...');
      console.log('🔄 URL completa:', `${API_BASE_URL}/api/orders/open?t=${Date.now()}`);
      
      const response = await fetch(`${API_BASE_URL}/api/orders/open?t=${Date.now()}`);
      
      const fetchTime = performance.now();
      console.log(`⏱️ [1/3] Requisição completada em: ${(fetchTime - startTime).toFixed(2)}ms`);
      console.log('🔄 Status da resposta:', response.status);
      console.log('🔄 Headers da resposta:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('🔄 [2/3] Processando resposta JSON...');
      const result = await response.json();
      
      const parseTime = performance.now();
      console.log(`⏱️ [2/3] JSON parseado em: ${(parseTime - fetchTime).toFixed(2)}ms`);
      
      console.log('🔄 Resultado completo da API:', {
        success: result.success,
        dataSource: result.dataSource,
        total: result.total,
        message: result.message,
        databaseConfigured: result.databaseConfigured,
        dataLength: result.data ? result.data.length : 0
      });
      
      if (result.success) {
        console.log('🔄 [3/3] Aplicando dados ao estado...');
        console.log(`✅ ${result.total} ordens carregadas da API (${result.dataSource})`);
        console.log('🔍 Primeiros dados da API:', result.data.slice(0, 2));
        setApiData(result.data);
        setDataSource(result.dataSource);
        
        // Atualizar estado com dados da API
        setAvailableOrdersState(result.data);
        console.log('🔍 availableOrdersState atualizado com:', result.data.length, 'cidades');
        
        const endTime = performance.now();
        console.log(`⏱️ [3/3] Estado atualizado em: ${(endTime - parseTime).toFixed(2)}ms`);
        console.log(`🎯 PERFORMANCE TOTAL - Ordens carregadas em: ${(endTime - startTime).toFixed(2)}ms (${((endTime - startTime) / 1000).toFixed(2)}s)`);
        
        // Log detalhado do dataSource
        if (result.dataSource === 'sql_server') {
          console.log('✅ FONTE DE DADOS: SQL Server (dados reais)');
        } else if (result.dataSource === 'mock_fallback') {
          console.log('⚠️ FONTE DE DADOS: Mock (fallback do SQL Server)');
        } else {
          console.log('🟡 FONTE DE DADOS: Mock (banco não configurado)');
        }
      } else {
        console.error('❌ Erro ao carregar dados da API:', result.message);
        console.error('❌ Resultado completo:', result);
        // Manter dados mock em caso de erro
        setAvailableOrdersState(availableOrders);
        setDataSource('mock');
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API:', error);
      console.error('❌ Tipo do erro:', error.constructor.name);
      console.error('❌ Stack trace:', error.stack);
      // Manter dados mock em caso de erro
      setAvailableOrdersState(availableOrders);
      setDataSource('mock');
    } finally {
      setIsLoadingData(false);
      const totalTime = performance.now() - startTime;
      console.log(`🏁 PERFORMANCE LOG - Carregamento de ordens finalizado: ${new Date().toLocaleTimeString()} (Total: ${totalTime.toFixed(2)}ms)`);
    }
  }, []);

  // Função para carregar técnicos da API
  const loadTechniciansFromAPI = useCallback(async () => {
    const startTime = performance.now();
    const startTimestamp = new Date().toLocaleTimeString();
    console.log('👷‍♂️ PERFORMANCE LOG - Iniciando carregamento de técnicos:', startTimestamp);
    
    setIsLoadingTechnicians(true);
    setTechniciansError(null);
    try {
      console.log('🔄 [1/3] Fazendo requisição para /api/technicians...');
      const response = await fetch(`${API_BASE_URL}/api/technicians`);
      
      const fetchTime = performance.now();
      console.log(`⏱️ [1/3] Requisição de técnicos completada em: ${(fetchTime - startTime).toFixed(2)}ms`);
      
      const result = await response.json();
      
      const parseTime = performance.now();
      console.log(`⏱️ [2/3] JSON de técnicos parseado em: ${(parseTime - fetchTime).toFixed(2)}ms`);
      
      if (result.success) {
        console.log('🔄 [3/3] Aplicando técnicos ao estado...');
        console.log(`✅ ${result.data.length} técnicos carregados da API`);
        console.log('🔍 Técnicos recebidos da API:', result.data);
        
        // Atualizar apenas os técnicos no teamData
        setTeamData(prev => ({
          ...prev,
          tecnicos: result.data
        }));
        
        const endTime = performance.now();
        console.log(`⏱️ [3/3] Estado de técnicos atualizado em: ${(endTime - parseTime).toFixed(2)}ms`);
        console.log(`🎯 PERFORMANCE TOTAL - Técnicos carregados em: ${(endTime - startTime).toFixed(2)}ms`);
      } else {
        console.error('❌ Erro ao carregar técnicos da API:', result.message);
        setTechniciansError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API de técnicos:', error);
      setTechniciansError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsLoadingTechnicians(false);
      const totalTime = performance.now() - startTime;
      console.log(`🏁 PERFORMANCE LOG - Carregamento de técnicos finalizado: ${new Date().toLocaleTimeString()} (Total: ${totalTime.toFixed(2)}ms)`);
    }
  }, []);

  // Função para carregar áreas da API
  const loadAreasFromAPI = useCallback(async () => {
    const startTime = performance.now();
    const startTimestamp = new Date().toLocaleTimeString();
    console.log('🏢 PERFORMANCE LOG - Iniciando carregamento de áreas:', startTimestamp);
    
    setIsLoadingAreas(true);
    setAreasError(null);
    try {
      console.log('🔄 [1/3] Fazendo requisição para /api/areas...');
      const response = await fetch(`${API_BASE_URL}/api/areas`);
      
      const fetchTime = performance.now();
      console.log(`⏱️ [1/3] Requisição de áreas completada em: ${(fetchTime - startTime).toFixed(2)}ms`);
      
      const result = await response.json();
      
      const parseTime = performance.now();
      console.log(`⏱️ [2/3] JSON de áreas parseado em: ${(parseTime - fetchTime).toFixed(2)}ms`);
      
      if (result.success) {
        console.log('🔄 [3/3] Aplicando áreas ao estado...');
        console.log(`✅ ${result.data.length} áreas carregadas da API`);
        console.log('🔍 Áreas recebidas da API:', result.data);
        
        // Atualizar apenas as áreas no teamData
        setTeamData(prev => ({
          ...prev,
          areas: result.data
        }));
        
        const endTime = performance.now();
        console.log(`⏱️ [3/3] Estado de áreas atualizado em: ${(endTime - parseTime).toFixed(2)}ms`);
        console.log(`🎯 PERFORMANCE TOTAL - Áreas carregadas em: ${(endTime - startTime).toFixed(2)}ms`);
      } else {
        console.error('❌ Erro ao carregar áreas da API:', result.message);
        setAreasError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API de áreas:', error);
      setAreasError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsLoadingAreas(false);
      const totalTime = performance.now() - startTime;
      console.log(`🏁 PERFORMANCE LOG - Carregamento de áreas finalizado: ${new Date().toLocaleTimeString()} (Total: ${totalTime.toFixed(2)}ms)`);
    }
  }, []);

  // Função para carregar coordenadores da API
  const loadCoordinatorsFromAPI = useCallback(async () => {
    const startTime = performance.now();
    const startTimestamp = new Date().toLocaleTimeString();
    console.log('👨‍💼 PERFORMANCE LOG - Iniciando carregamento de coordenadores:', startTimestamp);
    
    setIsLoadingCoordinators(true);
    setCoordinatorsError(null);
    try {
      console.log('🔄 [1/3] Fazendo requisição para /api/coordinators...');
      const response = await fetch(`${API_BASE_URL}/api/coordinators`);
      
      const fetchTime = performance.now();
      console.log(`⏱️ [1/3] Requisição de coordenadores completada em: ${(fetchTime - startTime).toFixed(2)}ms`);
      
      const result = await response.json();
      
      const parseTime = performance.now();
      console.log(`⏱️ [2/3] JSON de coordenadores parseado em: ${(parseTime - fetchTime).toFixed(2)}ms`);
      
      if (result.success) {
        console.log('🔄 [3/3] Aplicando coordenadores ao estado...');
        console.log(`✅ ${result.data.length} coordenadores carregados da API`);
        console.log('🔍 Coordenadores recebidos da API:', result.data);
        
        // Atualizar apenas os coordenadores no teamData
        setTeamData(prev => ({
          ...prev,
          coordenadores: result.data
        }));
        
        const endTime = performance.now();
        console.log(`⏱️ [3/3] Estado de coordenadores atualizado em: ${(endTime - parseTime).toFixed(2)}ms`);
        console.log(`🎯 PERFORMANCE TOTAL - Coordenadores carregados em: ${(endTime - startTime).toFixed(2)}ms`);
      } else {
        console.error('❌ Erro ao carregar coordenadores da API:', result.message);
        setCoordinatorsError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API de coordenadores:', error);
      setCoordinatorsError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsLoadingCoordinators(false);
      const totalTime = performance.now() - startTime;
      console.log(`🏁 PERFORMANCE LOG - Carregamento de coordenadores finalizado: ${new Date().toLocaleTimeString()} (Total: ${totalTime.toFixed(2)}ms)`);
    }
  }, []);

  // Função para carregar vínculos técnico-área da API
  const loadAreaTeamFromAPI = useCallback(async () => {
    const startTime = performance.now();
    const startTimestamp = new Date().toLocaleTimeString();
    console.log('🔗 PERFORMANCE LOG - Iniciando carregamento de vínculos técnico-área:', startTimestamp);
    
    setIsLoadingAreaTeam(true);
    setAreaTeamError(null);
    try {
      console.log('🔄 [1/4] Fazendo requisição para /api/areateam...');
      const response = await fetch(`${API_BASE_URL}/api/areateam`);
      
      const fetchTime = performance.now();
      console.log(`⏱️ [1/4] Requisição de vínculos técnico-área completada em: ${(fetchTime - startTime).toFixed(2)}ms`);
      
      const result = await response.json();
      
      const parseTime = performance.now();
      console.log(`⏱️ [2/4] JSON de vínculos parseado em: ${(parseTime - fetchTime).toFixed(2)}ms`);
      
      if (result.success) {
        console.log('🔄 [3/4] Processando vínculos técnico-área...');
        console.log(`✅ ${result.data.length} vínculos técnico-área carregados da API`);
        console.log('🔍 Vínculos recebidos da API:', result.data);
        
        const processStart = performance.now();
        
        // Aplicar os vínculos aos técnicos
        setTeamData(prev => {
          // Verificar se os técnicos já foram carregados
          if (prev.tecnicos.length === 0) {
            console.log('⚠️ Técnicos ainda não carregados, não aplicando vínculos');
            return prev;
          }
          
          console.log('🔄 [4/4] Aplicando vínculos aos técnicos...');
          const updatedTeamData = {
            ...prev,
            tecnicos: prev.tecnicos.map(tecnico => {
              const vinculo = result.data.find(v => v.id_tech === tecnico.id);
              return {
                ...tecnico,
                areaId: vinculo ? vinculo.id_area : null
              };
            })
          };
          
          const endTime = performance.now();
          console.log(`⏱️ [4/4] Vínculos aplicados aos técnicos em: ${(endTime - processStart).toFixed(2)}ms`);
          console.log(`🎯 PERFORMANCE TOTAL - Vínculos técnico-área processados em: ${(endTime - startTime).toFixed(2)}ms`);
          
          return updatedTeamData;
        });
      } else {
        console.error('❌ Erro ao carregar vínculos técnico-área da API:', result.message);
        setAreaTeamError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API de vínculos técnico-área:', error);
      setAreaTeamError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsLoadingAreaTeam(false);
      const totalTime = performance.now() - startTime;
      console.log(`🏁 PERFORMANCE LOG - Carregamento de vínculos técnico-área finalizado: ${new Date().toLocaleTimeString()} (Total: ${totalTime.toFixed(2)}ms)`);
    }
  }, []);

  // Função para carregar vínculos área-coordenador da API
  const loadAreaCoordFromAPI = useCallback(async () => {
    const startTime = performance.now();
    const startTimestamp = new Date().toLocaleTimeString();
    console.log('🤝 PERFORMANCE LOG - Iniciando carregamento de vínculos área-coordenador:', startTimestamp);
    
    setIsLoadingAreaCoord(true);
    setAreaCoordError(null);
    try {
      console.log('🔄 [1/4] Fazendo requisição para /api/areacoord...');
      const response = await fetch(`${API_BASE_URL}/api/areacoord`);
      
      const fetchTime = performance.now();
      console.log(`⏱️ [1/4] Requisição de vínculos área-coordenador completada em: ${(fetchTime - startTime).toFixed(2)}ms`);
      
      const result = await response.json();
      
      const parseTime = performance.now();
      console.log(`⏱️ [2/4] JSON de vínculos parseado em: ${(parseTime - fetchTime).toFixed(2)}ms`);
      
      if (result.success) {
        console.log('🔄 [3/4] Processando vínculos área-coordenador...');
        console.log(`✅ ${result.data.length} vínculos área-coordenador carregados da API`);
        console.log('🔍 Vínculos área-coordenador recebidos da API:', result.data);
        
        const processStart = performance.now();
        
        // Aplicar os vínculos às áreas
        setTeamData(prev => {
          // Verificar se as áreas já foram carregadas
          if (prev.areas.length === 0) {
            console.log('⚠️ Áreas ainda não carregadas, não aplicando vínculos');
            return prev;
          }
          
          console.log('🔄 [4/4] Aplicando vínculos às áreas...');
          const updatedTeamData = {
            ...prev,
            areas: prev.areas.map(area => {
              const vinculo = result.data.find(v => v.id_area === area.id);
              return {
                ...area,
                coordenadorId: vinculo ? vinculo.id_coordinator : null
              };
            })
          };
          
          const endTime = performance.now();
          console.log(`⏱️ [4/4] Vínculos aplicados às áreas em: ${(endTime - processStart).toFixed(2)}ms`);
          console.log(`🎯 PERFORMANCE TOTAL - Vínculos área-coordenador processados em: ${(endTime - startTime).toFixed(2)}ms`);
          
          return updatedTeamData;
        });
      } else {
        console.error('❌ Erro ao carregar vínculos área-coordenador da API:', result.message);
        setAreaCoordError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API de vínculos área-coordenador:', error);
      setAreaCoordError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsLoadingAreaCoord(false);
      const totalTime = performance.now() - startTime;
      console.log(`🏁 PERFORMANCE LOG - Carregamento de vínculos área-coordenador finalizado: ${new Date().toLocaleTimeString()} (Total: ${totalTime.toFixed(2)}ms)`);
    }
  }, []);

  // Carregar dados iniciais com modal de progresso
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect de inicialização chamado');
    console.log('🔍 DEBUG: isAuthenticated =', isAuthenticated);
    console.log('🔍 DEBUG: currentUser =', currentUser);
    
    // Só inicializar se o usuário estiver autenticado
    if (!isAuthenticated) {
      console.log('🔍 DEBUG: Usuário não autenticado, não inicializando');
      return;
    }

    console.log('🔍 DEBUG: Usuário autenticado, iniciando carregamento...');
    const initializeApp = async () => {
      try {
        // Etapa 1: Carregar configuração
        updateLoadingStep('config', 'loading');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simular carregamento
        
        const savedConfig = localStorage.getItem('dbConfig');
        if (savedConfig) {
          try {
            // Verificar se o savedConfig é um JSON válido antes de fazer parse
            if (savedConfig.trim().startsWith('{') && savedConfig.trim().endsWith('}')) {
              const config = JSON.parse(savedConfig);
              setDbConfig(config);
              console.log('📋 Configuração carregada do localStorage');
            } else {
              console.warn('⚠️ Configuração salva não é um JSON válido, ignorando:', savedConfig.substring(0, 50));
              localStorage.removeItem('dbConfig'); // Limpar configuração inválida
            }
          } catch (error) {
            console.error('❌ Erro ao carregar configuração do localStorage:', error);
            localStorage.removeItem('dbConfig'); // Limpar configuração corrompida
          }
        }
        updateLoadingStep('config', 'completed');
        
        // Etapa 2: Carregar ordens do banco (detectar erro de conexão)
        updateLoadingStep('orders', 'loading');
        let connectionFailed = false;
        let sqlServerFailed = false;
        
        try {
          // Tentar conectar ao backend
          console.log('🔄 Tentando conectar ao backend:', `${API_BASE_URL}/api/orders/open`);
          const response = await fetch(`${API_BASE_URL}/api/orders/open?t=${Date.now()}`, {
            timeout: 10000 // 10 segundos de timeout
          });
          
          console.log('🔄 Resposta do backend recebida:', response.status);
          
          if (!response.ok) {
            throw new Error(`Servidor retornou status ${response.status}`);
          }
          
          const result = await response.json();
          console.log('🔄 Dados recebidos do backend:', {
            success: result.success,
            dataSource: result.dataSource,
            total: result.total,
            message: result.message
          });
          
          if (result.success) {
            if (result.dataSource === 'sql_server') {
              // Conexão SQL Server bem-sucedida
              console.log('✅ Dados carregados do SQL Server com sucesso');
              await loadOrdersFromAPI();
              updateLoadingStep('orders', 'completed');
            } else if (result.dataSource === 'mock_fallback') {
              // SQL Server falhou, usando mock como fallback
              console.log('⚠️ SQL Server falhou, usando dados mock');
              sqlServerFailed = true;
              await loadOrdersFromAPI();
              updateLoadingStep('orders', 'completed');
              setLoadingHasError(true);
              setLoadingErrorMessage(`Erro na conexão com o SQL Server: ${result.message || 'Conexão falhou'}. Sistema iniciado com dados de demonstração.`);
            } else {
              // Usando dados mock (banco não configurado)
              console.log('⚠️ Banco não configurado, usando dados mock');
              await loadOrdersFromAPI();
              updateLoadingStep('orders', 'completed');
              setLoadingHasError(true);
              setLoadingErrorMessage('Banco de dados não configurado. Sistema iniciado com dados de demonstração. Configure o banco em Configurações > Banco de Dados.');
            }
          } else {
            throw new Error(result.message || 'Erro desconhecido na API');
          }
        } catch (error) {
          // Erro de conexão com backend
          console.error('❌ Erro de conexão com backend:', error);
          connectionFailed = true;
          updateLoadingStep('orders', 'error');
          setLoadingHasError(true);
          setLoadingErrorMessage(`Não foi possível conectar ao servidor backend (${error.message}). Verifique se o servidor está rodando na porta 3002.`);
          
          // Ainda tentar carregar dados mock
          await loadOrdersFromAPI();
        }
        
        // Se houver erro de conexão, não continuar automaticamente
        if (connectionFailed) {
          // Marcar etapas restantes como pendentes mas não executar
          setLoadingSteps(prev => prev.map(step => {
            if (['team', 'filters', 'complete'].includes(step.id)) {
              return { ...step, status: 'skipped' };
            }
            return step;
          }));
          return; // Parar aqui e aguardar confirmação do usuário
        }
        
        // Etapa 3: Carregar dados da equipe
        updateLoadingStep('team', 'loading');
        await Promise.all([
          loadTechniciansFromAPI(),
          loadAreasFromAPI(),
          loadCoordinatorsFromAPI()
        ]);
        await Promise.all([
          loadAreaTeamFromAPI(),
          loadAreaCoordFromAPI()
        ]);
        updateLoadingStep('team', 'completed');
        
        // Etapa 4: Pré-carregar técnicos com ordens de serviço
        updateLoadingStep('filters', 'loading');
        console.log('🔄 Pré-carregando técnicos com ordens de serviço...');
        
        // Aguardar um pouco para garantir que os dados da equipe foram processados
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Executar o pré-carregamento otimizado
        try {
          await preloadAllTechnicianData();
          console.log('✅ Pré-carregamento de técnicos concluído durante inicialização');
        } catch (error) {
          console.error('❌ Erro no pré-carregamento de técnicos durante inicialização:', error);
        }
        
        updateLoadingStep('filters', 'completed');
        
        // Etapa 5: Finalizar
        updateLoadingStep('complete', 'loading');
        await new Promise(resolve => setTimeout(resolve, 500));
        updateLoadingStep('complete', 'completed');
        
            // Aguardar um pouco para mostrar que completou
    setTimeout(() => {
      setIsInitialLoading(false);
    }, 800);
    
  } catch (error) {
    console.error('❌ Erro durante inicialização:', error);
    updateLoadingStep('orders', 'error');
    setLoadingHasError(true);
    setLoadingErrorMessage('Erro inesperado durante a inicialização do sistema.');
  }
};

initializeApp();
}, [loadOrdersFromAPI, loadTechniciansFromAPI, loadAreasFromAPI, loadCoordinatorsFromAPI, loadAreaTeamFromAPI, loadAreaCoordFromAPI, updateLoadingStep, isAuthenticated]);

  // Recarregar dados quando a configuração for salva
  useEffect(() => {
    if (connectionStatus?.success && connectionStatus.message.includes('salva com sucesso')) {
      console.log('🔄 Recarregando dados após configuração salva...');
      setTimeout(() => {
        loadOrdersFromAPI();
      }, 1000); // Aguardar 1 segundo para o backend processar
    }
  }, [connectionStatus, loadOrdersFromAPI]);

  // Pré-carregar dados dos técnicos quando teamData estiver disponível
  useEffect(() => {
    if (teamData && teamData.tecnicos && teamData.tecnicos.length > 0 && !isInitialLoading) {
      console.log('🔄 teamData disponível, iniciando pré-carregamento de técnicos...');
      
      // Só executar se o cache ainda não foi preenchido
      if (!technicianDataCache || Object.keys(technicianDataCache).length === 0) {
        preloadAllTechnicianData()
          .then(() => {
            console.log('✅ Pré-carregamento de técnicos concluído');
          })
          .catch(error => {
            console.error('❌ Erro no pré-carregamento de técnicos:', error);
          });
      }
    }
  }, [teamData, technicianDataCache, isInitialLoading, preloadAllTechnicianData]);

  // Função para mapear tipo de serviço baseado em TB02115_PREVENTIVA
  const getServiceTypeFromPreventiva = (preventiva) => {
    const typeMap = {
      'E': 'E', // ESTOQUE
      'B': 'B', // BALCÃO
      'A': 'A', // AFERIÇÃO
      'R': 'R', // RETORNO-RECARGA
      'D': 'D', // DESINSTALAÇÃO
      'I': 'I', // INSTALAÇÃO
      'S': 'S', // PREVENTIVA
      'N': 'C'  // NORMAL/CORRETIVA - mapear para 'C' visualmente
    };
    return typeMap[preventiva] || 'C'; // Padrão para corretiva (C visualmente)
  };

  // Função para determinar SLA baseado em CALC_RESTANTE
  const getSLAFromCalcRestante = (calcRestante) => {
    if (calcRestante <= 24) {
      return 'vencido'; // Vermelho
    } else if (calcRestante >= 25 && calcRestante <= 48) {
      return 'vencendo'; // Amarelo
    } else {
      return 'ok'; // Sem bolinha
    }
  };

  // Função para mapear ordem para formato legado (compatibilidade)
  const mapOrderToLegacyFormat = (ordem) => {
    // Se a ordem já vem com campos mapeados do backend, preservar TUDO mas garantir campos essenciais
    if (ordem.dataAbertura !== undefined || ordem.contrato !== undefined || ordem.numeroSerie !== undefined) {
      console.log('🔍 Frontend - Preservando campos do backend para ordem:', ordem.id);
      return {
        ...ordem, // Preservar TODOS os campos que vêm do backend
        // Garantir campos essenciais para o frontend
        tipo: ordem.tipo || getServiceTypeFromPreventiva(ordem.TB02115_PREVENTIVA),
        sla: ordem.sla || getSLAFromCalcRestante(ordem.CALC_RESTANTE)
      };
    }
    
    // Para dados mock ou legados sem mapeamento, usar transformação local
    console.log('🔍 Frontend - Aplicando mapeamento local para ordem:', ordem.TB02115_CODIGO);
    return {
      id: ordem.TB02115_CODIGO,
      cliente: ordem.TB01008_NOME,
      equipamento: ordem.TB01010_RESUMIDO || ordem.TB01010_NOME,
      tipo: getServiceTypeFromPreventiva(ordem.TB02115_PREVENTIVA),
      sla: getSLAFromCalcRestante(ordem.CALC_RESTANTE),
      atrasada: ordem.CALC_RESTANTE <= 24,
      pedidoVinculado: ordem.pedidoVinculado,
      
      // Campos necessários para os modais e sidebars
      numeroSerie: ordem.numeroSerie,
      serie: ordem.serie,
      patrimonio: ordem.patrimonio,
      dataAbertura: ordem.dataAbertura,
      tecnico: ordem.tecnico,
      coordenador: ordem.coordenador,
      area: ordem.area,
      bairro: ordem.bairro,
      estado: ordem.estado,
      contrato: ordem.contrato,
      
      // Campos para o modal de detalhes
      endereco: ordem.ENDERECO || ordem.endereco || null,
      TB02115_CIDADE: ordem.TB02115_CIDADE || ordem.cidade,
      TB02115_ESTADO: ordem.TB02115_ESTADO || ordem.estado,
      
      // Campos originais mantidos para referência
      TB02115_CODIGO: ordem.TB02115_CODIGO,
      TB01008_NOME: ordem.TB01008_NOME,
      TB01010_NOME: ordem.TB01010_NOME,
      TB02115_PREVENTIVA: ordem.TB02115_PREVENTIVA,
      TB02115_BAIRRO: ordem.TB02115_BAIRRO, // Campo adicionado para filtros
      CALC_RESTANTE: ordem.CALC_RESTANTE,
      TB01047_NOME: ordem.TB01047_NOME, // Marca
      TB01018_NOME: ordem.TB01018_NOME, // Subgrupo
      TB01073_NOME: ordem.TB01073_NOME  // Status
    };
  };

  // Abordagem simples sem estados complexos


  // Função para aplicar filtros automáticos quando um filtro é selecionado
  const applyAutomaticFilters = (type, newSelection) => {
    console.log('🔍 applyAutomaticFilters called with type:', type, 'newSelection:', newSelection);
    console.log('🔍 current selectedFilterItems:', selectedFilterItems);
    
    let updatedFilters = {};
    
    // Quando um coordenador é selecionado/desmarcado, sincronizar técnicos automaticamente
    if (type === 'coordenador') {
      const technicosToAdd = [];
      
      // Para cada coordenador selecionado, obter todos os técnicos vinculados
      newSelection.forEach(coordenadorNome => {
        const coord = teamData.coordenadores.find(c => c.nome === coordenadorNome);
        if (coord) {
          // Encontrar áreas deste coordenador
          const coordAreas = teamData.areas.filter(area => area.coordenadorId === coord.id);
          
          // Para cada área, encontrar técnicos
          coordAreas.forEach(area => {
            const tecnicosFromArea = teamData.tecnicos.filter(tec => tec.areaId === area.id);
            tecnicosFromArea.forEach(tec => {
              if (!technicosToAdd.includes(tec.nome)) {
                technicosToAdd.push(tec.nome);
              }
            });
          });
        }
      });
      
      // Manter técnicos já selecionados manualmente (que não pertencem aos coordenadores desmarcados)
      const coordenadorRemovidos = selectedFilterItems.coordenador.filter(c => !newSelection.includes(c));
      let technicosToRemove = [];
      
      coordenadorRemovidos.forEach(coordenadorNome => {
        const coord = teamData.coordenadores.find(c => c.nome === coordenadorNome);
        if (coord) {
          const coordAreas = teamData.areas.filter(area => area.coordenadorId === coord.id);
          coordAreas.forEach(area => {
            const tecnicosFromArea = teamData.tecnicos.filter(tec => tec.areaId === area.id);
            tecnicosFromArea.forEach(tec => {
              if (!technicosToRemove.includes(tec.nome)) {
                technicosToRemove.push(tec.nome);
              }
            });
          });
        }
      });
      
      // Criar nova lista de técnicos: manter os atuais, adicionar os novos, remover os que não pertencem mais
      const currentTechnicians = selectedFilterItems.tecnico || [];
      const newTechnicians = [
        ...currentTechnicians.filter(t => !technicosToRemove.includes(t)),
        ...technicosToAdd.filter(t => !currentTechnicians.includes(t))
      ];
      
      updatedFilters.tecnico = newTechnicians;
      
      console.log('🔍 Coordenadores selecionados:', newSelection);
      console.log('🔍 Técnicos adicionados automaticamente:', technicosToAdd);
      console.log('🔍 Técnicos removidos automaticamente:', technicosToRemove);
      console.log('🔍 Nova lista de técnicos:', newTechnicians);
    }
    
    // Quando uma área é selecionada/desmarcada, sincronizar técnicos automaticamente
    if (type === 'area') {
      const technicosToAdd = [];
      
      // Para cada área selecionada, obter todos os técnicos vinculados
      newSelection.forEach(areaNome => {
        const area = teamData.areas.find(a => a.nome === areaNome);
        if (area) {
          const tecnicosFromArea = teamData.tecnicos.filter(tec => tec.areaId === area.id);
          tecnicosFromArea.forEach(tec => {
            if (!technicosToAdd.includes(tec.nome)) {
              technicosToAdd.push(tec.nome);
            }
          });
        }
      });
      
      // Manter técnicos já selecionados manualmente (que não pertencem às áreas desmarcadas)
      const areasRemovidas = selectedFilterItems.area.filter(a => !newSelection.includes(a));
      let technicosToRemove = [];
      
      areasRemovidas.forEach(areaNome => {
        const area = teamData.areas.find(a => a.nome === areaNome);
        if (area) {
          const tecnicosFromArea = teamData.tecnicos.filter(tec => tec.areaId === area.id);
          tecnicosFromArea.forEach(tec => {
            // Só remover se o técnico não pertence a outras áreas/coordenadores ainda selecionados
            const pertenceAOutraAreaSelecionada = selectedFilterItems.area.some(otherAreaNome => {
              if (otherAreaNome === areaNome) return false;
              const otherArea = teamData.areas.find(a => a.nome === otherAreaNome);
              return otherArea && teamData.tecnicos.some(t => t.areaId === otherArea.id && t.nome === tec.nome);
            });
            
            const pertenceACoordSelecionado = selectedFilterItems.coordenador.some(coordNome => {
              const coord = teamData.coordenadores.find(c => c.nome === coordNome);
              if (!coord) return false;
              const coordAreas = teamData.areas.filter(a => a.coordenadorId === coord.id);
              return coordAreas.some(coordArea => 
                teamData.tecnicos.some(t => t.areaId === coordArea.id && t.nome === tec.nome)
              );
            });
            
            if (!pertenceAOutraAreaSelecionada && !pertenceACoordSelecionado && !technicosToRemove.includes(tec.nome)) {
              technicosToRemove.push(tec.nome);
            }
          });
        }
      });
      
      // Criar nova lista de técnicos
      const currentTechnicians = selectedFilterItems.tecnico || [];
      const newTechnicians = [
        ...currentTechnicians.filter(t => !technicosToRemove.includes(t)),
        ...technicosToAdd.filter(t => !currentTechnicians.includes(t))
      ];
      
      updatedFilters.tecnico = newTechnicians;
      
      console.log('🔍 Áreas selecionadas:', newSelection);
      console.log('🔍 Técnicos adicionados automaticamente:', technicosToAdd);
      console.log('🔍 Técnicos removidos automaticamente:', technicosToRemove);
      console.log('🔍 Nova lista de técnicos:', newTechnicians);
    }
    
    // Quando um técnico é selecionado/desmarcado diretamente, manter essa preferência
    // (não fazer nada adicional, apenas manter a seleção manual)
    
    console.log('🔍 applyAutomaticFilters returning:', updatedFilters);
    return updatedFilters;
  };

  const SimpleFilterModal = ({ type, options, onClose }) => {
    console.log('🔍 SimpleFilterModal rendered for type:', type, 'with options:', options);
    const [searchTerm, setSearchTerm] = useState('');
    const currentSelected = selectedFilterItems[type] || [];
    
    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isSelected = (item) => currentSelected.includes(item);

    // Verificar se o usuário é coordenador e se estamos no filtro de coordenador
    const isUserCoordinator = currentUser?.coordinator;
    const isCoordinatorFilter = type === 'coordenador';

    const toggleItem = (item) => {
      console.log('🔍 toggleItem called for:', item, 'type:', type);
      console.log('🔍 currentSelected before:', currentSelected);
      console.log('🔍 isSelected(item):', isSelected(item));
      
      // Se o usuário é coordenador e estamos no filtro de coordenador
      if (isUserCoordinator && isCoordinatorFilter) {
        // Coordenador só pode selecionar/desmarcar a si mesmo
        if (item !== (currentUser.name || currentUser.username)) {
          console.log('🚫 Coordenador não pode selecionar outros coordenadores');
          return;
        }
      }
      
      const newSelection = isSelected(item)
        ? currentSelected.filter(i => i !== item)
        : [...currentSelected, item];
      
      console.log('🔍 newSelection after toggle:', newSelection);
      
      // Aplicar filtros automáticos baseados na seleção
      const updatedFilters = applyAutomaticFilters(type, newSelection);
      console.log('🔍 updatedFilters:', updatedFilters);
      
      const finalUpdate = {
        ...selectedFilterItems,
        [type]: newSelection,
        ...updatedFilters
      };
      console.log('🔍 finalUpdate to be applied:', finalUpdate);
      
      setSelectedFilterItems(finalUpdate);
    };

    const clearAll = () => {
      console.log('🔍 clearAll called for type:', type);
      
      // Se o usuário é coordenador e estamos no filtro de coordenador, não permitir limpar
      if (isUserCoordinator && isCoordinatorFilter) {
        console.log('🚫 Coordenador não pode limpar o filtro de coordenador');
        return;
      }
      
      // Aplicar filtros automáticos quando limpar tudo
      const updatedFilters = applyAutomaticFilters(type, []);
      
      const finalUpdate = {
        ...selectedFilterItems,
        [type]: [],
        ...updatedFilters
      };
      console.log('🔍 clearAll finalUpdate:', finalUpdate);
      
      setSelectedFilterItems(finalUpdate);
    };

    const selectAll = () => {
      console.log('🔍 selectAll called for type:', type);
      console.log('🔍 selectAll filteredOptions:', filteredOptions);
      
      // Se o usuário é coordenador e estamos no filtro de coordenador, selecionar apenas a si mesmo
      let optionsToSelect = filteredOptions;
      if (isUserCoordinator && isCoordinatorFilter) {
        const userCoordinatorName = currentUser?.name || currentUser?.username;
        optionsToSelect = filteredOptions.filter(option => option === userCoordinatorName);
        console.log('👨‍💼 Coordenador selecionando apenas a si mesmo:', optionsToSelect);
      }
      
      // Aplicar filtros automáticos quando selecionar tudo
      const updatedFilters = applyAutomaticFilters(type, optionsToSelect);
      
      const finalUpdate = {
        ...selectedFilterItems,
        [type]: optionsToSelect,
        ...updatedFilters
      };
      console.log('🔍 selectAll finalUpdate:', finalUpdate);
      
      setSelectedFilterItems(finalUpdate);
    };

    return (
      <div className="filter-modal">
        <div className={`filter-modal-content ${type === 'tecnico' ? 'technician-filter' : ''}`}>
          {/* Mensagem informativa para coordenadores */}
          {isUserCoordinator && isCoordinatorFilter && (
            <div style={{
              background: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: '12px',
              color: '#1976d2'
            }}>
              <strong>👨‍💼 Modo Coordenador:</strong> Você só pode selecionar a si mesmo neste filtro.
            </div>
          )}
          
          <div className="filter-search">
            <input 
              type="text" 
              placeholder={`Pesquisar ${type}...`}
              className="filter-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className={`filter-options ${type === 'tecnico' ? 'technician-filter' : ''}`}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                // Verificar se este item deve estar desabilitado para coordenadores
                const isDisabled = isUserCoordinator && isCoordinatorFilter && 
                                 option !== (currentUser?.name || currentUser?.username);
                
                console.log('🔍 DEBUG: Renderizando checkbox para:', option);
                console.log('🔍 DEBUG: isUserCoordinator:', isUserCoordinator);
                console.log('🔍 DEBUG: isCoordinatorFilter:', isCoordinatorFilter);
                console.log('🔍 DEBUG: currentUser?.name:', currentUser?.name);
                console.log('🔍 DEBUG: currentUser?.username:', currentUser?.username);
                console.log('🔍 DEBUG: isDisabled:', isDisabled);
                
                return (
                  <div key={option} className={`filter-option ${isDisabled ? 'disabled' : ''}`}>
                    <input 
                      type="checkbox" 
                      id={`${type}-${option}`}
                      checked={isSelected(option)}
                      onChange={() => toggleItem(option)}
                      disabled={isDisabled}
                    />
                    <label 
                      htmlFor={`${type}-${option}`}
                      style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      {option}
                      {isDisabled && <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        (Não disponível para coordenadores)
                      </span>}
                    </label>
                  </div>
                );
              })
            ) : (
              <div className="no-results">
                {options.length === 0 ? 
                  `Nenhum ${type} disponível` : 
                  'Nenhum resultado encontrado'
                }
              </div>
            )}
          </div>
          <div className="filter-actions">
            <button className="apply-btn" onClick={onClose}>
              Aplicar ({currentSelected.length})
            </button>
            <button className="select-all-btn" onClick={selectAll}>
              Marcar Todos
            </button>
            <button className="cancel-btn" onClick={clearAll}>
              Limpar Tudo
            </button>
          </div>
        </div>
      </div>
    );
  };



  // Função para obter opções de filtros interligados (estrutura hierárquica completa) - memoizada
  const getFilterOptions = React.useCallback((type) => {
    switch(type) {
      case 'coordenador':
        console.log('🔍 DEBUG: getFilterOptions - coordenador');
        console.log('🔍 DEBUG: teamData.coordenadores:', teamData.coordenadores);
        console.log('🔍 DEBUG: currentUser:', currentUser);
        
        // Mostrar apenas coordenadores que têm áreas vinculadas (com técnicos)
        const coordenadoresComAreas = teamData.coordenadores.filter(coord => {
          // Verificar se este coordenador tem áreas vinculadas
          const areasDoCoord = teamData.areas.filter(area => area.coordenadorId === coord.id);
          
          // Verificar se pelo menos uma área tem técnicos vinculados
          const temTecnicosVinculados = areasDoCoord.some(area => 
            teamData.tecnicos.some(tec => tec.areaId === area.id)
          );
          
          return areasDoCoord.length > 0 && temTecnicosVinculados;
        });
        
        const coordOptions = coordenadoresComAreas.map(coord => coord.nome);
        console.log('🔍 DEBUG: coordOptions:', coordOptions);
        return coordOptions;
      
      case 'area':
        // Se há coordenador selecionado, mostrar apenas suas áreas que têm técnicos
        if (selectedFilterItems.coordenador.length > 0) {
          const coordenadorNomes = selectedFilterItems.coordenador;
          const coordenadorIds = teamData.coordenadores
            .filter(coord => coordenadorNomes.includes(coord.nome))
            .map(coord => coord.id);
          
          const areaOptions = teamData.areas
            .filter(area => {
              // Área deve pertencer ao coordenador selecionado
              const pertenceAoCoord = coordenadorIds.includes(area.coordenadorId);
              // Área deve ter pelo menos um técnico vinculado
              const temTecnicos = teamData.tecnicos.some(tec => tec.areaId === area.id);
              return pertenceAoCoord && temTecnicos;
            })
            .map(area => area.nome);
          return areaOptions;
        }
        
        // Se há técnico selecionado, mostrar apenas a área do técnico
        if (selectedFilterItems.tecnico.length > 0) {
          const tecnicoNomes = selectedFilterItems.tecnico;
          const tecnicoIds = teamData.tecnicos
            .filter(tec => tecnicoNomes.includes(tec.nome))
            .map(tec => tec.id);
          
          const areaIds = teamData.tecnicos
            .filter(tec => tecnicoIds.includes(tec.id) && tec.areaId)
            .map(tec => tec.areaId);
          
          const areaOptions = teamData.areas
            .filter(area => areaIds.includes(area.id) && area.coordenadorId)
            .map(area => area.nome);
          return areaOptions;
        }
        
        // Caso contrário, mostrar apenas áreas que têm coordenador E técnicos
        const allAreaOptions = teamData.areas
          .filter(area => {
            // Área deve ter coordenador vinculado
            const temCoord = area.coordenadorId;
            // Área deve ter pelo menos um técnico vinculado
            const temTecnicos = teamData.tecnicos.some(tec => tec.areaId === area.id);
            return temCoord && temTecnicos;
          })
                      .map(area => area.nome);
        return allAreaOptions;
      
      case 'tecnico':
        // Se há coordenador selecionado, mostrar técnicos das áreas do coordenador
        if (selectedFilterItems.coordenador.length > 0) {
          const coordenadorNomes = selectedFilterItems.coordenador;
          const coordenadorIds = teamData.coordenadores
            .filter(coord => coordenadorNomes.includes(coord.nome))
            .map(coord => coord.id);
          
          const areaIds = teamData.areas
            .filter(area => coordenadorIds.includes(area.coordenadorId))
            .map(area => area.id);
          
          let tecnicoOptions = teamData.tecnicos
            .filter(tec => areaIds.includes(tec.areaId))
            .map(tec => tec.nome);
          
          // Adicionar técnicos com ordens mas não cadastrados (usando nomes reais)
          // IMPORTANTE: Só adicionar se o técnico pertencer ao coordenador selecionado
          const technicianCacheKeys = Object.keys(technicianDataCache);
          technicianCacheKeys.forEach(techName => {
            if (!tecnicoOptions.includes(techName) && technicianDataCache[techName]) {
              const hasOrders = Object.values(technicianDataCache[techName]).some(group => group.length > 0);
              if (hasOrders) {
                // Verificar se o técnico pertence ao coordenador através do mapeamento
                const technicianId = technicianNameToIdMap[techName];
                if (technicianId) {
                  // Verificar se o técnico está vinculado a alguma área do coordenador
                  const belongsToCoordinator = teamData.tecnicos.some(tec => 
                    tec.id === technicianId && areaIds.includes(tec.areaId)
                  );
                  
                  if (belongsToCoordinator) {
                    console.log(`➕ Adicionando técnico "${techName}" aos filtros do coordenador (pertence ao coordenador)`);
                    tecnicoOptions.push(techName);
                  } else {
                    console.log(`❌ Técnico "${techName}" tem ordens mas não pertence ao coordenador selecionado`);
                  }
                } else {
                  console.log(`❌ Técnico "${techName}" não tem ID mapeado, não pode verificar vinculação`);
                }
              }
            }
          });
          
          return tecnicoOptions;
        }
        
        // Se há área selecionada, mostrar técnicos da área
        if (selectedFilterItems.area.length > 0) {
          const areaNomes = selectedFilterItems.area;
          const areaIds = teamData.areas
            .filter(area => areaNomes.includes(area.nome))
            .map(area => area.id);
          
          let tecnicoOptions = teamData.tecnicos
            .filter(tec => areaIds.includes(tec.areaId))
            .map(tec => tec.nome);
          
          // Adicionar técnicos com ordens mas não cadastrados (usando nomes reais)
          // IMPORTANTE: Só adicionar se o técnico pertencer à área selecionada
          const technicianCacheKeys = Object.keys(technicianDataCache);
          technicianCacheKeys.forEach(techName => {
            if (!tecnicoOptions.includes(techName) && technicianDataCache[techName]) {
              const hasOrders = Object.values(technicianDataCache[techName]).some(group => group.length > 0);
              if (hasOrders) {
                // Verificar se o técnico pertence à área através do mapeamento
                const technicianId = technicianNameToIdMap[techName];
                if (technicianId) {
                  // Verificar se o técnico está vinculado a alguma área selecionada
                  const belongsToArea = teamData.tecnicos.some(tec => 
                    tec.id === technicianId && areaIds.includes(tec.areaId)
                  );
                  
                  if (belongsToArea) {
                    console.log(`➕ Adicionando técnico "${techName}" aos filtros da área (pertence à área)`);
                    tecnicoOptions.push(techName);
                  } else {
                    console.log(`❌ Técnico "${techName}" tem ordens mas não pertence à área selecionada`);
                  }
                } else {
                  console.log(`❌ Técnico "${techName}" não tem ID mapeado, não pode verificar vinculação`);
                }
              }
            }
          });
          
          return tecnicoOptions;
        }
        
                // Caso contrário, mostrar apenas técnicos com estrutura hierárquica completa
        let allTecnicoOptions = teamData.tecnicos
          .filter(tec => {
            // Técnico deve ter área vinculada
            if (!tec.areaId) return false;
            
            // A área do técnico deve ter coordenador vinculado
            const areaDoTecnico = teamData.areas.find(area => area.id === tec.areaId);
            return areaDoTecnico && areaDoTecnico.coordenadorId;
          })
          .map(tec => tec.nome);
        
        // NOVIDADE: Adicionar técnicos que têm ordens mas não estão cadastrados (usando nomes reais)
        // IMPORTANTE: Só adicionar se tiver estrutura hierárquica completa
        const technicianCacheKeys = Object.keys(technicianDataCache);
        technicianCacheKeys.forEach(techName => {
          // Se o técnico não está na lista de cadastrados, mas tem dados em cache
          if (!allTecnicoOptions.includes(techName) && technicianDataCache[techName]) {
            // Verificar se o técnico realmente tem ordens
            const hasOrders = Object.values(technicianDataCache[techName]).some(group => group.length > 0);
            if (hasOrders) {
              // Verificar se o técnico tem estrutura hierárquica completa através do mapeamento
              const technicianId = technicianNameToIdMap[techName];
              if (technicianId) {
                // Verificar se o técnico está vinculado a uma área com coordenador
                const hasCompleteHierarchy = teamData.tecnicos.some(tec => {
                  if (tec.id === technicianId && tec.areaId) {
                    const areaDoTecnico = teamData.areas.find(area => area.id === tec.areaId);
                    return areaDoTecnico && areaDoTecnico.coordenadorId;
                  }
                  return false;
                });
                
                if (hasCompleteHierarchy) {
                  console.log(`➕ Adicionando técnico "${techName}" aos filtros (tem ordens e estrutura hierárquica completa)`);
                  allTecnicoOptions.push(techName);
                } else {
                  console.log(`❌ Técnico "${techName}" tem ordens mas não tem estrutura hierárquica completa`);
                }
              } else {
                console.log(`❌ Técnico "${techName}" não tem ID mapeado, não pode verificar hierarquia`);
              }
            }
          }
        });
        
        return allTecnicoOptions;
      
      default:
        return [];
    }
  }, [selectedFilterItems.coordenador, selectedFilterItems.area, selectedFilterItems.tecnico, teamData, technicianDataCache, technicianNameToIdMap]);

  // Função para verificar se uma ordem corresponde ao termo de busca
  const orderMatchesSearch = (order, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return true;
    
    const term = searchTerm.toLowerCase().trim();
    
    // Campos para buscar na ordem
    const searchFields = [
      order.id || '',
      order.TB02115_OS || '',
      order.cliente || order.TB01008_NOME || '',
      order.TB02115_BAIRRO || '',
      order.TB02115_EQUIPAMENTO || order.TB01010_RESUMIDO || order.TB01010_NOME || '',
      order.TB02115_SERIE || '',
      order.TB02115_PATRIMONIO || '',
      order.TB02115_MOTIVO || '',
      order.tipo || getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA) || '',
      order.sla || getSLAFromCalcRestante(order.CALC_RESTANTE) || ''
    ];
    
    return searchFields.some(field => 
      field.toString().toLowerCase().includes(term)
    );
  };

  // Função para filtrar ordens por busca (aplicável tanto para "Em Aberto" quanto para técnicos)
  const filterOrdersBySearch = (orders, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return orders;
    
    return orders.filter(order => orderMatchesSearch(order, searchTerm));
  };



  const getFilteredOrders = React.useMemo(() => {
    console.log('🔍 getFilteredOrders - availableOrdersState:', availableOrdersState);
    console.log('🔍 getFilteredOrders - searchTerm:', searchTerm);
    
    const filtered = availableOrdersState
      .filter(item => item.cidade && item.cidade.trim() !== '') // Garantir que tem cidade
      .map(item => ({
        ...item,
        ordens: item.ordens.filter(ordem => orderMatchesSearch(ordem, searchTerm)) // Aplicar filtro de busca
      }))
      .filter(item => item.ordens.length > 0);
    
    console.log('🔍 getFilteredOrders - resultado filtrado:', filtered);
    return filtered;
  }, [availableOrdersState, searchTerm]);

  const getGroupedByCity = React.useMemo(() => {
    const filtered = getFilteredOrders;
    console.log('🔍 getGroupedByCity - filtered:', filtered);
    console.log('🔍 getGroupedByCity - dataSource:', dataSource);
    let result = [];
    
    // Se os dados vêm da API, usar a ordenação que já vem do backend
    if (dataSource === 'sql_server' && filtered.length > 0) {
      console.log('🔍 Frontend - Processando dados do SQL Server, primeira cidade:', filtered[0]);
      result = filtered.map(item => ({
        cidade: item.cidade,
        ordens: item.ordens.map(ordem => {
          const mapped = mapOrderToLegacyFormat(ordem);
          console.log('🔍 Frontend - Ordem original vs mapeada:', { original: ordem, mapped: mapped });
          return mapped;
        })
      }));
    } else {
      // Caso contrário, usar agrupamento local (dados mock)
      const grouped = {};
      
      filtered.forEach(item => {
        if (item.cidade && item.cidade.trim() !== '') {
          if (!grouped[item.cidade]) {
            grouped[item.cidade] = [];
          }
          const mappedOrders = item.ordens.map(mapOrderToLegacyFormat);
          grouped[item.cidade].push(...mappedOrders);
        }
      });

      // Para dados mock, ordenar alfabeticamente
      result = Object.keys(grouped)
        .sort()
        .map(cidade => ({
          cidade,
          ordens: grouped[cidade]
        }));
    }

    // Aplicar filtros da coluna Em Aberto
    if (selectedColumnFilters.cidade.length > 0) {
      result = result.filter(group => 
        selectedColumnFilters.cidade.includes(group.cidade)
      );
    }

    // Aplicar filtros por bairro
    if (selectedColumnFilters.bairro.length > 0) {
      result = result.map(group => ({
        ...group,
        ordens: group.ordens.filter(ordem => {
          const bairro = ordem.TB02115_BAIRRO || '';
          return selectedColumnFilters.bairro.includes(bairro);
        })
      })).filter(group => group.ordens.length > 0); // Remover grupos sem ordens
    }

    // Aplicar filtros por cliente
    if (selectedColumnFilters.cliente.length > 0) {
      result = result.map(group => ({
        ...group,
        ordens: group.ordens.filter(ordem => {
          const cliente = ordem.cliente || ordem.TB01008_NOME;
          return selectedColumnFilters.cliente.includes(cliente);
        })
      })).filter(group => group.ordens.length > 0); // Remover grupos sem ordens
    }

    // Aplicar filtros por tipo de OS
    if (selectedColumnFilters.tipoOS.length > 0) {
      result = result.map(group => ({
        ...group,
        ordens: group.ordens.filter(ordem => {
          // Obter o tipo já mapeado da ordem
          const tipoMapeado = ordem.tipo || getServiceTypeFromPreventiva(ordem.TB02115_PREVENTIVA);
          return selectedColumnFilters.tipoOS.includes(tipoMapeado);
        })
      })).filter(group => group.ordens.length > 0); // Remover grupos sem ordens
    }

    // Aplicar filtros por SLA
    if (selectedColumnFilters.sla.length > 0) {
      result = result.map(group => ({
        ...group,
        ordens: group.ordens.filter(ordem => {
          const calcRestante = ordem.CALC_RESTANTE || 0;
          const sla = getSLAFromCalcRestante(calcRestante);
          return selectedColumnFilters.sla.includes(sla);
        })
      })).filter(group => group.ordens.length > 0); // Remover grupos sem ordens
    }

    // Aplicar filtros por equipamento
    if (selectedColumnFilters.equipamento.length > 0) {
      result = result.map(group => ({
        ...group,
        ordens: group.ordens.filter(ordem => {
          const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
          return selectedColumnFilters.equipamento.includes(equipamento);
        })
      })).filter(group => group.ordens.length > 0); // Remover grupos sem ordens
    }

    // Aplicar filtros por status
    if (selectedColumnFilters.status.length > 0) {
      result = result.map(group => ({
        ...group,
        ordens: group.ordens.filter(ordem => {
          const status = ordem.TB01073_NOME || '';
          return selectedColumnFilters.status.includes(status);
        })
      })).filter(group => group.ordens.length > 0); // Remover grupos sem ordens
    }

    console.log('🔍 getGroupedByCity - resultado final:', result);
    return result;
  }, [getFilteredOrders, dataSource, selectedColumnFilters]);





  const getAllTechniques = () => {
    // Retorna lista vazia - técnicos agora vêm dos dados reais do banco
    return [];
  };

  // Função para verificar se há filtros ativos (coordenador, área ou técnico) - memoizada
  const hasActiveTeamFilters = React.useMemo(() => {
    return selectedFilterItems.coordenador.length > 0 || 
           selectedFilterItems.area.length > 0 || 
           selectedFilterItems.tecnico.length > 0;
  }, [selectedFilterItems.coordenador, selectedFilterItems.area, selectedFilterItems.tecnico]);

  // Função para obter técnicos baseado nos filtros aplicados usando relacionamentos da equipe
  const getFilteredTechnicians = React.useMemo(() => {
    // Se não há filtros de equipe ativos, não mostrar técnicos
    if (!hasActiveTeamFilters) {
      return [];
    }

    // SEMPRE retornar exatamente os técnicos que estão marcados no filtro
    // A sincronização automática já garante que quando coordenadores/áreas são selecionados,
    // os técnicos correspondentes são automaticamente marcados no filtro
    const filteredTechnicians = selectedFilterItems.tecnico || [];

    // Logs apenas quando há mudanças significativas (não em todos os renders)
    if (filteredTechnicians.length > 0) {
      console.log('🔍 Técnicos filtrados (exatos do filtro):', filteredTechnicians);
    }

    return filteredTechnicians;
  }, [selectedFilterItems.tecnico, hasActiveTeamFilters]);

  // Alias para manter compatibilidade
  const getVisibleTechniques = getFilteredTechnicians;

  // Função OTIMIZADA para carregar dados dos técnicos com carregamento inteligente
  const loadTechnicianData = async (technicianName) => {
    try {
      // Verificar se já temos dados em cache
      if (technicianDataCache[technicianName]) {
        console.log(`⚡ Usando dados em cache para técnico "${technicianName}"`);
        return technicianDataCache[technicianName];
      }
      
      // Converter nome para ID antes da chamada da API
      const technicianId = technicianName ? getTechnicianIdByName(technicianName) : null;
      
      if (!technicianId) {
        console.warn(`⚠️ Técnico "${technicianName}" não tem ID válido, usando dados vazios`);
        const defaultData = {
          'Em serviço': [],
          'Previsto para hoje': [],
          'Previstas para amanhã': [],
          'Futura': []
        };
        
        // Salvar dados vazios no cache
        setTechnicianDataCache(prev => ({
          ...prev,
          [technicianName]: defaultData
        }));
        
        return defaultData;
      }
      
      console.log(`🔄 Carregamento sob demanda para técnico "${technicianName}" (ID: ${technicianId})`);
      
      // Primeiro verificar se este técnico tem ordens de serviço
      const availableResponse = await fetch(`${API_BASE_URL}/api/orders/technicians/available`);
      const availableResult = await availableResponse.json();
      
      if (availableResult.success) {
        const technicianHasOrders = availableResult.data.some(t => t.technicianId === technicianId);
        
        if (!technicianHasOrders) {
          console.log(`💡 Técnico "${technicianName}" não possui ordens de serviço, usando dados vazios`);
          const defaultData = {
            'Em serviço': [],
            'Previsto para hoje': [],
            'Previstas para amanhã': [],
            'Futura': []
          };
          
          // Salvar dados vazios no cache
          setTechnicianDataCache(prev => ({
            ...prev,
            [technicianName]: defaultData
          }));
          
          return defaultData;
        }
      }
      
      // Carregar dados para o técnico
      const url = `${API_BASE_URL}/api/orders/technicians?technicianId=${encodeURIComponent(technicianId)}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Dados carregados sob demanda para técnico "${technicianName}":`, result.data);
        
        // Salvar dados no cache
        setTechnicianDataCache(prev => ({
          ...prev,
          [technicianName]: result.data
        }));
        
        return result.data;
      } else {
        console.error(`❌ Erro ao carregar dados do técnico "${technicianName}":`, result.message);
        const defaultData = {
          'Em serviço': [],
          'Previsto para hoje': [],
          'Previstas para amanhã': [],
          'Futura': []
        };
        
        // Salvar dados vazios no cache para evitar tentativas repetidas
        setTechnicianDataCache(prev => ({
          ...prev,
          [technicianName]: defaultData
        }));
        
        return defaultData;
      }
    } catch (error) {
      console.error(`❌ Erro na requisição para técnico "${technicianName}":`, error);
      const defaultData = {
        'Em serviço': [],
        'Previsto para hoje': [],
        'Previstas para amanhã': [],
        'Futura': []
      };
      
      // Salvar dados vazios no cache para evitar tentativas repetidas
      setTechnicianDataCache(prev => ({
        ...prev,
        [technicianName]: defaultData
      }));
      
      return defaultData;
    }
  };

  // Inicializar colunas de técnicos quando os filtros mudarem (com debounce)
  React.useEffect(() => {
    const visibleTechs = getVisibleTechniques;
    console.log('🔄 Atualizando colunas de técnicos para:', visibleTechs);
    
    // Verificar se a lista de técnicos realmente mudou
    const currentTechsString = JSON.stringify(columnOrder.sort());
    const newTechsString = JSON.stringify(visibleTechs.sort());
    
    if (currentTechsString !== newTechsString) {
      console.log('🔄 Lista de técnicos mudou, atualizando colunas');
      
      // Debounce para evitar múltiplas execuções
      const timeoutId = setTimeout(() => {
        const initializeTechnicians = async () => {
          try {
            setIsLoadingTechnicianColumns(true);
            
            const newTechniqueColumns = {};
            const newTechnicianGroups = {};
            
            // Identificar quais técnicos são novos e precisam carregar dados
            const newTechnicians = [];
            const existingTechnicians = [];
            
            for (const techName of visibleTechs) {
              // Preservar dados existentes se o técnico já tinha uma coluna
              if (techniqueColumns[techName]) {
                newTechniqueColumns[techName] = techniqueColumns[techName];
              } else {
                newTechniqueColumns[techName] = [];
              }
              
              // Separar técnicos novos dos existentes
              if (technicianGroups[techName]) {
                newTechnicianGroups[techName] = technicianGroups[techName];
                existingTechnicians.push(techName);
              } else {
                newTechnicians.push(techName);
              }
            }
            
            // Usar dados pré-carregados (instantâneo)
            if (newTechnicians.length > 0) {
              console.log(`⚡ Usando dados pré-carregados para ${newTechnicians.length} técnicos:`, newTechnicians);
              console.log('🔍 DEBUG: Estado atual do cache:', technicianDataCache);
              console.log('🔍 DEBUG: Chaves do cache:', Object.keys(technicianDataCache));
              
              newTechnicians.forEach(techName => {
                // Verificar se existe no cache
                if (technicianDataCache[techName]) {
                  console.log(`⚡ Aplicando dados em cache para técnico "${techName}":`, technicianDataCache[techName]);
                  newTechnicianGroups[techName] = technicianDataCache[techName];
                } else {
                  console.log(`⚠️ Técnico "${techName}" não encontrado no cache, usando dados vazios`);
                  console.log('🔍 DEBUG: Técnicos disponíveis no cache:', Object.keys(technicianDataCache));
                  newTechnicianGroups[techName] = {
                    'Em serviço': [],
                    'Previsto para hoje': [],
                    'Previstas para amanhã': [],
                    'Futura': []
                  };
                }
              });
              
              console.log(`✅ Dados aplicados instantaneamente para ${newTechnicians.length} técnicos`);
              console.log('🔍 DEBUG: newTechnicianGroups após aplicação:', newTechnicianGroups);
            }

            // Atualizar estados
            setTechniqueColumns(newTechniqueColumns);
            console.log('🔍 DEBUG: Atualizando setTechnicianGroups com:', newTechnicianGroups);
            setTechnicianGroups(newTechnicianGroups);
            setColumnOrder(visibleTechs);
            
            console.log('✅ Colunas de técnicos atualizadas:', visibleTechs);
          } finally {
            setIsLoadingTechnicianColumns(false);
          }
        };
        
        initializeTechnicians();
      }, 100); // Debounce de 100ms
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('📋 Lista de técnicos não mudou, mantendo colunas atuais');
    }
  }, [getVisibleTechniques, columnOrder, technicianDataCache, techniqueColumns, technicianGroups]);

  // Carregar configuração salva do banco de dados
  React.useEffect(() => {
    const savedConfig = localStorage.getItem('dbConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setDbConfig(config);
      } catch (error) {
        console.error('Erro ao carregar configuração do banco:', error);
      }
    }
  }, []);

  // Aplicar filtro inicial para mostrar apenas ordens Corretivas (TB02115_PREVENTIVA = 'N' mapeado para 'C')
  React.useEffect(() => {
    if (!initialFilterApplied && availableOrdersState.length > 0) {
      setSelectedColumnFilters(prev => ({
        ...prev,
        tipoOS: ['C'] // Aplicar filtro de Corretiva (C) após dados carregarem
      }));
      setInitialFilterApplied(true);
    }
  }, [availableOrdersState, initialFilterApplied]);

  const handleDropBetweenTechnicianSections = async (technicianName, fromGroup, toGroup) => {
    // Não permitir drop no grupo "Em serviço"
    if (toGroup === 'Em serviço') {
      console.log('❌ Não é permitido arrastar para "Em serviço"');
      return;
    }
    
    // Se não há ordens selecionadas, não fazer nada
    if (selectedOrders.length === 0) {
      console.log('⚠️ Nenhuma ordem selecionada para arrastar');
      return;
    }
    
    try {
      console.log(`🎯 Movendo ${selectedOrders.length} ordens do técnico "${technicianName}" de "${fromGroup}" para "${toGroup}"`);
      
      // Obter ID do técnico
      const technicianId = getTechnicianIdByName(technicianName);
      console.log(`🔍 ID do técnico "${technicianName}": ${technicianId}`);
      
      // Objeto que será enviado para o backend
      const requestPayload = {
        orderIds: selectedOrders,
        targetSection: toGroup,
        technicianId: technicianId
      };
      
      // Fazer chamada da API para atualizar status no banco de dados
      const response = await fetch(`${API_BASE_URL}/api/orders/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      const result = await response.json();
      
      // Preparar dados para o modal
      const orderResults = [];
      
      // Buscar informações das ordens nos grupos de técnicos
      const orderInfoMap = new Map();
      Object.keys(technicianGroups).forEach(tech => {
        Object.keys(technicianGroups[tech]).forEach(group => {
          technicianGroups[tech][group].forEach(order => {
            if (selectedOrders.includes(order.id)) {
              orderInfoMap.set(order.id, {
                cliente: order.cliente || order.TB01008_NOME || 'N/A',
                tecnico: tech,
                targetSection: toGroup
              });
            }
          });
        });
      });
      
      if (!result.success) {
        console.error('❌ Erro ao atualizar status no banco:', result.message);
        
        // Criar resultados de erro para o modal
        selectedOrders.forEach(orderId => {
          const orderInfo = orderInfoMap.get(orderId) || {};
          orderResults.push({
            orderId: orderId,
            status: 'error',
            errorMessage: result.message,
            cliente: orderInfo.cliente || 'N/A',
            tecnico: orderInfo.tecnico || 'N/A',
            targetSection: orderInfo.targetSection || toGroup
          });
        });
        
        // Mostrar modal com erro
        setOrderStatusResults(orderResults);
        setOrderStatusSummary({
          targetSection: toGroup,
          technicianName: technicianName
        });
        setShowOrderStatusModal(true);
        return;
      }
      
      console.log(`✅ Status atualizado no banco: ${result.message}`);
      console.log('📊 Detalhes:', result.data);
      
      // Processar resultados do backend
      if (result.data && result.data.results && Array.isArray(result.data.results)) {
        result.data.results.forEach(item => {
          const orderInfo = orderInfoMap.get(item.orderId) || {};
          orderResults.push({
            orderId: item.orderId,
            status: 'success',
            errorMessage: null,
            cliente: item.cliente || orderInfo.cliente || 'N/A',
            tecnico: orderInfo.tecnico || 'N/A',
            targetSection: orderInfo.targetSection || toGroup
          });
        });
      }
      
      // Processar erros do backend
      if (result.data && result.data.errors && Array.isArray(result.data.errors)) {
        result.data.errors.forEach(item => {
          const orderInfo = orderInfoMap.get(item.orderId) || {};
          orderResults.push({
            orderId: item.orderId,
            status: 'error',
            errorMessage: item.error,
            cliente: orderInfo.cliente || 'N/A',
            tecnico: orderInfo.tecnico || 'N/A',
            targetSection: orderInfo.targetSection || toGroup
          });
        });
      }
      
      // Se não há resultados estruturados, criar baseado no sucesso geral
      if (orderResults.length === 0) {
        if (result.success) {
          selectedOrders.forEach(orderId => {
            const orderInfo = orderInfoMap.get(orderId) || {};
            orderResults.push({
              orderId: orderId,
              status: 'success',
              errorMessage: null,
              cliente: orderInfo.cliente || 'N/A',
              tecnico: orderInfo.tecnico || 'N/A',
              targetSection: orderInfo.targetSection || toGroup
            });
          });
        } else {
          selectedOrders.forEach(orderId => {
            const orderInfo = orderInfoMap.get(orderId) || {};
            orderResults.push({
              orderId: orderId,
              status: 'error',
              errorMessage: result.message,
              cliente: orderInfo.cliente || 'N/A',
              tecnico: orderInfo.tecnico || 'N/A',
              targetSection: orderInfo.targetSection || toGroup
            });
          });
        }
      }
      
      console.log('📊 Resultados processados:', orderResults);
      console.log('📊 Total de resultados:', orderResults.length);
      
      // Mostrar modal com resultados
      setOrderStatusResults(orderResults);
      setOrderStatusSummary({
        targetSection: toGroup,
        technicianName: technicianName
      });
      setShowOrderStatusModal(true);
      
      // Se a atualização no banco foi bem-sucedida, atualizar o estado local
      const newTechnicianGroups = { ...technicianGroups };
      
      // Encontrar e mover as ordens entre as seções
      console.log('🔍 Movendo ordens entre seções...');
      console.log('🔍 Ordens a mover:', selectedOrders);
      console.log('🔍 De:', fromGroup, 'Para:', toGroup);
      
      selectedOrders.forEach(orderId => {
        console.log(`🔍 Procurando ordem ${orderId}...`);
        let found = false;
        
        // Remover da seção de origem
        if (newTechnicianGroups[technicianName] && newTechnicianGroups[technicianName][fromGroup]) {
          const orderIndex = newTechnicianGroups[technicianName][fromGroup].findIndex(order => order.id === orderId);
          if (orderIndex !== -1) {
            console.log(`✅ Encontrada ordem ${orderId} na seção ${fromGroup}`);
            const orderToMove = newTechnicianGroups[technicianName][fromGroup][orderIndex];
            
            // Remover da seção de origem
            newTechnicianGroups[technicianName][fromGroup] = newTechnicianGroups[technicianName][fromGroup].filter(
              order => order.id !== orderId
            );
            
            // Adicionar à seção de destino
            if (!newTechnicianGroups[technicianName][toGroup]) {
              newTechnicianGroups[technicianName][toGroup] = [];
            }
            newTechnicianGroups[technicianName][toGroup].push(orderToMove);
            
            found = true;
          }
        }
        
        if (!found) {
          console.log(`⚠️ Ordem ${orderId} não encontrada na seção ${fromGroup}`);
        }
      });
      
      setTechnicianGroups(newTechnicianGroups);
      setSelectedOrders([]); // Clear selection after success
      
    } catch (error) {
      console.error('❌ Erro na requisição de movimentação entre seções:', error);
      
      // Criar resultados de erro para o modal
      const errorResults = selectedOrders.map(orderId => ({
        orderId,
        status: 'error',
        errorMessage: error.message,
        cliente: 'N/A',
        tecnico: technicianName,
        targetSection: toGroup
      }));
      
      setOrderStatusResults(errorResults);
      setOrderStatusSummary({
        targetSection: toGroup,
        technicianName: technicianName
      });
      setShowOrderStatusModal(true);
    }
  };

  const handleDropToTechnique = async (technicianName, groupName = 'Previsto para hoje') => {
    // Não permitir drop no grupo "Em serviço"
    if (groupName === 'Em serviço') {
      return;
    }
    
    const newTechnicianGroups = { ...technicianGroups };
    if (!newTechnicianGroups[technicianName]) {
      return;
    }
    
    // Se não há ordens selecionadas, não fazer nada
    if (selectedOrders.length === 0) {
      console.log('⚠️ Nenhuma ordem selecionada para arrastar');
      return;
    }
    
    try {
      console.log(`🎯 Atualizando ${selectedOrders.length} ordens para seção "${groupName}" do técnico "${technicianName}"`);
      
      // Obter ID do técnico
      const technicianId = getTechnicianIdByName(technicianName);
      console.log(`🔍 ID do técnico "${technicianName}": ${technicianId}`);
      
      // Objeto que será enviado para o backend
      const requestPayload = {
        orderIds: selectedOrders,
        targetSection: groupName,
        technicianId: technicianId
      };
      
      // Fazer chamada da API para atualizar status no banco de dados
      const response = await fetch(`${API_BASE_URL}/api/orders/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      const result = await response.json();
      
      // Preparar dados para o modal
      const orderResults = [];
      
      // Buscar dados das ordens selecionadas para o modal
      const currentData = availableOrdersState;
      const realOrdersData = [];
      
      if (!result.success) {
        console.error('❌ Erro ao atualizar status no banco:', result.message);
        
        // Criar resultados de erro para o modal
        selectedOrders.forEach(orderId => {
          let orderData = { orderId, status: 'error', errorMessage: result.message };
          
          // Buscar dados da ordem para o modal
          currentData.forEach(cityGroup => {
            cityGroup.ordens.forEach(ordem => {
              if ((ordem.id || ordem.TB02115_CODIGO) === orderId) {
                orderData.cliente = ordem.cliente || ordem.TB01008_NOME;
              }
            });
          });
          
          orderResults.push(orderData);
        });
        
        // Mostrar modal com erro
        setOrderStatusResults(orderResults);
        setOrderStatusSummary({
          targetSection: groupName,
          technicianName: technicianName
        });
        setShowOrderStatusModal(true);
        return;
      }
      
      console.log(`✅ Status atualizado no banco: ${result.message}`);
      console.log('📊 Detalhes:', result.data);
      
      // Só proceder com a atualização local se o banco foi atualizado com sucesso
      
      selectedOrders.forEach(orderId => {
        // Procurar a ordem nos dados disponíveis
        availableOrdersState.forEach(cityGroup => {
          cityGroup.ordens.forEach(ordem => {
            if ((ordem.id || ordem.TB02115_CODIGO) === orderId) {
              // Preservar dados reais originais
              const realOrder = {
                id: ordem.id || ordem.TB02115_CODIGO,
                cliente: ordem.cliente || ordem.TB01008_NOME,
                equipamento: ordem.equipamento || ordem.TB01010_NOME,
                tipo: ordem.tipo || getServiceTypeFromPreventiva(ordem.TB02115_PREVENTIVA),
                sla: ordem.sla || getSLAFromCalcRestante(ordem.CALC_RESTANTE),
                cidade: cityGroup.cidade,
                pedidoVinculado: ordem.pedidoVinculado,
                // Campos necessários para os modais e sidebars
                numeroSerie: ordem.numeroSerie,
                serie: ordem.serie,
                patrimonio: ordem.patrimonio,
                endereco: ordem.endereco,
                dataAbertura: ordem.dataAbertura,
                tecnico: ordem.tecnico,
                coordenador: ordem.coordenador,
                area: ordem.area,
                bairro: ordem.bairro,
                estado: ordem.estado,
                contrato: ordem.contrato,
                // Preservar todos os campos originais para referência
                TB02115_CODIGO: ordem.TB02115_CODIGO,
                TB01008_NOME: ordem.TB01008_NOME,
                TB01010_NOME: ordem.TB01010_NOME,
                TB02115_PREVENTIVA: ordem.TB02115_PREVENTIVA,
                TB02115_BAIRRO: ordem.TB02115_BAIRRO,
                CALC_RESTANTE: ordem.CALC_RESTANTE,
                TB01047_NOME: ordem.TB01047_NOME,
                TB01018_NOME: ordem.TB01018_NOME,
                TB01073_NOME: ordem.TB01073_NOME
              };
              realOrdersData.push(realOrder);
              
              // Adicionar resultado de sucesso para o modal
              orderResults.push({
                orderId: realOrder.id,
                cliente: realOrder.cliente,
                status: 'success',
                targetSection: groupName
              });
            }
          });
        });
      });
      
      // Adicionar ordens reais ao grupo do técnico
      newTechnicianGroups[technicianName][groupName] = [
        ...newTechnicianGroups[technicianName][groupName],
        ...realOrdersData
      ];
      
      // Remover ordens de availableOrdersState
      const newAvailableOrders = availableOrdersState.map(item => ({
        ...item,
        ordens: item.ordens.filter(ordem => 
          !selectedOrders.includes(ordem.id || ordem.TB02115_CODIGO)
        )
      })).filter(item => item.ordens.length > 0);
      
      setAvailableOrdersState(newAvailableOrders);
      setTechnicianGroups(newTechnicianGroups);
      setSelectedOrders([]);
      
      // Mostrar modal com resultados de sucesso
      setOrderStatusResults(orderResults);
      setOrderStatusSummary({
        targetSection: groupName,
        technicianName: technicianName
      });
      setShowOrderStatusModal(true);
      
    } catch (error) {
      console.error('❌ Erro na chamada da API de atualização:', error);
      
      // Criar resultados de erro para o modal
      const errorResults = selectedOrders.map(orderId => {
        let orderData = { orderId, status: 'error', errorMessage: `Erro de conexão: ${error.message}` };
        
        // Buscar dados da ordem para o modal
        availableOrdersState.forEach(cityGroup => {
          cityGroup.ordens.forEach(ordem => {
            if ((ordem.id || ordem.TB02115_CODIGO) === orderId) {
              orderData.cliente = ordem.cliente || ordem.TB01008_NOME;
            }
          });
        });
        
        return orderData;
      });
      
      // Mostrar modal com erro
      setOrderStatusResults(errorResults);
      setOrderStatusSummary({
        targetSection: groupName,
        technicianName: technicianName
      });
      setShowOrderStatusModal(true);
    }
  };

  // Nova função para retornar ordens para "Em aberto"
  const handleReturnToOpen = async (orderIds) => {
    // Garantir que orderIds seja sempre um array
    const orderIdsArray = Array.isArray(orderIds) ? orderIds : [orderIds];
    console.log(`🔄 handleReturnToOpen chamado para ${orderIdsArray.length} ordens:`, orderIdsArray);
    
    try {
      console.log(`🎯 Atualizando ${orderIdsArray.length} ordens para status "Em Aberto"`);
      
      // Objeto que será enviado para o backend
      const requestPayload = {
        orderIds: orderIdsArray,
        targetSection: 'Em Aberto',
        technicianId: null // Não há técnico para "Em Aberto"
      };
      
      // Fazer chamada da API para atualizar status no banco de dados
      const response = await fetch(`${API_BASE_URL}/api/orders/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      const result = await response.json();
      
      // Preparar dados para o modal
      const orderResults = [];
      
      if (!result.success) {
        console.error('❌ Erro ao atualizar status no banco:', result.message);
        
        // Criar resultados de erro para o modal
        orderIdsArray.forEach(orderId => {
          let orderData = { orderId, status: 'error', errorMessage: result.message };
          
          // Buscar dados da ordem para o modal
          availableOrdersState.forEach(cityGroup => {
            cityGroup.ordens.forEach(ordem => {
              if ((ordem.id || ordem.TB02115_CODIGO) === orderId) {
                orderData.cliente = ordem.cliente || ordem.TB01008_NOME;
              }
            });
          });
          
          orderResults.push(orderData);
        });
        
        // Mostrar modal com erro
        setOrderStatusResults(orderResults);
        setOrderStatusSummary({
          targetSection: 'Em Aberto',
          technicianName: null
        });
        setShowOrderStatusModal(true);
        return;
      }
      
      console.log(`✅ Status atualizado no banco: ${result.message}`);
      console.log('📊 Detalhes:', result.data);
      
      // Encontrar informações das ordens antes de processar resultados
      const orderInfoMap = new Map();
      
      // Buscar informações das ordens nos grupos de técnicos
      Object.keys(technicianGroups).forEach(technician => {
        Object.keys(technicianGroups[technician]).forEach(groupName => {
          technicianGroups[technician][groupName].forEach(order => {
            if (orderIdsArray.includes(order.id)) {
              orderInfoMap.set(order.id, {
                cliente: order.cliente || order.TB01008_NOME || 'N/A',
                tecnico: technician,
                targetSection: 'Em Aberto'
              });
            }
          });
        });
      });
      
      // Processar resultados do backend
      if (result.data && result.data.results && Array.isArray(result.data.results)) {
        // Processar resultados de sucesso
        result.data.results.forEach(item => {
          const orderInfo = orderInfoMap.get(item.orderId) || {};
          orderResults.push({
            orderId: item.orderId,
            status: 'success',
            errorMessage: null,
            cliente: item.cliente || orderInfo.cliente || 'N/A',
            tecnico: orderInfo.tecnico || 'N/A',
            targetSection: orderInfo.targetSection || 'Em Aberto'
          });
        });
      }
      
      // Processar erros do backend
      if (result.data && result.data.errors && Array.isArray(result.data.errors)) {
        result.data.errors.forEach(item => {
          const orderInfo = orderInfoMap.get(item.orderId) || {};
          orderResults.push({
            orderId: item.orderId,
            status: 'error',
            errorMessage: item.error,
            cliente: orderInfo.cliente || 'N/A',
            tecnico: orderInfo.tecnico || 'N/A',
            targetSection: orderInfo.targetSection || 'Em Aberto'
          });
        });
      }
      
      // Se não há resultados estruturados, criar baseado no sucesso geral
      if (orderResults.length === 0) {
        if (result.success) {
          // Se foi sucesso geral, criar resultados para todas as ordens
          orderIdsArray.forEach(orderId => {
            const orderInfo = orderInfoMap.get(orderId) || {};
            orderResults.push({
              orderId: orderId,
              status: 'success',
              errorMessage: null,
              cliente: orderInfo.cliente || 'N/A',
              tecnico: orderInfo.tecnico || 'N/A',
              targetSection: orderInfo.targetSection || 'Em Aberto'
            });
          });
        } else {
          // Se foi erro geral, criar resultados de erro para todas as ordens
          orderIdsArray.forEach(orderId => {
            const orderInfo = orderInfoMap.get(orderId) || {};
            orderResults.push({
              orderId: orderId,
              status: 'error',
              errorMessage: result.message,
              cliente: orderInfo.cliente || 'N/A',
              tecnico: orderInfo.tecnico || 'N/A',
              targetSection: orderInfo.targetSection || 'Em Aberto'
            });
          });
        }
      }
      
      console.log('📊 Resultados processados:', orderResults);
      console.log('📊 Total de resultados:', orderResults.length);
      
      // Mostrar modal com resultados
      setOrderStatusResults(orderResults);
      setOrderStatusSummary({
        targetSection: 'Em Aberto',
        technicianName: null
      });
      setShowOrderStatusModal(true);
      
      // Se a atualização no banco foi bem-sucedida, atualizar o estado local
      const newTechnicianGroups = { ...technicianGroups };
      const ordersToReturn = [];
      
      // Encontrar e remover as ordens dos grupos de técnicos
      console.log('🔍 Procurando ordens nos grupos de técnicos...');
      console.log('🔍 Ordens a procurar:', orderIdsArray);
      console.log('🔍 Grupos de técnicos disponíveis:', Object.keys(newTechnicianGroups));
      
      orderIdsArray.forEach(orderId => {
        console.log(`🔍 Procurando ordem ${orderId}...`);
        let found = false;
        
        Object.keys(newTechnicianGroups).forEach(technician => {
          Object.keys(newTechnicianGroups[technician]).forEach(groupName => {
            const orderIndex = newTechnicianGroups[technician][groupName].findIndex(order => order.id === orderId);
            if (orderIndex !== -1) {
              console.log(`✅ Encontrada ordem ${orderId} no técnico ${technician}, grupo ${groupName}`);
              const orderToReturn = newTechnicianGroups[technician][groupName][orderIndex];
              ordersToReturn.push(orderToReturn);
              newTechnicianGroups[technician][groupName] = newTechnicianGroups[technician][groupName].filter(
                order => order.id !== orderId
              );
              found = true;
            }
          });
        });
        
        if (!found) {
          console.log(`⚠️ Ordem ${orderId} não encontrada nos grupos de técnicos`);
        }
      });
      
      console.log('📊 Ordens encontradas para retorno:', ordersToReturn.length);
      console.log('📊 IDs das ordens encontradas:', ordersToReturn.map(o => o.id));
      
      // Se encontrou ordens, adicionar de volta aos dados disponíveis
      if (ordersToReturn.length > 0) {
        const newAvailableOrders = [...availableOrdersState];
        
        // Processar cada ordem retornada
        ordersToReturn.forEach(orderToReturn => {
          let groupFound = false;
          
          // Procurar grupo existente da cidade para adicionar a ordem
          for (let item of newAvailableOrders) {
            if (item.cidade === orderToReturn.cidade) {
              // Restaurar ordem com todos os dados originais
              const restoredOrder = {
                id: orderToReturn.id,
                cliente: orderToReturn.cliente,
                equipamento: orderToReturn.equipamento,
                sla: orderToReturn.sla,
                tipo: orderToReturn.tipo,
                atrasada: orderToReturn.sla === 'vencido',
                pedidoVinculado: orderToReturn.pedidoVinculado,
                // Campos necessários para os modais e sidebars
                numeroSerie: orderToReturn.numeroSerie,
                serie: orderToReturn.serie,
                patrimonio: orderToReturn.patrimonio,
                endereco: orderToReturn.endereco,
                dataAbertura: orderToReturn.dataAbertura,
                tecnico: orderToReturn.tecnico,
                coordenador: orderToReturn.coordenador,
                area: orderToReturn.area,
                bairro: orderToReturn.bairro,
                estado: orderToReturn.estado,
                contrato: orderToReturn.contrato,
                // Preservar todos os campos originais
                TB02115_CODIGO: orderToReturn.TB02115_CODIGO,
                TB01008_NOME: orderToReturn.TB01008_NOME,
                TB01010_NOME: orderToReturn.TB01010_NOME,
                TB02115_PREVENTIVA: orderToReturn.TB02115_PREVENTIVA,
                TB02115_BAIRRO: orderToReturn.TB02115_BAIRRO,
                CALC_RESTANTE: orderToReturn.CALC_RESTANTE,
                TB01047_NOME: orderToReturn.TB01047_NOME,
                TB01018_NOME: orderToReturn.TB01018_NOME,
                TB01073_NOME: orderToReturn.TB01073_NOME
              };
              
              item.ordens.push(restoredOrder);
              groupFound = true;
              break;
            }
          }
          
          // Se não encontrou grupo existente da cidade, criar novo
          if (!groupFound) {
            const restoredOrder = {
              id: orderToReturn.id,
              cliente: orderToReturn.cliente,
              equipamento: orderToReturn.equipamento,
              sla: orderToReturn.sla,
              tipo: orderToReturn.tipo,
              atrasada: orderToReturn.sla === 'vencido',
              pedidoVinculado: orderToReturn.pedidoVinculado,
              // Campos necessários para os modais e sidebars
              numeroSerie: orderToReturn.numeroSerie,
              serie: orderToReturn.serie,
              patrimonio: orderToReturn.patrimonio,
              endereco: orderToReturn.endereco,
              dataAbertura: orderToReturn.dataAbertura,
              tecnico: orderToReturn.tecnico,
              coordenador: orderToReturn.coordenador,
              area: orderToReturn.area,
              bairro: orderToReturn.bairro,
              estado: orderToReturn.estado,
              contrato: orderToReturn.contrato,
              // Preservar todos os campos originais
              TB02115_CODIGO: orderToReturn.TB02115_CODIGO,
              TB01008_NOME: orderToReturn.TB01008_NOME,
              TB01010_NOME: orderToReturn.TB01010_NOME,
              TB02115_PREVENTIVA: orderToReturn.TB02115_PREVENTIVA,
              TB02115_BAIRRO: orderToReturn.TB02115_BAIRRO,
              CALC_RESTANTE: orderToReturn.CALC_RESTANTE,
              TB01047_NOME: orderToReturn.TB01047_NOME,
              TB01018_NOME: orderToReturn.TB01018_NOME,
              TB01073_NOME: orderToReturn.TB01073_NOME
            };
            
            newAvailableOrders.push({
              cidade: orderToReturn.cidade,
              ordens: [restoredOrder]
            });
          }
        });
        
        setAvailableOrdersState(newAvailableOrders);
      }
      
      setTechnicianGroups(newTechnicianGroups);
      
      // Limpar seleção após o sucesso
      setSelectedOrders([]);
      
    } catch (error) {
      console.error('❌ Erro na requisição de retorno para "Em Aberto":', error);
      
      // Criar resultados de erro para o modal
      const errorResults = orderIdsArray.map(orderId => ({
        orderId,
        status: 'error',
        errorMessage: error.message,
        cliente: 'N/A'
      }));
      
      setOrderStatusResults(errorResults);
      setOrderStatusSummary({
        targetSection: 'Em Aberto',
        technicianName: null
      });
      setShowOrderStatusModal(true);
    }
  };

  const handleColumnReorder = (dragIndex, hoverIndex) => {
    const newOrder = [...columnOrder];
    const draggedItem = newOrder[dragIndex];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, draggedItem);
    setColumnOrder(newOrder);
  };

  // Função para geocodificar endereços usando API do backend com cache
  const geocodeAddress = async (address) => {
    try {
      console.log(`🌍 Fazendo geocodificação para: ${address}`);
      
      const response = await fetch('/api/geocode/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addresses: [{ orderId: 'temp', address }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📍 Resultado geocodificação:`, data);
      
      if (data.success && data.data && data.data.length > 0) {
        const result = data.data[0];
        if (result.lat && result.lng) {
          return {
            lat: result.lat,
            lng: result.lng,
            display_name: result.display_name || address
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
      return null;
    }
  };

  // Função para visualizar rota do técnico (versão simplificada - sem geocodificação)
  const handleViewTechnicianRoute = async (technicianName) => {
    try {
      setRouteModalLoading(true);
      setRouteModalError(null);
      setShowRouteModal(true); // Mostrar modal com loading
      
      // Buscar ordens do técnico para amanhã
      const tomorrowOrders = technicianGroups[technicianName]?.['Previstas para amanhã'] || [];
      
      if (tomorrowOrders.length === 0) {
        setRouteModalError(`Nenhuma ordem de serviço encontrada para amanhã para o técnico ${technicianName}`);
        setRouteModalLoading(false);
        setRouteModalData({
          technicianName,
          orders: []
        });
        return;
      }

      console.log(`🗺️ Buscando rota para ${technicianName} - ${tomorrowOrders.length} ordens`);
      
      // Filtrar ordens que têm cidade válida (excluir "Sem cidade")
      const validOrders = tomorrowOrders.filter(order => {
        const cidade = order.cidade || order.TB02115_CIDADE;
        return cidade && cidade.trim() !== '' && cidade !== 'Sem cidade';
      });

      if (validOrders.length === 0) {
        setRouteModalError(`Nenhuma ordem com cidade válida encontrada para o técnico ${technicianName}. Todas as ordens estão sem cidade definida.`);
        setRouteModalLoading(false);
        setRouteModalData({
          technicianName,
          orders: []
        });
        return;
      }

      console.log(`📍 ${validOrders.length} ordens com cidade válida encontradas`);
      
      // Buscar ordens roteirizadas do banco de dados
      const technicianId = validOrders[0]?.TB02115_CODTEC; // Usar o código do técnico da primeira ordem
      
      // Função para calcular a próxima data útil (próximo dia útil, pulando finais de semana)
      const getNextBusinessDay = (date = new Date()) => {
        const currentDate = new Date(date);
        let nextDay = new Date(currentDate);
        
        // Avançar para o próximo dia
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Verificar se é fim de semana e pular para segunda-feira
        const dayOfWeek = nextDay.getDay(); // 0 = Domingo, 6 = Sábado
        
        if (dayOfWeek === 0) { // Domingo
          nextDay.setDate(nextDay.getDate() + 1); // Pular para segunda-feira
        } else if (dayOfWeek === 6) { // Sábado
          nextDay.setDate(nextDay.getDate() + 2); // Pular para segunda-feira
        }
        
        return nextDay;
      };
      
      // Usar a próxima data útil, pois o usuário faz a roteirização para o próximo dia útil
      const nextBusinessDay = getNextBusinessDay();
      const forecastDate = nextBusinessDay.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      console.log(`🔍 Buscando ordens roteirizadas para a próxima data útil:`, {
        technicianId,
        forecastDate,
        validOrdersCount: validOrders.length
      });
      
      let routedOrders = [];
      if (technicianId) {
        try {
          const apiUrl = `${API_BASE_URL}/api/route/technician-orders/${technicianId}?forecast=${forecastDate}`;
          console.log(`🌐 Chamando API: ${apiUrl}`);
          
          const response = await fetch(apiUrl);
          const result = await response.json();
          
          console.log(`📡 Resposta da API:`, result);
          
          if (result.success) {
            routedOrders = result.data.orders;
            console.log(`🗂️ ${routedOrders.length} ordens roteirizadas carregadas do banco`);
          } else {
            console.warn('⚠️ Erro ao carregar ordens roteirizadas:', result.message);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao conectar com API de roteirização:', error);
        }
      }
      
      // Preparar ordens com endereço
      const ordersWithAddress = validOrders.map(order => {
        const cidade = order.cidade || order.TB02115_CIDADE;
        const endereco = order.endereco || order.TB02115_ENDERECO;
        const enderecoCompleto = endereco ? `${endereco}, ${cidade}` : cidade;
        
        // Verificar se a ordem está roteirizada
        // Converter ambos para string para garantir comparação correta
        const orderNumber = String(order.id || order.TB02115_CODIGO);
        const routedOrder = routedOrders.find(ro => String(ro.os) === orderNumber);
        
        console.log(`🔍 Verificando ordem ${orderNumber}:`, {
          orderNumber,
          routedOrders: routedOrders.map(ro => ({ os: ro.os, sequence: ro.sequence })),
          found: !!routedOrder
        });
        
        return {
          ...order,
          endereco: enderecoCompleto,
          isRouted: !!routedOrder,
          routeSequence: routedOrder?.sequence || null
        };
      });

      console.log(`✅ ${ordersWithAddress.length} ordens preparadas para exibição`);
      
      setRouteModalData({
        technicianName,
        orders: ordersWithAddress,
        technicianId,
        forecastDate
      });
      setRouteModalLoading(false);
      
    } catch (error) {
      console.error('Erro ao buscar rota:', error);
      setRouteModalError('Erro ao buscar rota: ' + error.message);
      setRouteModalLoading(false);
    }
  };

  // Função para selecionar/desselecionar todas as ordens de uma cidade
  const selectAllOrdersFromCity = (cityOrders) => {
    const cityOrderIds = cityOrders.map(ordem => ordem.id);
    setSelectedOrders(prevSelected => {
      // Verificar se todas as ordens da cidade já estão selecionadas
      const allSelected = cityOrderIds.every(id => prevSelected.includes(id));
      
      if (allSelected) {
        // Se todas estão selecionadas, desmarcar todas da cidade
        return prevSelected.filter(id => !cityOrderIds.includes(id));
      } else {
        // Se nem todas estão selecionadas, selecionar todas da cidade
        const newSelected = [...prevSelected];
        cityOrderIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      }
    });
    setOpenCityDropdown(null); // Fechar dropdown após ação
  };

  // Função para lidar com cliques simples vs duplos
  const handleOrderClick = (ordem) => {
    if (clickTimeoutRef.current) {
      // É um duplo clique
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setSelectedOrderForDetails(ordem);
    } else {
      // É um clique simples, aguardar para ver se vem outro
      clickTimeoutRef.current = setTimeout(() => {
        // Confirma que é um clique simples
        if (selectedOrders.includes(ordem.id)) {
          setSelectedOrders(selectedOrders.filter(o => o !== ordem.id));
        } else {
          setSelectedOrders([...selectedOrders, ordem.id]);
        }
        clickTimeoutRef.current = null;
      }, 250); // 250ms para detectar duplo clique
    }
  };

  // Cleanup do timeout quando o componente for desmontado
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Função para buscar detalhes do pedido vinculado
  const fetchPedidoDetails = async (codigoPedido) => {
    setLoadingPedido(true);
    setPedidoError(null);
    setPedidoDetails(null);
    
    try {
      console.log(`🔍 Buscando detalhes do pedido: ${codigoPedido}`);
      const response = await fetch(`${API_BASE_URL}/api/orders/pedido/${codigoPedido}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Detalhes do pedido carregados:', result.data);
        setPedidoDetails(result.data);
      } else {
        console.error('❌ Erro ao buscar pedido:', result.message);
        setPedidoError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição do pedido:', error);
      setPedidoError('Erro ao conectar com o servidor');
    } finally {
      setLoadingPedido(false);
    }
  };

  // Função para buscar linha do tempo do pedido
  const fetchTimelineData = async (codigoPedido) => {
    setLoadingTimeline(true);
    setTimelineError(null);
    
    try {
      console.log(`🕐 Buscando linha do tempo do pedido: ${codigoPedido}`);
      const response = await fetch(`${API_BASE_URL}/api/orders/pedido/${codigoPedido}/timeline`);
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Linha do tempo carregada:', result.data);
        setTimelineData(result.data);
      } else {
        console.error('❌ Erro ao buscar linha do tempo:', result.message);
        setTimelineError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição da linha do tempo:', error);
      setTimelineError('Erro ao conectar com o servidor');
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Função para alternar exibição da linha do tempo
  const toggleTimeline = (codigoPedido) => {
    if (showTimeline) {
      // Se já está aberto, fechar
      setShowTimeline(false);
      setTimelineData(null);
      setTimelineError(null);
    } else {
      // Se está fechado, abrir e buscar dados
      setShowTimeline(true);
      fetchTimelineData(codigoPedido);
    }
  };

  // Função para formatar data em PT-BR
  const formatDateTimeBR = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      // Criar data diretamente do string SQL Server sem conversão de timezone
      const date = new Date(dateString);
      
      // Formatar para padrão brasileiro dd/MM/yyyy HH:mm
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  // Funções para área Equipe

  const handleDragStart = (item, type) => {
    setDraggedItem(item);
    setDraggedType(type);
  };

  const handleDrop = (targetId, targetType) => {
    if (!draggedItem || !draggedType) return;

    let actionDescription = '';
    let actionFunction = null;

    if (draggedType === 'tecnico' && targetType === 'area') {
      const tecnico = teamData.tecnicos.find(t => t.id === draggedItem.id);
      const area = teamData.areas.find(a => a.id === targetId);
      
      if (tecnico.areaId === targetId) return; // Já está na área
      
      actionDescription = `Vincular "${tecnico.nome}" à área "${area.nome}"?`;
      actionFunction = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/areateam`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id_tech: tecnico.id,
              id_area: targetId
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log('✅ Técnico vinculado à área com sucesso');
            // Atualizar o estado local
            setTeamData(prev => ({
              ...prev,
              tecnicos: prev.tecnicos.map(t => 
                t.id === draggedItem.id ? { ...t, areaId: targetId } : t
              )
            }));
          } else {
            console.error('❌ Erro ao vincular técnico à área:', result.message);
            alert(`Erro ao vincular técnico: ${result.message}`);
          }
        } catch (error) {
          console.error('❌ Erro na requisição de vínculo:', error);
          alert(`Erro de conexão: ${error.message}`);
        }
      };
    } else if (draggedType === 'area' && targetType === 'coordenador') {
      const area = teamData.areas.find(a => a.id === draggedItem.id);
      const coordenador = teamData.coordenadores.find(c => c.id === targetId);
      
      if (area.coordenadorId === targetId) return; // Já está com o coordenador
      
      actionDescription = `Vincular área "${area.nome}" ao coordenador "${coordenador.nome}"?`;
      actionFunction = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/areacoord`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id_area: area.id,
              id_coordinator: targetId
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log('✅ Área vinculada ao coordenador com sucesso');
            // Atualizar o estado local
            setTeamData(prev => ({
              ...prev,
              areas: prev.areas.map(a => 
                a.id === draggedItem.id ? { ...a, coordenadorId: targetId } : a
              )
            }));
          } else {
            console.error('❌ Erro ao vincular área ao coordenador:', result.message);
            alert(`Erro ao vincular área: ${result.message}`);
          }
        } catch (error) {
          console.error('❌ Erro na requisição de vínculo área-coordenador:', error);
          alert(`Erro de conexão: ${error.message}`);
        }
      };
    }

    if (actionFunction) {
      setConfirmAction({
        description: actionDescription,
        action: actionFunction
      });
      setShowConfirmModal(true);
    }

    setDraggedItem(null);
    setDraggedType(null);
  };

  const confirmDragAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const getTecnicosByArea = (areaId) => {
    return teamData.tecnicos.filter(t => t.areaId === areaId);
  };

  const getAreasByCoordinator = (coordenadorId) => {
    return teamData.areas.filter(a => a.coordenadorId === coordenadorId);
  };

  const getUnassignedTechnicians = () => {
    return teamData.tecnicos.filter(t => t.areaId === null);
  };

  const getUnassignedAreas = () => {
    return teamData.areas.filter(a => a.coordenadorId === null);
  };

  // Função para filtrar técnicos baseado na busca
  const getFilteredUnassignedTechnicians = () => {
    const unassigned = getUnassignedTechnicians();
    if (!technicianSearchTerm.trim()) {
      return unassigned;
    }
    return unassigned.filter(tecnico => 
      tecnico.nome.toLowerCase().includes(technicianSearchTerm.toLowerCase())
    );
  };

  // Função para remover técnico de uma área
  const removeTechnicianFromArea = async (technicianId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/areateam/${technicianId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Técnico removido da área com sucesso');
        // Atualizar o estado local
        setTeamData(prev => ({
          ...prev,
          tecnicos: prev.tecnicos.map(t => 
            t.id === technicianId ? { ...t, areaId: null } : t
          )
        }));
      } else {
        console.error('❌ Erro ao remover técnico da área:', result.message);
        alert(`Erro ao remover técnico: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Erro na requisição de remoção:', error);
      alert(`Erro de conexão: ${error.message}`);
    }
  };



  // Função para criar nova área
  const createNewArea = async () => {
    if (!newAreaName.trim()) {
      setCreateAreaError('Nome da área é obrigatório');
      return;
    }

    setIsCreatingArea(true);
    setCreateAreaError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAreaName.trim()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Área criada com sucesso:', result.data);
        
        // Adicionar a nova área ao estado
        const newArea = {
          id: result.data.id,
          nome: result.data.name,
          coordenadorId: null,
          tecnicos: []
        };
        
        setTeamData(prev => ({
          ...prev,
          areas: [...prev.areas, newArea]
        }));
        
        // Limpar o formulário
        setNewAreaName('');
        
        alert('Área criada com sucesso!');
      } else {
        console.error('❌ Erro ao criar área:', result.message);
        setCreateAreaError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição de criação de área:', error);
      setCreateAreaError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsCreatingArea(false);
    }
  };

  // Função para deletar área
  const deleteArea = async (areaId) => {
    const area = teamData.areas.find(a => a.id === areaId);
    if (!area) return;

    // Verificar se a área tem vínculos antes de tentar deletar
    const hasTechnicians = getTecnicosByArea(areaId).length > 0;
    const hasCoordinator = area.coordenadorId !== null;

    if (hasTechnicians || hasCoordinator) {
      const techCount = getTecnicosByArea(areaId).length;
      let message = `Não é possível excluir a área "${area.nome}".`;
      
      if (hasTechnicians && hasCoordinator) {
        message += ` Ela possui ${techCount} técnico${techCount > 1 ? 's' : ''} vinculado${techCount > 1 ? 's' : ''} e está associada a um coordenador.`;
      } else if (hasTechnicians) {
        message += ` Ela possui ${techCount} técnico${techCount > 1 ? 's' : ''} vinculado${techCount > 1 ? 's' : ''}.`;
      } else {
        message += ` Ela está associada a um coordenador.`;
      }
      
      message += ` Para excluir esta área, primeiro remova todos os vínculos.`;
      
      setDeleteErrorMessage(message);
      setShowDeleteErrorModal(true);
      return;
    }

    const actionDescription = `Excluir área "${area.nome}"? Esta ação não pode ser desfeita.`;
    const actionFunction = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/areas/${areaId}`, {
          method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Área deletada com sucesso');
          // Remover a área do estado local
          setTeamData(prev => ({
            ...prev,
            areas: prev.areas.filter(a => a.id !== areaId)
          }));
          // Feedback de sucesso pode ser mais sutil, sem alert
          console.log('✅ Área deletada com sucesso');
        } else {
          console.error('❌ Erro ao deletar área:', result.message);
          setDeleteErrorMessage(`Erro ao deletar área: ${result.message}`);
          setShowDeleteErrorModal(true);
        }
      } catch (error) {
        console.error('❌ Erro na requisição de exclusão de área:', error);
        setDeleteErrorMessage(`Erro de conexão: ${error.message}`);
        setShowDeleteErrorModal(true);
      }
    };

    setConfirmAction({
      description: actionDescription,
      action: actionFunction
    });
    setShowConfirmModal(true);
  };

  // Função para desvincular área do coordenador
  const removeAreaFromCoordinator = async (areaId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/areacoord/${areaId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Área desvinculada do coordenador com sucesso');
        // Atualizar o estado local
        setTeamData(prev => ({
          ...prev,
          areas: prev.areas.map(a => 
            a.id === areaId ? { ...a, coordenadorId: null } : a
          )
        }));
      } else {
        console.error('❌ Erro ao desvincular área do coordenador:', result.message);
        alert(`Erro ao desvincular área: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Erro na requisição de remoção de vínculo área-coordenador:', error);
      alert(`Erro de conexão: ${error.message}`);
    }
    setAreaActionMenus({});
  };

  // Função para toggle dos menus de opções
  const toggleAreaOptionsMenu = (areaId) => {
    setAreaOptionsMenus(prev => ({
      ...prev,
      [areaId]: !prev[areaId]
    }));
  };

  const toggleAreaActionMenu = (areaId) => {
    setAreaActionMenus(prev => ({
      ...prev,
      [areaId]: !prev[areaId]
    }));
  };

  // Função para abrir modal do diagrama
  const openManagementDiagram = () => {
    setShowManagementDiagram(true);
  };

  // Função para fechar modal do diagrama
  const closeManagementDiagram = () => {
    setShowManagementDiagram(false);
  };

  // Referência para o container do React Flow
  const reactFlowRef = useRef(null);

  // Função para aplicar layout dagre
  const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 180;
    const nodeHeight = 80;

    dagreGraph.setGraph({ 
      rankdir: direction,
      nodesep: 50,
      ranksep: 80,
      marginx: 20,
      marginy: 20
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.targetPosition = Position.Top;
      node.sourcePosition = Position.Bottom;

      // Aplicar posição calculada pelo dagre
      node.position = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      };

      return node;
    });

    return { nodes, edges };
  };

  // Função para gerar nós do React Flow (apenas elementos com relações)
  const generateNodes = () => {
    const nodes = [];
    
    // Filtrar apenas coordenadores que têm áreas
    const coordenadoresComAreas = teamData.coordenadores.filter(coordenador => {
      const areas = getAreasByCoordinator(coordenador.id);
      return areas.length > 0;
    });

    // Filtrar apenas áreas que têm técnicos E têm coordenador
    const areasComTecnicos = teamData.areas.filter(area => {
      const tecnicos = getTecnicosByArea(area.id);
      const temCoordenador = area.coordenadorId && coordenadoresComAreas.some(c => c.id === area.coordenadorId);
      return tecnicos.length > 0 && temCoordenador;
    });

    // Filtrar apenas técnicos que estão em áreas válidas
    const tecnicosComArea = teamData.tecnicos.filter(tecnico => {
      return tecnico.areaId && areasComTecnicos.some(a => a.id === tecnico.areaId);
    });

    // Coordenadores (apenas os que têm áreas)
    coordenadoresComAreas.forEach((coordenador) => {
      const areas = areasComTecnicos.filter(area => area.coordenadorId === coordenador.id);
      const totalTecnicos = areas.reduce((sum, area) => {
        return sum + tecnicosComArea.filter(t => t.areaId === area.id).length;
      }, 0);
      
      nodes.push({
        id: `coord-${coordenador.id}`,
        type: 'default',
        position: { x: 0, y: 0 }, // Será calculado pelo dagre
        data: { 
          label: (
            <div className="reactflow-node coordinator-node">
              <div className="node-title">{coordenador.nome}</div>
              <div className="node-subtitle">
                {areas.length} área{areas.length !== 1 ? 's' : ''} • {totalTecnicos} técnico{totalTecnicos !== 1 ? 's' : ''}
              </div>
            </div>
          )
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    });

    // Áreas (apenas as que têm técnicos e coordenador)
    areasComTecnicos.forEach((area) => {
      const tecnicos = tecnicosComArea.filter(t => t.areaId === area.id);
      
      nodes.push({
        id: `area-${area.id}`,
        type: 'default',
        position: { x: 0, y: 0 }, // Será calculado pelo dagre
        data: { 
          label: (
            <div className="reactflow-node area-node">
              <div className="node-title">{area.nome}</div>
              <div className="node-subtitle">
                {tecnicos.length} técnico{tecnicos.length !== 1 ? 's' : ''}
              </div>
            </div>
          )
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    });

    // Técnicos (apenas os que têm área)
    tecnicosComArea.forEach((tecnico) => {
      const area = areasComTecnicos.find(a => a.id === tecnico.areaId);
      
      if (area) {
        nodes.push({
          id: `tech-${tecnico.id}`,
          type: 'default',
          position: { x: 0, y: 0 }, // Será calculado pelo dagre
          data: { 
            label: (
              <div className="reactflow-node technician-node">
                <div className="node-title">{tecnico.nome}</div>
                <div className="node-subtitle">
                  {area.nome}
                </div>
              </div>
            )
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      }
    });

    return nodes;
  };

  // Função para gerar arestas do React Flow (apenas conexões válidas)
  const generateEdges = () => {
    const edges = [];

    // Filtrar apenas coordenadores que têm áreas
    const coordenadoresComAreas = teamData.coordenadores.filter(coordenador => {
      const areas = getAreasByCoordinator(coordenador.id);
      return areas.length > 0;
    });

    // Filtrar apenas áreas que têm técnicos E têm coordenador
    const areasComTecnicos = teamData.areas.filter(area => {
      const tecnicos = getTecnicosByArea(area.id);
      const temCoordenador = area.coordenadorId && coordenadoresComAreas.some(c => c.id === area.coordenadorId);
      return tecnicos.length > 0 && temCoordenador;
    });

    // Filtrar apenas técnicos que estão em áreas válidas
    const tecnicosComArea = teamData.tecnicos.filter(tecnico => {
      return tecnico.areaId && areasComTecnicos.some(a => a.id === tecnico.areaId);
    });

    // Conexões coordenador -> área (apenas válidas)
    coordenadoresComAreas.forEach(coordenador => {
      const areas = areasComTecnicos.filter(area => area.coordenadorId === coordenador.id);
      areas.forEach(area => {
        edges.push({
          id: `edge-coord-${coordenador.id}-area-${area.id}`,
          source: `coord-${coordenador.id}`,
          target: `area-${area.id}`,
          type: 'straight',
          animated: true,
          style: { 
            stroke: '#8b5cf6', 
            strokeWidth: 2 
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#8b5cf6',
          },
        });
      });
    });

    // Conexões área -> técnico (apenas válidas)
    areasComTecnicos.forEach(area => {
      const tecnicos = tecnicosComArea.filter(tecnico => tecnico.areaId === area.id);
      tecnicos.forEach(tecnico => {
        edges.push({
          id: `edge-area-${area.id}-tech-${tecnico.id}`,
          source: `area-${area.id}`,
          target: `tech-${tecnico.id}`,
          type: 'straight',
          animated: true,
          style: { 
            stroke: '#3b82f6', 
            strokeWidth: 2 
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
        });
      });
    });

    return edges;
  };

  // Função para imprimir diagrama (capturando o React Flow real)
  const printManagementDiagram = async () => {
    if (!reactFlowRef.current) {
      console.error('Referência do React Flow não encontrada');
      return;
    }

    try {
      // Ocultar temporariamente controles para captura limpa
      const controls = reactFlowRef.current.querySelector('.react-flow__controls');
      const minimap = reactFlowRef.current.querySelector('.react-flow__minimap');
      const attribution = reactFlowRef.current.querySelector('.react-flow__attribution');
      
      const originalControlsDisplay = controls ? controls.style.display : null;
      const originalMinimapDisplay = minimap ? minimap.style.display : null;
      const originalAttributionDisplay = attribution ? attribution.style.display : null;
      
      if (controls) controls.style.display = 'none';
      if (minimap) minimap.style.display = 'none';
      if (attribution) attribution.style.display = 'none';

      // Capturar o React Flow como canvas
      const canvas = await html2canvas(reactFlowRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Alta qualidade
        useCORS: true,
        allowTaint: true,
        width: reactFlowRef.current.offsetWidth,
        height: reactFlowRef.current.offsetHeight,
        scrollX: 0,
        scrollY: 0
      });

      // Restaurar controles
      if (controls) controls.style.display = originalControlsDisplay || '';
      if (minimap) minimap.style.display = originalMinimapDisplay || '';
      if (attribution) attribution.style.display = originalAttributionDisplay || '';

      // Converter canvas para imagem
      const imgData = canvas.toDataURL('image/png');
      
      // Aplicar os mesmos filtros para contagem
      const coordenadoresComAreas = teamData.coordenadores.filter(coordenador => {
        const areas = getAreasByCoordinator(coordenador.id);
        return areas.length > 0;
      });

      const areasComTecnicos = teamData.areas.filter(area => {
        const tecnicos = getTecnicosByArea(area.id);
        const temCoordenador = area.coordenadorId && coordenadoresComAreas.some(c => c.id === area.coordenadorId);
        return tecnicos.length > 0 && temCoordenador;
      });

      const tecnicosComArea = teamData.tecnicos.filter(tecnico => {
        return tecnico.areaId && areasComTecnicos.some(a => a.id === tecnico.areaId);
      });

      // Criar janela de impressão com a imagem capturada
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Diagrama de Gestão de Equipe - React Flow</title>
              <style>
                @page {
                  size: A4 landscape;
                  margin: 10mm;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                  margin: 0;
                  padding: 10px;
                  background: white;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .print-header {
                  text-align: center;
                  margin-bottom: 20px;
                  width: 100%;
                }
                .print-title {
                  font-size: 20px;
                  font-weight: 600;
                  color: #1e293b;
                  margin: 0 0 8px 0;
                }
                .print-subtitle {
                  font-size: 11px;
                  color: #64748b;
                  margin: 3px 0;
                }
                .print-stats {
                  font-size: 10px;
                  color: #475569;
                  margin-top: 5px;
                }
                .diagram-container {
                  max-width: 100%;
                  max-height: 70vh;
                  overflow: hidden;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 10px;
                  background: #f8fafc;
                }
                .diagram-image {
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain;
                  border-radius: 4px;
                }
                .print-footer {
                  margin-top: 15px;
                  text-align: center;
                  font-size: 9px;
                  color: #94a3b8;
                  border-top: 1px solid #e2e8f0;
                  padding-top: 10px;
                  width: 100%;
                }
                @media print {
                  body {
                    padding: 5px;
                  }
                  .print-header {
                    margin-bottom: 15px;
                  }
                  .diagram-container {
                    border: none;
                    background: white;
                    padding: 5px;
                  }
                }
              </style>
            </head>
            <body>
              <div class="print-header">
                <h1 class="print-title">Diagrama de Gestão de Equipe</h1>
                <p class="print-subtitle">Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <div class="print-stats">
                  Coordenadores: ${coordenadoresComAreas.length} | Áreas: ${areasComTecnicos.length} | Técnicos: ${tecnicosComArea.length}
                </div>
              </div>
              
              <div class="diagram-container">
                <img src="${imgData}" alt="Diagrama de Gestão de Equipe" class="diagram-image" />
              </div>
              
              <div class="print-footer">
                Exibindo apenas elementos com relacionamentos ativos
              </div>
            </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Aguardar carregamento da imagem antes de imprimir
        const img = printWindow.document.querySelector('.diagram-image');
        img.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      }
    } catch (error) {
      console.error('Erro ao capturar o diagrama:', error);
      alert('Erro ao gerar a impressão. Tente novamente.');
    }
  };

  // Componente para agrupar ordens por cidade dentro das colunas de técnicos
  const TechnicianCityGroup = ({ cidade, ordens, technician, groupName, isDroppable = true }) => {
    const getSLAColor = (sla) => {
      switch(sla) {
        case 'vencido':
          return '#ef5350'; // Vermelho
        case 'vencendo':
          return '#ff9800'; // Amarelo/Laranja
        case 'ok':
        default:
          return 'transparent'; // Sem cor (branco)
      }
    };

    const getSLAIndicator = (sla) => {
      const color = getSLAColor(sla);
      if (color === 'transparent') return null;
      
      return (
        <div 
          className="sla-indicator"
          style={{ backgroundColor: color }}
        />
      );
    };

    const getServiceIcon = (tipo) => {
      return tipo || '?';
    };

    const getServiceColor = (tipo) => {
      switch(tipo) {
        case 'E': return '#9c27b0'; // ESTOQUE - Roxo
        case 'B': return '#ff5722'; // BALCÃO - Laranja
        case 'A': return '#607d8b'; // AFERIÇÃO - Azul acinzentado
        case 'R': return '#795548'; // RETORNO-RECARGA - Marrom
        case 'D': return '#f44336'; // DESINSTALAÇÃO - Vermelho
        case 'I': return '#2196f3'; // INSTALAÇÃO - Azul
        case 'S': return '#4caf50'; // PREVENTIVA - Verde
        case 'C': return '#ff9800'; // CORRETIVA - Amarelo/Laranja
        default: return '#9e9e9e';  // Cinza para desconhecido
      }
    };

    const getSLAPriority = (sla) => {
      switch(sla) {
        case 'vencido': return 1;
        case 'vencendo': return 2;
        case 'ok': return 3;
        default: return 4;
      }
    };

    const sortedOrdens = [...ordens].sort((a, b) => {
      const priorityA = getSLAPriority(a.sla);
      const priorityB = getSLAPriority(b.sla);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return a.id.localeCompare(b.id);
    });

    return (
      <div className="technician-city-group">
        <div className="technician-city-header">
          <span className="technician-city-title">{cidade}</span>
          <span className="technician-city-count">{ordens.length}</span>
        </div>
        <div className="technician-city-orders">
          {sortedOrdens.map(ordem => (
            <div 
              key={ordem.id} 
              className={`technician-order-row ${selectedOrders.includes(ordem.id) ? 'selected' : ''}`}
              onClick={() => handleOrderClick(ordem)}
              draggable
              onDragStart={(e) => {
                console.log(`🔄 Iniciando drag da ordem ${ordem.id} das colunas de técnicos`);
                // Selecionar a ordem se não estiver selecionada
                if (!selectedOrders.includes(ordem.id)) {
                  console.log(`✅ Selecionando ordem ${ordem.id} para drag`);
                  setSelectedOrders([ordem.id]);
                }
                e.dataTransfer.setData('orderId', ordem.id);
                e.dataTransfer.setData('fromTechnician', 'true');
                e.dataTransfer.setData('fromGroup', groupName);
                console.log(`📋 Dados de transferência definidos: orderId=${ordem.id}, fromTechnician=true, fromGroup=${groupName}`);
              }}
            >
              <div className="technician-order-cell technician-order-id">
                <span 
                  className="service-type-badge-compact"
                  style={{ backgroundColor: getServiceColor(ordem.tipo) }}
                >
                  {getServiceIcon(ordem.tipo)}
                </span>
                {getSLAIndicator(ordem.sla)}
                <span className="order-id-text">{ordem.id}</span>
                {ordem.pedidoVinculado && (
                  <i className="bi bi-box-seam pedido-vinculado-icon" title={`Pedido vinculado: ${ordem.pedidoVinculado}`}></i>
                )}
              </div>
              <div className="technician-order-cell technician-order-cliente" title={ordem.cliente}>
                {ordem.cliente}
              </div>
              <div className="technician-order-cell technician-order-equipamento" title={ordem.equipamento}>
                {ordem.equipamento}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const TechnicianServiceGroup = ({ groupName, orders, technician, isDroppable = true }) => {
    // Agrupar ordens por cidade
    const groupedByCity = React.useMemo(() => {
      const groups = {};
      orders.forEach(ordem => {
        const cidade = ordem.cidade || 'Sem Cidade';
        if (!groups[cidade]) {
          groups[cidade] = [];
        }
        groups[cidade].push(ordem);
      });
      return groups;
    }, [orders]);

    return (
      <div 
        className={`technician-service-group ${!isDroppable ? 'no-drop' : ''}`}
        onDrop={(e) => {
          if (isDroppable) {
            e.preventDefault();
            e.stopPropagation();
            
            // Verificar se é um drop entre seções do mesmo técnico
            const fromTechnician = e.dataTransfer.getData('fromTechnician');
            const fromGroup = e.dataTransfer.getData('fromGroup');
            
            if (fromTechnician === 'true' && fromGroup && fromGroup !== groupName) {
              // É um drop entre seções do mesmo técnico
              handleDropBetweenTechnicianSections(technician, fromGroup, groupName);
            } else {
              // É um drop da coluna "Em aberto" para o técnico
              handleDropToTechnique(technician, groupName);
            }
          }
        }}
        onDragOver={(e) => {
          if (isDroppable) {
            e.preventDefault();
          }
        }}
      >
        <div className="service-group-header">
          <span className="service-group-title">{groupName}</span>
          <span className="service-group-count">{orders.length}</span>
        </div>
        {orders.length > 0 && (
          <div className="service-orders-container">
            {Object.entries(groupedByCity).map(([cidade, ordens]) => (
              <TechnicianCityGroup
                key={cidade}
                cidade={cidade}
                ordens={ordens}
                technician={technician}
                groupName={groupName}
                isDroppable={isDroppable}
              />
            ))}
          </div>
        )}
        {orders.length === 0 && isDroppable && (
          <div className="empty-service-group">
            Arraste ordens aqui
          </div>
        )}
        

      </div>
    );
  };

  // Inicializar filtros para todos os técnicos quando technicianGroups mudar
  React.useEffect(() => {
    const technicianKeys = Object.keys(technicianGroups);
    if (technicianKeys.length > 0) {
      setTechnicianFilters(prev => {
        let hasChanges = false;
        const newFilters = { ...prev };
        
        technicianKeys.forEach(technician => {
          if (!prev[technician]) {
            hasChanges = true;
            newFilters[technician] = {
              'Previsto para hoje': true,
              'Previstas para amanhã': false,
              'Futura': false
            };
          }
        });
        
        return hasChanges ? newFilters : prev;
      });
    }
  }, [technicianGroups]);

  // Função para toggle do filtro de técnico (memoizada)
  const toggleTechnicianFilter = React.useCallback((technician, groupName) => {
    setTechnicianFilters(prev => ({
      ...prev,
      [technician]: {
        ...prev[technician],
        [groupName]: !prev[technician]?.[groupName]
      }
    }));
  }, []);

  // Função para aplicar filtros de técnico (memoizada)
  const getFilteredTechnicianGroups = React.useCallback((technician) => {
    // Definir seções padrão que sempre devem aparecer
    const standardSections = ['Em serviço', 'Previsto para hoje', 'Previstas para amanhã', 'Futura'];
    
    if (!technicianGroups[technician] || !technicianFilters[technician]) {
      // Aplicar apenas o filtro de busca quando não há filtros de técnico
      const technicianData = technicianGroups[technician] || {};
      const filteredData = {};
      
      // Garantir que todas as seções padrão apareçam, mesmo vazias
      standardSections.forEach(sectionName => {
        const sectionOrders = technicianData[sectionName] || [];
        filteredData[sectionName] = filterOrdersBySearch(sectionOrders, searchTerm);
      });
      
      return filteredData;
    }

    const filtered = {};
    
    // Garantir que todas as seções padrão apareçam, mesmo vazias
    standardSections.forEach(groupName => {
      const orders = technicianGroups[technician][groupName] || [];
      
      // "Em serviço" sempre aparece
      if (groupName === 'Em serviço') {
        filtered[groupName] = filterOrdersBySearch(orders, searchTerm);
      } else if (technicianFilters[technician][groupName]) {
        filtered[groupName] = filterOrdersBySearch(orders, searchTerm);
      } else {
        // Mesmo sem filtro ativo, mostrar seção vazia para permitir drag & drop
        filtered[groupName] = [];
      }
    });
    
    return filtered;
  }, [technicianGroups, technicianFilters, searchTerm]);

  // Função para contar filtros ativos (memoizada)
  const getActiveTechnicianFiltersCount = React.useCallback((technician) => {
    if (!technicianFilters[technician]) return 0;
    return Object.values(technicianFilters[technician]).filter(Boolean).length;
  }, [technicianFilters]);

  const TechnicianColumn = ({ technician, orders, index }) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const filterButtonRef = React.useRef(null);
    const menuButtonRef = React.useRef(null);

    // Debug: verificar os dados recebidos
    React.useEffect(() => {
      console.log(`🔍 DEBUG TechnicianColumn "${technician}":`, {
        orders,
        technicianGroups: technicianGroups[technician],
        cache: technicianDataCache[technician]
      });
    }, [technician, orders, technicianGroups, technicianDataCache]);

    // Calcular posição do filtro quando aberto
    React.useEffect(() => {
      if (showTechnicianFilter[technician] && filterButtonRef.current) {
        // Usar setTimeout para evitar problemas de layout
        const timeoutId = setTimeout(() => {
          if (filterButtonRef.current) {
            const rect = filterButtonRef.current.getBoundingClientRect();
            const newPosition = {
              top: rect.bottom + 4,
              left: rect.right - 180 // 180px é a largura do dropdown
            };
            
            // Só atualizar se a posição realmente mudou
            setTechnicianFilterPositions(prev => {
              const currentPosition = prev[technician];
              if (!currentPosition || 
                  Math.abs(currentPosition.top - newPosition.top) > 1 || 
                  Math.abs(currentPosition.left - newPosition.left) > 1) {
                return {
                  ...prev,
                  [technician]: newPosition
                };
              }
              return prev;
            });
          }
        }, 0);
        
        return () => clearTimeout(timeoutId);
      }
    }, [showTechnicianFilter[technician], technician]);

    // Calcular posição do menu quando aberto
    React.useEffect(() => {
      if (showTechnicianMenu[technician] && menuButtonRef.current) {
        // Usar setTimeout para evitar problemas de layout
        const timeoutId = setTimeout(() => {
          if (menuButtonRef.current) {
            const rect = menuButtonRef.current.getBoundingClientRect();
            const newPosition = {
              top: rect.bottom + 4,
              left: rect.right - 220 // 220px é a largura do dropdown do menu
            };
            
            // Só atualizar se a posição realmente mudou
            setTechnicianMenuPositions(prev => {
              const currentPosition = prev[technician];
              if (!currentPosition || 
                  Math.abs(currentPosition.top - newPosition.top) > 1 || 
                  Math.abs(currentPosition.left - newPosition.left) > 1) {
                return {
                  ...prev,
                  [technician]: newPosition
                };
              }
              return prev;
            });
          }
        }, 0);
        
        return () => clearTimeout(timeoutId);
      }
    }, [showTechnicianMenu[technician], technician]);

    const filteredGroups = React.useMemo(() => 
      getFilteredTechnicianGroups(technician), 
      [getFilteredTechnicianGroups, technician]
    );
    
    const activeFiltersCount = React.useMemo(() => 
      getActiveTechnicianFiltersCount(technician), 
      [getActiveTechnicianFiltersCount, technician]
    );
    
    const hasActiveFilters = activeFiltersCount > 0;

    return (
      <div 
        className={`kanban-column technician-column ${isDragging ? 'dragging' : ''}`}
        draggable
        onDragStart={(e) => {
          setIsDragging(true);
          e.dataTransfer.setData('columnIndex', index);
        }}
        onDragEnd={() => setIsDragging(false)}
        onDragOver={(e) => {
          // Só prevenir default se for reordenação de colunas
          const draggedColumnIndex = e.dataTransfer.getData('columnIndex');
          if (draggedColumnIndex) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedColumnIndex = parseInt(e.dataTransfer.getData('columnIndex'));
          // Só processar se for reordenação de colunas
          if (draggedColumnIndex !== index && !isNaN(draggedColumnIndex)) {
            handleColumnReorder(draggedColumnIndex, index);
          }
          // Remover o drop de ordens de serviço daqui pois já é tratado nos grupos específicos
        }}
      >
        <div className={`technician-column-header ${showTechnicianFilter[technician] ? 'filter-open' : ''}`}>
          <div className="technician-column-title-section">
            <span className="column-title">{technician}</span>
            <span className="column-count">
              {Object.values(filteredGroups).reduce((total, group) => total + group.length, 0)}
            </span>
          </div>
          <div className="technician-header-actions">
            <div className="technician-menu-container">
              <div 
                ref={menuButtonRef}
                className="technician-menu-icon"
                onClick={() => setShowTechnicianMenu(prev => ({
                  ...prev,
                  [technician]: !prev[technician]
                }))}
                title="Menu do técnico"
              >
                <i className="bi bi-three-dots"></i>
              </div>
            </div>
            <div className="technician-filter-container">
              <div 
                ref={filterButtonRef}
                className={`technician-filter-icon ${hasActiveFilters ? 'active' : ''}`}
                onClick={() => setShowTechnicianFilter(prev => ({
                  ...prev,
                  [technician]: !prev[technician]
                }))}
              >
                <i className="bi bi-funnel"></i>
              </div>
              {hasActiveFilters && (
                <div className="technician-filter-badge">
                  {activeFiltersCount}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="column-content">
          {Object.entries(filteredGroups).map(([groupName, groupOrders]) => (
            <TechnicianServiceGroup
              key={groupName}
              groupName={groupName}
              orders={groupOrders}
              technician={technician}
              isDroppable={groupName !== 'Em serviço'}
            />
          ))}
        </div>
      </div>
    );
  };

  // Componente para renderizar todos os modais de filtro de técnicos
  const TechnicianFilterModals = () => {
    return (
      <>
        {Object.entries(showTechnicianFilter).map(([technician, isOpen]) => {
          if (!isOpen || !technicianFilterPositions[technician]) return null;
          
          const position = technicianFilterPositions[technician];
          
          return (
            <div 
              key={technician}
              className="technician-filter-modal"
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 99999
              }}
            >
              <div className="filter-options-dropdown">
                <div className="filter-option-item">
                  <div className="filter-option-info">
                    <div className="filter-option-label">
                      <i className="bi bi-calendar-check"></i>
                      Sessões do Técnico
                    </div>
                    <div className="filter-option-desc">Filtrar por tipo de sessão</div>
                  </div>
                </div>
                {['Previsto para hoje', 'Previstas para amanhã', 'Futura'].map(groupName => (
                  <div key={groupName} className="filter-option-item">
                    <label className="filter-option-content">
                      <input
                        type="checkbox"
                        checked={technicianFilters[technician]?.[groupName] || false}
                        onChange={() => toggleTechnicianFilter(technician, groupName)}
                      />
                      <span className="filter-option-text">{groupName}</span>
                      <span className="filter-option-badge">
                        {technicianGroups[technician]?.[groupName]?.length || 0}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // Componente para renderizar todos os modais de menu de técnicos
  const TechnicianMenuModals = () => {
    return (
      <>
        {Object.entries(showTechnicianMenu).map(([technician, isOpen]) => {
          if (!isOpen || !technicianMenuPositions[technician]) return null;
          
          const position = technicianMenuPositions[technician];
          
          return (
            <div 
              key={technician}
              className="technician-menu-modal"
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 99999
              }}
            >
              <div className="technician-menu-dropdown">
                <div className="technician-menu-item">
                  <div className="technician-menu-info">
                    <div className="technician-menu-label">
                      <i className="bi bi-person-gear"></i>
                      {technician}
                    </div>
                    <div className="technician-menu-desc">Opções do técnico</div>
                  </div>
                </div>
                
                <div className="technician-menu-item">
                  <div 
                    className="technician-menu-option"
                    onClick={() => {
                      // Função para roteirizar ordens de serviço
                      console.log(`Roteirizar ordens de serviço para ${technician}`);
                      setShowTechnicianMenu(prev => ({ ...prev, [technician]: false }));
                      handleViewTechnicianRoute(technician);
                    }}
                  >
                    <i className="bi bi-geo-alt"></i>
                    <span>Roteirizar ordens de serviço</span>
                  </div>
                </div>
                
                <div className="technician-menu-item">
                  <div 
                    className="technician-menu-option"
                    onClick={() => {
                      // Função para roteiro de hoje
                      console.log(`Roteiro de hoje para ${technician}`);
                      setShowTechnicianMenu(prev => ({ ...prev, [technician]: false }));
                      setShowTodayRouteModal(prev => ({ ...prev, [technician]: true }));
                    }}
                  >
                    <i className="bi bi-calendar-day"></i>
                    <span>Roteiro de hoje</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // Componente do modal do roteiro de hoje
  const TodayRouteModal = ({ technician, isOpen, onClose }) => {
    // Estados para o sidebar de detalhes
    const [showDetailsSidebar, setShowDetailsSidebar] = useState(false);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    
    // Estados para dados reais da API
    const [routeData, setRouteData] = useState([]);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [routeError, setRouteError] = useState(null);
    
    // Estados para ordens concluídas
    const [completedData, setCompletedData] = useState([]);
    const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);
    const [completedError, setCompletedError] = useState(null);
    
    // Estados para reordenação
    const [draggedItem, setDraggedItem] = useState(null);
    const [showSequenceInput, setShowSequenceInput] = useState(null);
    const [sequenceInputValue, setSequenceInputValue] = useState('');
    const [isReordering, setIsReordering] = useState(false);
    
    // Estados para modal de detalhes
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCompletedOrder, setSelectedCompletedOrder] = useState(null);
    const [pendingParts, setPendingParts] = useState([]);
    const [usedParts, setUsedParts] = useState([]);
    const [isLoadingParts, setIsLoadingParts] = useState(false);

    // Função para calcular o tempo total das ordens concluídas
    const calculateTotalTime = (orders) => {
      let totalMinutes = 0;
      
      orders.forEach(order => {
        const timeStr = order.tempo;
        if (timeStr) {
          // Extrair horas e minutos do formato "1h15min" ou "45min"
          const hourMatch = timeStr.match(/(\d+)h/);
          const minuteMatch = timeStr.match(/(\d+)min/);
          
          const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
          const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
          
          totalMinutes += hours * 60 + minutes;
        }
      });
      
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;
      
      if (totalHours > 0 && remainingMinutes > 0) {
        return `${totalHours}h ${remainingMinutes}min`;
      } else if (totalHours > 0) {
        return `${totalHours}h`;
      } else {
        return `${remainingMinutes}min`;
      }
    };

    // Função para buscar dados da API
    const fetchTodayRoute = React.useCallback(async () => {
      if (!technician || !isOpen) return;
      
      try {
        setIsLoadingRoute(true);
        setRouteError(null);
        
        // Obter ID do técnico do mapeamento
        const technicianId = getTechnicianIdByName(technician);
        if (!technicianId) {
          throw new Error(`ID do técnico ${technician} não encontrado`);
        }
        
        console.log(`🔄 Buscando roteiro de hoje para técnico ${technician} (ID: ${technicianId})`);
        console.log(`🔍 URL completa: ${API_BASE_URL}/api/orders/today-route/${technicianId}`);
        
        // Teste de conectividade com o backend
        try {
          const testResponse = await fetch(`${API_BASE_URL}/api/config/process`);
          console.log(`🧪 Teste de conectividade - Status: ${testResponse.status}`);
        } catch (testError) {
          console.error('🧪 Erro no teste de conectividade:', testError);
        }
        
        const response = await fetch(`${API_BASE_URL}/api/orders/today-route/${technicianId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 45000 // 45 segundos de timeout (50% a mais)
        });
        console.log(`📡 Status da resposta: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Resposta de erro da API: ${errorText}`);
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`📊 Dados recebidos da API:`, data);
        
        if (!data.success) {
          throw new Error(data.message || 'Erro ao buscar roteiro');
        }
        
        setRouteData(data.data || []);
        console.log(`✅ ${data.data.length} ordens carregadas para roteiro de hoje`);
        
      } catch (error) {
        console.error('❌ Erro ao buscar roteiro de hoje:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Tipo do erro:', error.constructor.name);
        
        let errorMessage = error.message;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = `Erro de conexão com o servidor (${API_BASE_URL})`;
        }
        
        setRouteError(errorMessage);
      } finally {
        setIsLoadingRoute(false);
      }
    }, [technician, isOpen, getTechnicianIdByName]);

    // Função para buscar ordens concluídas
    const fetchCompletedRoute = useCallback(async () => {
      try {
        setIsLoadingCompleted(true);
        setCompletedError(null);
        
        // Obter ID do técnico
        const technicianId = getTechnicianIdByName(technician);
        if (!technicianId) {
          throw new Error(`ID do técnico ${technician} não encontrado`);
        }
        
        console.log('🔄 Buscando ordens concluídas para técnico:', technicianId);
        console.log(`🔍 URL completa: ${API_BASE_URL}/api/orders/completed-route/${technicianId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/orders/completed-route/${technicianId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 45000 // 45 segundos de timeout (50% a mais)
        });
        console.log(`📡 Status da resposta: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Resposta de erro da API: ${errorText}`);
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`📊 Dados recebidos da API:`, result);
        
        if (!result.success) {
          throw new Error(result.message || 'Erro ao buscar ordens concluídas');
        }
        
        console.log('✅ Ordens concluídas carregadas:', result.data);
        setCompletedData(result.data || []);
        
      } catch (error) {
        console.error('❌ Erro ao buscar ordens concluídas:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Tipo do erro:', error.constructor.name);
        
        let errorMessage = error.message;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = `Erro de conexão com o servidor (${API_BASE_URL})`;
        }
        
        setCompletedError(errorMessage);
        setCompletedData([]);
      } finally {
        setIsLoadingCompleted(false);
      }
    }, [technician, getTechnicianIdByName]);

    // Função para calcular tempo de atendimento
    const calculateAttendanceTime = (horaInicial, horaFinal) => {
      if (!horaInicial || !horaFinal) {
        console.log('⚠️ Horários vazios:', { horaInicial, horaFinal });
        return 'N/A';
      }
      
      try {
        console.log('🔄 Calculando tempo para:', { horaInicial, horaFinal });
        
        // Se for string de hora (hh:mm), converter para minutos
        const parseTimeString = (timeStr) => {
          console.log('🔍 Analisando string:', timeStr, typeof timeStr);
          
          if (typeof timeStr === 'string' && timeStr.includes(':')) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;
            console.log(`  ✅ String de hora: ${timeStr} = ${totalMinutes} minutos`);
            return totalMinutes;
          }
          
          // Se for date/datetime, extrair a hora
          const date = new Date(timeStr);
          if (!isNaN(date.getTime())) {
            const totalMinutes = date.getHours() * 60 + date.getMinutes();
            console.log(`  ✅ Data/hora: ${timeStr} = ${totalMinutes} minutos`);
            return totalMinutes;
          }
          
          console.log(`  ❌ Formato não reconhecido: ${timeStr}`);
          return null;
        };

        const inicioMinutos = parseTimeString(horaInicial);
        const fimMinutos = parseTimeString(horaFinal);
        
        if (inicioMinutos === null || fimMinutos === null) {
          console.log('❌ Falha ao parsear horários');
          return 'N/A';
        }
        
        let diffMinutes = fimMinutos - inicioMinutos;
        console.log(`⏱️ Diferença inicial: ${diffMinutes} minutos`);
        
        // Se a diferença for negativa, assumir que passou da meia-noite
        if (diffMinutes < 0) {
          diffMinutes += 24 * 60; // Adicionar 24 horas
          console.log(`🌙 Passou da meia-noite, nova diferença: ${diffMinutes} minutos`);
        }
        
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        
        // Formato solicitado: hh:mm
        const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        console.log(`✅ Tempo calculado: ${result}`);
        
        return result;
        
      } catch (error) {
        console.error('❌ Erro ao calcular tempo:', error);
        return 'N/A';
      }
    };

    // Função para formatar horário
    const formatTime = (dateTime) => {
      if (!dateTime) {
        console.log('⚠️ formatTime: valor vazio');
        return 'N/A';
      }
      
      try {
        console.log('🕐 formatTime input:', dateTime, typeof dateTime);
        
        // Se já for uma string de hora (hh:mm), retornar como está
        if (typeof dateTime === 'string' && dateTime.match(/^\d{2}:\d{2}$/)) {
          console.log('✅ formatTime: já é string hh:mm');
          return dateTime;
        }
        
        // Se for date/datetime, extrair a hora
        const date = new Date(dateTime);
        if (!isNaN(date.getTime())) {
          const result = date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log('✅ formatTime: extraído de date:', result);
          return result;
        }
        
        console.log('❌ formatTime: formato não reconhecido');
        return 'N/A';
      } catch (error) {
        console.error('❌ Erro ao formatar horário:', error);
        return 'N/A';
      }
    };

    // Função para calcular tempo total das ordens concluídas
    const calculateTotalCompletedTime = (orders) => {
      if (!orders || orders.length === 0) return '00:00';
      
      console.log(`📊 Calculando tempo total para ${orders.length} ordens concluídas`);
      
      let totalMinutes = 0;
      
      orders.forEach(ordem => {
        const tempoStr = calculateAttendanceTime(ordem.TB02122_HORAINI, ordem.TB02122_HORAFIM);
        console.log(`⏱️ Ordem ${ordem.TB02122_NUMOS}: ${tempoStr}`);
        
        if (tempoStr !== 'N/A' && tempoStr.includes(':')) {
          const [hours, minutes] = tempoStr.split(':').map(Number);
          const orderMinutes = hours * 60 + minutes;
          totalMinutes += orderMinutes;
          console.log(`  ➕ Adicionando ${orderMinutes} minutos (total: ${totalMinutes})`);
        }
      });
      
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;
      const result = `${totalHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
      
      console.log(`🕰️ Tempo total calculado: ${result} (${totalMinutes} minutos)`);
      
      return result;
    };

    // Função para buscar peças (pendentes e utilizadas)
    const fetchOrderParts = async (orderNumber) => {
      try {
        setIsLoadingParts(true);
        
        const [pendingResponse, usedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/orders/${orderNumber}/pending-parts`),
          fetch(`${API_BASE_URL}/api/orders/${orderNumber}/used-parts`)
        ]);
        
        const pendingResult = await pendingResponse.json();
        const usedResult = await usedResponse.json();
        
        setPendingParts(pendingResult.success ? pendingResult.data : []);
        setUsedParts(usedResult.success ? usedResult.data : []);
        
      } catch (error) {
        console.error('❌ Erro ao buscar peças:', error);
        setPendingParts([]);
        setUsedParts([]);
      } finally {
        setIsLoadingParts(false);
      }
    };

    // Função para abrir modal de detalhes
    const openDetailsModal = (order) => {
      setSelectedCompletedOrder(order);
      setShowDetailsModal(true);
      fetchOrderParts(order.TB02122_NUMOS);
    };

    // Função para fechar modal de detalhes
    const closeDetailsModal = () => {
      setShowDetailsModal(false);
      setSelectedCompletedOrder(null);
      setPendingParts([]);
      setUsedParts([]);
    };

    // Efeito para buscar dados quando modal abre
    React.useEffect(() => {
      if (isOpen && technician) {
        fetchTodayRoute();
        fetchCompletedRoute();
      }
    }, [isOpen, technician, fetchTodayRoute, fetchCompletedRoute]);

    // Função para formatar data/hora (CALC_RESTANTE)
    const formatDateTime = (dateTimeString) => {
      if (!dateTimeString) return 'N/A';
      
      try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return 'N/A';
        
        // Formatar como dd/MM/yyyy hh:mm
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      } catch (error) {
        return 'N/A';
      }
    };

    // Função para obter número da ordem com cor
    const getOrderNumber = (ordem) => {
      if (ordem.TB02115_ORDEM === 0) {
        return { number: '-', isRed: true };
      }
      return { number: ordem.TB02115_ORDEM, isRed: false };
    };

    // Função para obter equipamento com fallback
    const getEquipment = (ordem) => {
      return ordem.TB01010_RESUMIDO || ordem.TB01010_NOME || 'N/A';
    };

    // Função para obter série/patrimônio
    const getSeriePatrimonio = (ordem) => {
      const serie = ordem.TB02115_NUMSERIE || '';
      const patrimonio = ordem.TB02112_PAT || '';
      
      if (serie && patrimonio) {
        return `${serie} / ${patrimonio}`;
      } else if (serie) {
        return serie;
      } else if (patrimonio) {
        return patrimonio;
      }
      return 'N/A';
    };

    // Função para reordenar itens
    const reorderItems = async (reorderedData) => {
      try {
        setIsReordering(true);
        
        // Obter ID do técnico
        const technicianId = getTechnicianIdByName(technician);
        if (!technicianId) {
          throw new Error(`ID do técnico ${technician} não encontrado`);
        }
        
        console.log('🔄 Enviando reordenação:', reorderedData);
        
        const response = await fetch('/api/orders/reorder-sequence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            technicianId,
            reorderedItems: reorderedData
          })
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Erro ao reordenar sequências');
        }
        
        console.log('✅ Reordenação concluída:', result);
        
        // Recarregar dados
        await fetchTodayRoute();
        
      } catch (error) {
        console.error('❌ Erro ao reordenar:', error);
        setRouteError(error.message);
      } finally {
        setIsReordering(false);
      }
    };

    // Função para lidar com drag start
    const handleDragStart = (e, ordem, index) => {
      if (ordem.Tipo !== 'Roteirizado') return;
      
      setDraggedItem({ ordem, index });
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.target.outerHTML);
    };

    // Função para lidar com drag over
    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    // Função para lidar com drop
    const handleDrop = (e, targetIndex) => {
      e.preventDefault();
      
      if (!draggedItem) return;
      
      const sourceIndex = draggedItem.index;
      if (sourceIndex === targetIndex) {
        setDraggedItem(null);
        return;
      }
      
      // Criar nova lista reordenada
      const newData = [...routeData];
      const [removed] = newData.splice(sourceIndex, 1);
      newData.splice(targetIndex, 0, removed);
      
      // Recalcular sequências apenas para itens roteirizados
      const reorderedItems = [];
      let sequence = 1;
      
      newData.forEach((item) => {
        if (item.Tipo === 'Roteirizado') {
          if (item.TB02115_ORDEM !== sequence) {
            reorderedItems.push({
              osCode: item.TB02115_CODIGO,
              newSequence: sequence
            });
          }
          sequence++;
        }
      });
      
      if (reorderedItems.length > 0) {
        reorderItems(reorderedItems);
      }
      
      setDraggedItem(null);
    };

    // Função para lidar com clique em ordem não roteirizada
    const handleNonRoutedClick = (ordem) => {
      if (ordem.Tipo === 'Roteirizado') return;
      
      setShowSequenceInput(ordem.TB02115_CODIGO);
      setSequenceInputValue('');
    };

    // Função para salvar nova sequência
    const handleSaveSequence = async () => {
      if (!showSequenceInput || !sequenceInputValue) return;
      
      const newSequence = parseInt(sequenceInputValue);
      if (isNaN(newSequence) || newSequence < 1) {
        alert('Por favor, digite um número válido maior que 0');
        return;
      }
      
      // Encontrar a ordem
      const ordem = routeData.find(item => item.TB02115_CODIGO === showSequenceInput);
      if (!ordem) return;
      
      // Calcular reordenações necessárias
      const roteirizadas = routeData.filter(item => item.Tipo === 'Roteirizado');
      const maxSequence = roteirizadas.length;
      
      const targetSequence = Math.min(newSequence, maxSequence + 1);
      
      const reorderedItems = [{
        osCode: ordem.TB02115_CODIGO,
        newSequence: targetSequence
      }];
      
      // Ajustar sequências de outras ordens se necessário
      roteirizadas.forEach((item) => {
        if (item.TB02115_ORDEM >= targetSequence) {
          reorderedItems.push({
            osCode: item.TB02115_CODIGO,
            newSequence: item.TB02115_ORDEM + 1
          });
        }
      });
      
      await reorderItems(reorderedItems);
      
      setShowSequenceInput(null);
      setSequenceInputValue('');
    };

    // Dados mock para teste visual
    const mockOpenOrders = [
      {
        id: 1,
        orderNumber: "OS001",
        os: "OS-2024-001",
        cliente: "Empresa ABC Ltda",
        endereco: "Rua das Flores, 123 - Centro - São Paulo/SP",
        equipamento: "Impressora HP LaserJet Pro",
        motivoOS: "Manutenção preventiva mensal",
        seriePatrimonio: "SN123456 / PAT789",
        previsao: "09:00"
      },
      {
        id: 2,
        orderNumber: "OS002",
        os: "OS-2024-002",
        cliente: "Comércio XYZ",
        endereco: "Av. Principal, 456 - Vila Nova - São Paulo/SP",
        equipamento: "Multifuncional Canon",
        motivoOS: "Substituição de toner",
        seriePatrimonio: "SN789012 / PAT456",
        previsao: "10:30"
      }
    ];

    const mockCompletedOrders = [
      {
        id: 3,
        os: "OS-2024-003",
        cliente: "Escritório Central",
        endereco: "Rua do Comércio, 789 - Centro - São Paulo/SP",
        equipamento: "Scanner Epson",
        motivoOS: "Configuração de rede",
        seriePatrimonio: "SN345678 / PAT123",
        condicao: "Funcionando",
        horarioInicial: "08:00",
        horarioFinal: "09:15",
        tempo: "1h15min",
        hasPendingParts: true,
        laudo: "Equipamento funcionando normalmente após configuração da rede. Cliente satisfeito com o serviço.",
        contadores: {
          pb: 1250,
          cor: 890,
          dig: 2340,
          a3pb: 156,
          a3cor: 89
        },
        pecasPendentes: [
          { codigo: "TON001", nome: "Toner Preto", quantidade: 2 },
          { codigo: "TON002", nome: "Toner Colorido", quantidade: 1 }
        ],
        pecasTrocadas: [
          { codigo: "ROL001", nome: "Rolo de Transferência", quantidade: 1 }
        ]
      },
      {
        id: 4,
        os: "OS-2024-004",
        cliente: "Loja de Informática",
        endereco: "Shopping Center, Loja 45 - São Paulo/SP",
        equipamento: "Impressora Térmica",
        motivoOS: "Limpeza e manutenção",
        seriePatrimonio: "SN567890 / PAT321",
        condicao: "Funcionando",
        horarioInicial: "11:00",
        horarioFinal: "11:45",
        tempo: "45min",
        hasPendingParts: false,
        laudo: "Equipamento limpo e funcionando perfeitamente. Nenhuma peça necessária.",
        contadores: {
          pb: 0,
          cor: 0,
          dig: 0,
          a3pb: 0,
          a3cor: 0
        },
        pecasPendentes: [],
        pecasTrocadas: []
      }
    ];

    const handleShowDetails = (order) => {
      setSelectedOrderDetails(order);
      setShowDetailsSidebar(true);
    };

    const handleCloseDetails = () => {
      setShowDetailsSidebar(false);
      setSelectedOrderDetails(null);
    };

    if (!isOpen) return null;

    return (
      <>
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content today-route-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Roteiro de Hoje - {technician}</h2>
              <button className="modal-close" onClick={onClose}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {/* Tabela Em Aberto */}
              <div className="route-section">
                <h3 className="route-section-title">
                  <i className="bi bi-clock"></i>
                  Em aberto
                  <span className="record-counter">{routeData.length}</span>
                </h3>
                
                {isLoadingRoute && (
                  <div className="loading-indicator">
                    <i className="bi bi-arrow-repeat spin"></i>
                    <span>Carregando roteiro...</span>
                  </div>
                )}
                
                {routeError && (
                  <div className="error-message">
                    <i className="bi bi-exclamation-triangle"></i>
                    <span>Erro: {routeError}</span>
                  </div>
                )}
                
                {!isLoadingRoute && !routeError && (
                <div className="route-table-container">
                  <table className="route-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>OS</th>
                        <th>Cliente</th>
                        <th>Equipamento</th>
                        <th>Série/Patrimônio</th>
                        <th>Previsão</th>
                      </tr>
                    </thead>
                    <tbody>
                        {routeData.map((ordem, index) => {
                          const orderNumber = getOrderNumber(ordem);
                          const isRoteirizado = ordem.Tipo === 'Roteirizado';
                          const isNaoRoteirizado = ordem.Tipo === 'Não roteirizado';
                          
                          return (
                            <tr 
                              key={`${ordem.TB02115_CODIGO}-${index}`} 
                              className={`route-table-row open ${isRoteirizado ? 'draggable' : ''} ${isNaoRoteirizado ? 'clickable' : ''}`}
                              draggable={isRoteirizado}
                              onDragStart={(e) => handleDragStart(e, ordem, index)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, index)}
                              onClick={() => isNaoRoteirizado && handleNonRoutedClick(ordem)}
                              style={{ 
                                cursor: isRoteirizado ? 'move' : isNaoRoteirizado ? 'pointer' : 'default',
                                opacity: isReordering ? 0.7 : 1
                              }}
                            >
                              <td className={`order-number ${orderNumber.isRed ? 'order-red' : ''}`}>
                                {showSequenceInput === ordem.TB02115_CODIGO ? (
                                  <div className="sequence-input-container">
                                    <input
                                      type="number"
                                      value={sequenceInputValue}
                                      onChange={(e) => setSequenceInputValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSequence();
                                        if (e.key === 'Escape') setShowSequenceInput(null);
                                      }}
                                      className="sequence-input"
                                      placeholder="Seq."
                                      min="1"
                                      autoFocus
                                    />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveSequence();
                                      }}
                                      className="sequence-save-btn"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSequenceInput(null);
                                      }}
                                      className="sequence-cancel-btn"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  orderNumber.number
                                )}
                              </td>
                              <td className="order-os">{ordem.TB02115_CODIGO}</td>
                              <td className="order-cliente" title={ordem.ENDERECO || 'Endereço não informado'}>
                                {ordem.TB01008_NOME}
                              </td>
                              <td className="order-equipamento" title={ordem.TB02115_NOME || 'Motivo não informado'}>
                                {getEquipment(ordem)}
                              </td>
                              <td className="order-serie">{getSeriePatrimonio(ordem)}</td>
                              <td className="order-previsao">{formatDateTime(ordem.CALC_PREVISAO)}</td>
                        </tr>
                          );
                        })}
                        {routeData.length === 0 && (
                          <tr>
                            <td colSpan="6" className="empty-message">
                              Nenhuma ordem encontrada para hoje
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>

              {/* Tabela Concluídas */}
              <div className="route-section">
                <h3 className="route-section-title">
                  <i className="bi bi-check-circle"></i>
                  Concluídas
                  <span className="record-counter">{completedData.length}</span>
                  <span className="total-time-text">Tempo total: {calculateTotalCompletedTime(completedData)}</span>
                </h3>
                
                {isLoadingCompleted && (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span>Carregando ordens concluídas...</span>
                  </div>
                )}
                
                {completedError && (
                  <div className="error-container">
                    <span>❌ Erro ao buscar ordens concluídas: {completedError}</span>
                  </div>
                )}
                
                {!isLoadingCompleted && !completedError && (
                <div className="route-table-container">
                  <table className="route-table">
                    <thead>
                      <tr>
                        <th>OS</th>
                        <th>Cliente</th>
                        <th>Equipamento</th>
                        <th>Série/Patrimônio</th>
                        <th>Condição</th>
                        <th>Horário</th>
                        <th>Tempo</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                        {completedData.map((ordem, index) => {
                          const equipamento = ordem.TB01010_NOME; // Usar TB01010_NOME como especificado para concluídas
                          const seriePatrimonio = [ordem.TB02122_NUMSERIE, ordem.TB02112_PAT].filter(Boolean).join(' / ') || 'N/A';
                          
                          // Debug dos dados de horário
                          console.log(`🕐 Ordem ${ordem.TB02122_NUMOS}:`, {
                            horaInicial: ordem.TB02122_HORAINI,
                            horaFinal: ordem.TB02122_HORAFIM,
                            tipo: typeof ordem.TB02122_HORAINI
                          });
                          
                          const horarioRange = `${formatTime(ordem.TB02122_HORAINI)} - ${formatTime(ordem.TB02122_HORAFIM)}`;
                          const tempo = calculateAttendanceTime(ordem.TB02122_HORAINI, ordem.TB02122_HORAFIM);
                          const hasPendingParts = ordem.PECAPENDENTE === 1;
                          
                          return (
                            <tr key={`${ordem.TB02122_CODIGO}-${index}`} className="route-table-row completed">
                              <td className="order-os">{ordem.TB02122_NUMOS}</td>
                              <td className="order-cliente">{ordem.TB01008_NOME}</td>
                              <td className="order-equipamento">{equipamento}</td>
                              <td className="order-serie">{seriePatrimonio}</td>
                              <td className="order-condicao" title={ordem.TB01055_NOME || 'N/A'}>{ordem.TB01055_NOME || 'N/A'}</td>
                              <td className="order-horario">{horarioRange}</td>
                              <td className="order-tempo">{tempo}</td>
                          <td className="order-actions">
                                {hasPendingParts && (
                              <button className="btn-parts has-pending" title="Peças pendentes">
                                <i className="bi bi-tools"></i>
                              </button>
                            )}
                            <button 
                              className="btn-details"
                                  onClick={() => openDetailsModal(ordem)}
                              title="Ver detalhes"
                            >
                              <i className="bi bi-info-circle"></i>
                              Detalhes
                            </button>
                          </td>
                        </tr>
                          );
                        })}
                        {completedData.length === 0 && (
                          <tr>
                            <td colSpan="8" className="empty-message">
                              Nenhuma ordem concluída encontrada para hoje
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar de Detalhes */}
        {showDetailsSidebar && selectedOrderDetails && (
          <div className="details-sidebar">
            <div className="sidebar-header">
              <h3>Detalhes da OS {selectedOrderDetails.os}</h3>
              <button className="sidebar-close" onClick={handleCloseDetails}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div className="sidebar-content">
              {/* Laudo */}
              <div className="details-section">
                <h4>Laudo</h4>
                <p>{selectedOrderDetails.laudo}</p>
              </div>

              {/* Contadores */}
              <div className="details-section">
                <h4>Contadores</h4>
                <table className="counters-table">
                  <thead>
                    <tr>
                      <th>P&B</th>
                      <th>Cor</th>
                      <th>Dig.</th>
                      <th>A3 P&B</th>
                      <th>A3 Cor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedOrderDetails.contadores.pb}</td>
                      <td>{selectedOrderDetails.contadores.cor}</td>
                      <td>{selectedOrderDetails.contadores.dig}</td>
                      <td>{selectedOrderDetails.contadores.a3pb}</td>
                      <td>{selectedOrderDetails.contadores.a3cor}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Peças Pendentes */}
              {selectedOrderDetails.pecasPendentes.length > 0 && (
                <div className="details-section">
                  <h4>Peças Pendentes</h4>
                  <table className="parts-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nome</th>
                        <th>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderDetails.pecasPendentes.map((peca, index) => (
                        <tr key={index}>
                          <td>{peca.codigo}</td>
                          <td>{peca.nome}</td>
                          <td>{peca.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Peças Trocadas */}
              {selectedOrderDetails.pecasTrocadas.length > 0 && (
                <div className="details-section">
                  <h4>Peças Trocadas</h4>
                  <table className="parts-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nome</th>
                        <th>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderDetails.pecasTrocadas.map((peca, index) => (
                        <tr key={index}>
                          <td>{peca.codigo}</td>
                          <td>{peca.nome}</td>
                          <td>{peca.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Modal de Detalhes */}
        {showDetailsModal && selectedCompletedOrder && (
          <div className="details-modal-overlay" onClick={closeDetailsModal}>
            <div className="details-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="details-modal-header">
                <h3>Detalhes da OS {selectedCompletedOrder.TB02122_NUMOS}</h3>
                <button className="details-modal-close" onClick={closeDetailsModal}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
              
              <div className="details-modal-body">
                {/* Laudo */}
                <div className="details-section">
                  <h4>Laudo</h4>
                  <div className="laudo-content">
                    {selectedCompletedOrder.TB02122_OBS || 'Nenhum laudo registrado'}
                  </div>
                </div>
                
                {/* Contadores */}
                <div className="details-section">
                  <h4>Contadores</h4>
                  <div className="counters-grid">
                    <div className="counter-item">
                      <label>P&B:</label>
                      <span>{selectedCompletedOrder.TB02122_CONTADOR || '0'}</span>
                    </div>
                    <div className="counter-item">
                      <label>Cor:</label>
                      <span>{selectedCompletedOrder.TB02122_CONTADORC || '0'}</span>
                    </div>
                    <div className="counter-item">
                      <label>Dig.:</label>
                      <span>{selectedCompletedOrder.TB02122_CONTADORDG || '0'}</span>
                    </div>
                    <div className="counter-item">
                      <label>A3 P&B:</label>
                      <span>{selectedCompletedOrder.TB02122_CONTADORGF || '0'}</span>
                    </div>
                    <div className="counter-item">
                      <label>A3 Cor:</label>
                      <span>{selectedCompletedOrder.TB02122_CONTADORGFC || '0'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Peças Pendentes */}
                {pendingParts.length > 0 && (
                  <div className="details-section">
                    <h4>Peças Pendentes</h4>
                    {isLoadingParts ? (
                      <div className="loading-message">Carregando peças...</div>
                    ) : (
                      <table className="parts-table">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Nome</th>
                            <th>Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingParts.map((peca, index) => (
                            <tr key={index}>
                              <td>{peca.codigo}</td>
                              <td>{peca.nome}</td>
                              <td>{peca.quantidade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                
                {/* Peças Utilizadas */}
                {usedParts.length > 0 && (
                  <div className="details-section">
                    <h4>Peças Utilizadas</h4>
                    {isLoadingParts ? (
                      <div className="loading-message">Carregando peças...</div>
                    ) : (
                      <table className="parts-table">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Nome</th>
                            <th>Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usedParts.map((peca, index) => (
                            <tr key={index}>
                              <td>{peca.codigo}</td>
                              <td>{peca.nome}</td>
                              <td>{peca.quantidade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                
                {/* Mensagens quando não há peças */}
                {!isLoadingParts && pendingParts.length === 0 && usedParts.length === 0 && (
                  <div className="details-section">
                    <div className="no-parts-message">
                      Nenhuma peça pendente ou utilizada registrada para esta ordem.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Componente do modal de rota
  const RouteModal = ({ isOpen, routeData, loading, error, onClose }) => {
    const [unroutedOrders, setUnroutedOrders] = React.useState([]);
    const [routedOrders, setRoutedOrders] = React.useState([]);
    const [draggedOrder, setDraggedOrder] = React.useState(null);
    const [tooltipOrder, setTooltipOrder] = React.useState(null);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
    
    // Estados para geocodificação e cache
    const [coordinatesCache, setCoordinatesCache] = React.useState({});
    const [loadingCoordinates, setLoadingCoordinates] = React.useState({});
    const [coordinatesError, setCoordinatesError] = React.useState({});
    const [isLoadingAllCoordinates, setIsLoadingAllCoordinates] = React.useState(false);
    
    // Estados para o mapa de ordens não roteirizadas
    const [showUnroutedMap, setShowUnroutedMap] = React.useState(false);
    const [sidebarExpanded, setSidebarExpanded] = React.useState(true);
    
    // Estados para roteirização no mapa
    const [selectedMapOrders, setSelectedMapOrders] = React.useState([]);
    const [mapRoutedOrders, setMapRoutedOrders] = React.useState([]);
    const [mapRoutedSequence, setMapRoutedSequence] = React.useState(1);
    
    // Função para validar se as coordenadas estão no Brasil
    const isValidBrazilianCoordinates = (lat, lng) => {
      // Aproximadamente os limites do Brasil
      return lat >= -33.7683 && lat <= 5.2717 && lng >= -73.9872 && lng <= -34.7299;
    };
    const [mapTooltipOrder, setMapTooltipOrder] = React.useState(null);
    const [mapTooltipPosition, setMapTooltipPosition] = React.useState({ x: 0, y: 0 });

    // Funções para gerenciar roteirização no mapa
    const addOrderToMapRoute = (order) => {
      // Se a ordem tem grupo de localização, adicionar todas as ordens do grupo
      if (order._locationGroup && order._locationGroup.length > 1) {
        console.log(`🗺️ Adicionando ${order._locationGroup.length} ordens do grupo à rota`);
        
        const ordersToAdd = [];
        let currentSequence = mapRoutedSequence;
        
        order._locationGroup.forEach(groupOrder => {
          const groupOrderId = groupOrder.id || groupOrder.TB02115_CODIGO;
          
          // Verificar se a ordem já está na rota
          const isAlreadyRouted = mapRoutedOrders.find(routed => 
            (routed.id || routed.TB02115_CODIGO) === groupOrderId
          );
          
          if (!isAlreadyRouted) {
            // Adicionar ordem à lista de ordens para adicionar
            const newRoutedOrder = {
              ...groupOrder,
              routeSequence: currentSequence,
              routeOrder: currentSequence
            };
            
            ordersToAdd.push(newRoutedOrder);
            currentSequence++;
          }
        });
        
        if (ordersToAdd.length > 0) {
          setMapRoutedOrders(prev => [...prev, ...ordersToAdd]);
          setMapRoutedSequence(currentSequence);
          
          // Marcar todas como selecionadas
          const orderIds = ordersToAdd.map(order => order.id || order.TB02115_CODIGO);
          setSelectedMapOrders(prev => [...prev, ...orderIds]);
        }
      } else {
        // Adicionar ordem individual
        const orderId = order.id || order.TB02115_CODIGO;
        
        // Verificar se a ordem já está na rota
        const isAlreadyRouted = mapRoutedOrders.find(routed => 
          (routed.id || routed.TB02115_CODIGO) === orderId
        );
        
        if (isAlreadyRouted) {
          return; // Ordem já está na rota
        }
        
        // Adicionar ordem à rota com sequência
        const newRoutedOrder = {
          ...order,
          routeSequence: mapRoutedSequence,
          routeOrder: mapRoutedSequence
        };
        
        setMapRoutedOrders(prev => [...prev, newRoutedOrder]);
        setMapRoutedSequence(prev => prev + 1);
        
        // Marcar como selecionada
        setSelectedMapOrders(prev => [...prev, orderId]);
      }
    };

    const removeOrderFromMapRoute = (order) => {
      const orderId = order.id || order.TB02115_CODIGO;
      
      // Se a ordem tem grupo de localização, remover todas as ordens do grupo
      if (order._locationGroup && order._locationGroup.length > 1) {
        console.log(`🗺️ Removendo ${order._locationGroup.length} ordens do grupo da rota`);
        
        const groupOrderIds = order._locationGroup.map(groupOrder => 
          groupOrder.id || groupOrder.TB02115_CODIGO
        );
        
        // Remover todas as ordens do grupo da rota
        setMapRoutedOrders(prev => prev.filter(routed => 
          !groupOrderIds.includes(routed.id || routed.TB02115_CODIGO)
        ));
        
        // Remover todas da seleção
        setSelectedMapOrders(prev => prev.filter(id => !groupOrderIds.includes(id)));
        
        // Reordenar sequência
        const remainingOrders = mapRoutedOrders.filter(routed => 
          !groupOrderIds.includes(routed.id || routed.TB02115_CODIGO)
        );
        
        const reorderedOrders = remainingOrders.map((order, index) => ({
          ...order,
          routeSequence: index + 1,
          routeOrder: index + 1
        }));
        
        setMapRoutedOrders(reorderedOrders);
        setMapRoutedSequence(reorderedOrders.length + 1);
      } else {
        // Remover ordem individual
        setMapRoutedOrders(prev => prev.filter(routed => 
          (routed.id || routed.TB02115_CODIGO) !== orderId
        ));
        
        // Remover da seleção
        setSelectedMapOrders(prev => prev.filter(id => id !== orderId));
        
        // Reordenar sequência
        const remainingOrders = mapRoutedOrders.filter(routed => 
          (routed.id || routed.TB02115_CODIGO) !== orderId
        );
        
        const reorderedOrders = remainingOrders.map((order, index) => ({
          ...order,
          routeSequence: index + 1,
          routeOrder: index + 1
        }));
        
        setMapRoutedOrders(reorderedOrders);
        setMapRoutedSequence(reorderedOrders.length + 1);
      }
    };

    const isOrderInMapRoute = (order) => {
      const orderId = order.id || order.TB02115_CODIGO;
      
      // Se a ordem tem grupo de localização, verificar se alguma ordem do grupo está na rota
      if (order._locationGroup && order._locationGroup.length > 1) {
        return order._locationGroup.some(groupOrder => {
          const groupOrderId = groupOrder.id || groupOrder.TB02115_CODIGO;
          return mapRoutedOrders.find(routed => 
            (routed.id || routed.TB02115_CODIGO) === groupOrderId
          );
        });
      } else {
        // Verificar ordem individual
        return mapRoutedOrders.find(routed => 
          (routed.id || routed.TB02115_CODIGO) === orderId
        );
      }
    };

    const getMapRouteProgress = () => {
      const totalAvailable = unroutedOrders.length;
      const totalRouted = mapRoutedOrders.length;
      const remaining = totalAvailable - totalRouted;
      
      return {
        total: totalAvailable,
        routed: totalRouted,
        remaining: remaining,
        percentage: totalAvailable > 0 ? Math.round((totalRouted / totalAvailable) * 100) : 0
      };
    };

    // Funções para mapear tipo de serviço e cores (consistentes com o resto da aplicação)
    const getServiceTypeFromPreventiva = (preventiva) => {
      const typeMap = {
        'E': 'E', // ESTOQUE
        'B': 'B', // BALCÃO
        'A': 'A', // AFERIÇÃO
        'R': 'R', // RETORNO-RECARGA
        'D': 'D', // DESINSTALAÇÃO
        'I': 'I', // INSTALAÇÃO
        'S': 'S', // PREVENTIVA
        'N': 'C'  // NORMAL/CORRETIVA - mapear para 'C' visualmente
      };
      return typeMap[preventiva] || 'C'; // Padrão para corretiva (C visualmente)
    };

    const getServiceColor = (tipo) => {
      switch(tipo) {
        case 'E': return '#9c27b0'; // ESTOQUE - Roxo
        case 'B': return '#ff5722'; // BALCÃO - Laranja
        case 'A': return '#607d8b'; // AFERIÇÃO - Azul acinzentado
        case 'R': return '#795548'; // RETORNO-RECARGA - Marrom
        case 'D': return '#f44336'; // DESINSTALAÇÃO - Vermelho
        case 'I': return '#2196f3'; // INSTALAÇÃO - Azul
        case 'S': return '#4caf50'; // PREVENTIVA - Verde
        case 'C': return '#ff9800'; // CORRETIVA - Amarelo/Laranja
        default: return '#9e9e9e';  // Cinza para desconhecido
      }
    };

    React.useEffect(() => {
      if (routeData && routeData.orders) {
        // Separar ordens roteirizadas e não roteirizadas
        const unrouted = [];
        const routed = [];
        
        routeData.orders.forEach(order => {
          if (order.isRouted && order.routeSequence) {
            routed.push({
              ...order,
              routeOrder: order.routeSequence
            });
          } else {
            unrouted.push(order);
          }
        });
        
        // Ordenar ordens roteirizadas por sequência
        routed.sort((a, b) => a.routeOrder - b.routeOrder);
        
        setUnroutedOrders(unrouted);
        setRoutedOrders(routed);
      }
    }, [routeData]);

    // Carregar coordenadas quando as ordens mudarem
    React.useEffect(() => {
      if (unroutedOrders.length > 0 || routedOrders.length > 0) {
        // Aguardar um pouco para garantir que as ordens foram processadas
        const timer = setTimeout(() => {
          loadAllOrdersCoordinates();
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }, [unroutedOrders, routedOrders]);

    // Carregar coordenadas quando o modal abrir e os dados estiverem disponíveis
    React.useEffect(() => {
      if (isOpen && routeData?.orders && routeData.orders.length > 0) {
        console.log('🚀 Modal de roteirização aberto - iniciando carregamento de coordenadas');
        
        // Aguardar um pouco para garantir que as ordens foram processadas
        const timer = setTimeout(() => {
          const allOrders = [...unroutedOrders, ...routedOrders];
          if (allOrders.length > 0) {
            loadAllOrdersCoordinates();
          }
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }, [isOpen, routeData]);

    // Limpar roteirização quando o modal for fechado
    React.useEffect(() => {
      if (!isOpen) {
        setMapRoutedOrders([]);
        setSelectedMapOrders([]);
        setMapRoutedSequence(1);
        setMapTooltipOrder(null);
        
        // Limpar instância do mapa
        if (window.mapInstance) {
          window.mapInstance.remove();
          window.mapInstance = null;
        }
      }
    }, [isOpen]);

    const handleDragStart = (e, order) => {
      setDraggedOrder(order);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    const handleDropToRouted = async (e) => {
      e.preventDefault();
      if (draggedOrder) {
        // Verificar se a ordem já existe na lista roteirizada
        const existingInRouted = routedOrders.find(order => 
          order.id === draggedOrder.id || order.TB02115_CODIGO === draggedOrder.TB02115_CODIGO
        );
        
        if (existingInRouted) {
          // Se já existe, não fazer nada (evitar duplicação)
          setDraggedOrder(null);
          return;
        }
        
        const newSequence = routedOrders.length + 1;
        const newRoutedOrder = {
          ...draggedOrder,
          routeOrder: newSequence
        };
        
        // Inserir no banco de dados
        try {
          const response = await fetch(`${API_BASE_URL}/api/route/add-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              technicianId: routeData.technicianId,
              orderNumber: draggedOrder.id || draggedOrder.TB02115_CODIGO,
              sequence: newSequence,
              forecast: routeData.forecastDate
            })
          });
          
          const result = await response.json();
          if (result.success) {
            console.log('✅ Ordem inserida na roteirização:', result.message);
            setRoutedOrders([...routedOrders, newRoutedOrder]);
            setUnroutedOrders(unroutedOrders.filter(order => 
              order.id !== draggedOrder.id && order.TB02115_CODIGO !== draggedOrder.TB02115_CODIGO
            ));
          } else {
            console.error('❌ Erro ao inserir ordem na roteirização:', result.message);
            // Não atualizar o estado se houve erro no banco
          }
        } catch (error) {
          console.error('❌ Erro na requisição de inserção:', error);
          // Não atualizar o estado se houve erro na requisição
        }
        
        setDraggedOrder(null);
      }
    };

    const handleDropToUnrouted = async (e) => {
      e.preventDefault();
      if (draggedOrder) {
        // Verificar se a ordem já existe na lista não roteirizada
        const existingInUnrouted = unroutedOrders.find(order => 
          order.id === draggedOrder.id || order.TB02115_CODIGO === draggedOrder.TB02115_CODIGO
        );
        
        if (existingInUnrouted) {
          // Se já existe, não fazer nada (evitar duplicação)
          setDraggedOrder(null);
          return;
        }
        
        // Remover do banco de dados
        try {
          const response = await fetch(`${API_BASE_URL}/api/route/remove-order`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              technicianId: routeData.technicianId,
              orderNumber: draggedOrder.id || draggedOrder.TB02115_CODIGO,
              forecast: routeData.forecastDate
            })
          });
          
          const result = await response.json();
          if (result.success) {
            console.log('✅ Ordem removida da roteirização:', result.message);
            setUnroutedOrders([...unroutedOrders, draggedOrder]);
            setRoutedOrders(routedOrders.filter(order => 
              order.id !== draggedOrder.id && order.TB02115_CODIGO !== draggedOrder.TB02115_CODIGO
            ));
          } else {
            console.error('❌ Erro ao remover ordem da roteirização:', result.message);
            // Não atualizar o estado se houve erro no banco
          }
        } catch (error) {
          console.error('❌ Erro na requisição de remoção:', error);
          // Não atualizar o estado se houve erro na requisição
        }
        
        setDraggedOrder(null);
      }
    };

    const handleReorderRouted = async (dragIndex, dropIndex) => {
      const newRoutedOrders = [...routedOrders];
      const draggedItem = newRoutedOrders[dragIndex];
      newRoutedOrders.splice(dragIndex, 1);
      newRoutedOrders.splice(dropIndex, 0, draggedItem);
      
      // Reordenar números
      newRoutedOrders.forEach((order, index) => {
        order.routeOrder = index + 1;
      });
      
      setRoutedOrders(newRoutedOrders);
      
      // Atualizar sequências de todas as ordens afetadas no banco de dados
      try {
        // Atualizar todas as ordens que tiveram suas sequências alteradas
        const updatePromises = newRoutedOrders.map((order, index) => {
          const newSequence = index + 1;
          return fetch(`${API_BASE_URL}/api/route/update-sequence`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              technicianId: routeData.technicianId,
              orderNumber: order.id || order.TB02115_CODIGO,
              newSequence: newSequence,
              forecast: routeData.forecastDate
            })
          });
        });
        
        const responses = await Promise.all(updatePromises);
        const results = await Promise.all(responses.map(res => res.json()));
        
        const successCount = results.filter(result => result.success).length;
        const errorCount = results.filter(result => !result.success).length;
        
        if (errorCount === 0) {
          console.log(`✅ Sequências atualizadas no banco: ${successCount} ordens`);
        } else {
          console.error(`❌ Erro ao atualizar ${errorCount} sequências no banco`);
          results.forEach((result, index) => {
            if (!result.success) {
              console.error(`  - Ordem ${newRoutedOrders[index].id || newRoutedOrders[index].TB02115_CODIGO}: ${result.message}`);
            }
          });
        }
      } catch (error) {
        console.error('❌ Erro na requisição de atualização:', error);
      }
    };

    const handleDragOverRouted = (e, dropIndex) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      // Adicionar indicador visual de onde será inserido
      const target = e.currentTarget;
      target.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
      e.currentTarget.classList.remove('drag-over');
    };

    const handleDropInRouted = (e, dropIndex) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      
      if (draggedOrder) {
        // Se a ordem já está na lista roteirizada, reordenar
        const existingIndex = routedOrders.findIndex(order => 
          order.id === draggedOrder.id || order.TB02115_CODIGO === draggedOrder.TB02115_CODIGO
        );
        
        if (existingIndex !== -1) {
          handleReorderRouted(existingIndex, dropIndex);
        } else {
          // Se é uma nova ordem, adicionar na posição
          const newRoutedOrder = {
            ...draggedOrder,
            routeOrder: dropIndex + 1
          };
          
          const newRoutedOrders = [...routedOrders];
          newRoutedOrders.splice(dropIndex, 0, newRoutedOrder);
          
          // Reordenar números
          newRoutedOrders.forEach((order, index) => {
            order.routeOrder = index + 1;
          });
          
          setRoutedOrders(newRoutedOrders);
          setUnroutedOrders(unroutedOrders.filter(order => 
            order.id !== draggedOrder.id && order.TB02115_CODIGO !== draggedOrder.TB02115_CODIGO
          ));
        }
        setDraggedOrder(null);
      }
    };

    const handleOrderClick = async (order, event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      
      // Debug: Log dos campos disponíveis na ordem
      console.log('🔍 Debug - Campos da ordem no tooltip:', {
        id: order.id || order.TB02115_CODIGO,
        numeroSerie: order.numeroSerie,
        motivoOS: order.motivoOS,
        serie: order.serie || order.TB02115_NUMSERIE,
        motivo: order.motivo || order.TB02115_NOME,
        TB02115_NUMSERIE: order.TB02115_NUMSERIE,
        TB02115_NOME: order.TB02115_NOME,
        allFields: Object.keys(order).filter(key => key.includes('SERIE') || key.includes('NOME') || key.includes('MOTIVO'))
      });
      
      setTooltipPosition({
        x: rect.right + 10,
        y: rect.top
      });
      setTooltipOrder(order);
      setShowTooltip(true);
      
      // Carregar coordenadas se ainda não estiverem no cache
      const orderId = order.id || order.TB02115_CODIGO;
      if (!coordinatesCache[orderId] && !loadingCoordinates[orderId]) {
        await loadOrderCoordinates(order);
      }
    };

    const closeTooltip = () => {
      setShowTooltip(false);
      setTooltipOrder(null);
    };

    const hasLinkedOrder = (order) => {
      return order.pedidoVinculado || order.TB02115_PEDIDO_VINCULADO;
    };

    // Função para carregar coordenadas de uma ordem específica
    const loadOrderCoordinates = async (order) => {
      const orderId = order.id || order.TB02115_CODIGO;
      const endereco = order.endereco || order.TB02115_ENDERECO;
      
      if (!endereco) {
        console.log(`⚠️ Ordem ${orderId} não possui endereço`);
        return null;
      }

      // Verificar se já está no cache
      if (coordinatesCache[orderId]) {
        console.log(`✅ Coordenadas da ordem ${orderId} já estão em cache`);
        return coordinatesCache[orderId];
      }

      // Verificar se já está carregando
      if (loadingCoordinates[orderId]) {
        console.log(`⏳ Coordenadas da ordem ${orderId} já estão carregando`);
        return null;
      }

      console.log(`🌍 Carregando coordenadas para ordem ${orderId}: ${endereco}`);
      
      // Marcar como carregando
      setLoadingCoordinates(prev => ({ ...prev, [orderId]: true }));
      setCoordinatesError(prev => ({ ...prev, [orderId]: null }));

      try {
        const coordinates = await geocodeAddress(endereco);
        
        if (coordinates) {
          console.log(`✅ Coordenadas carregadas para ordem ${orderId}:`, coordinates);
          
          // Salvar no cache
          setCoordinatesCache(prev => ({
            ...prev,
            [orderId]: coordinates
          }));
          
          return coordinates;
        } else {
          console.log(`❌ Não foi possível obter coordenadas para ordem ${orderId}`);
          setCoordinatesError(prev => ({
            ...prev,
            [orderId]: 'Endereço não encontrado'
          }));
          return null;
        }
      } catch (error) {
        console.error(`❌ Erro ao carregar coordenadas para ordem ${orderId}:`, error);
        setCoordinatesError(prev => ({
          ...prev,
          [orderId]: error.message
        }));
        return null;
      } finally {
        setLoadingCoordinates(prev => ({ ...prev, [orderId]: false }));
      }
    };

    // Função para carregar coordenadas de todas as ordens em lote
    const loadAllOrdersCoordinates = async () => {
      console.log(`🌍 Iniciando carregamento de coordenadas em lote`);
      
      // Evitar carregamento duplicado
      if (isLoadingAllCoordinates) {
        console.log('⏳ Carregamento de coordenadas já está em andamento');
        return;
      }
      
      setIsLoadingAllCoordinates(true);
      
      try {
        // Usar routeData.orders como fonte principal, com fallback para as listas processadas
        const ordersToProcess = routeData?.orders || [...unroutedOrders, ...routedOrders];
        
        if (!ordersToProcess || ordersToProcess.length === 0) {
          console.log('⚠️ Nenhuma ordem encontrada para processar coordenadas');
          return;
        }
        
        console.log(`🌍 Processando ${ordersToProcess.length} ordens para coordenadas`);
        
        // Preparar endereços para geocodificação em lote
        const addressesToGeocode = [];
        
        for (const order of ordersToProcess) {
          const orderId = order.id || order.TB02115_CODIGO;
          const endereco = order.endereco || order.TB02115_ENDERECO;
          
          if (endereco && !coordinatesCache[orderId] && !loadingCoordinates[orderId]) {
            addressesToGeocode.push({
              orderId,
              address: endereco
            });
          } else if (coordinatesCache[orderId]) {
            console.log(`✅ Ordem ${orderId} já tem coordenadas em cache`);
          } else if (!endereco) {
            console.log(`⚠️ Ordem ${orderId} não possui endereço`);
          }
        }
        
        if (addressesToGeocode.length === 0) {
          console.log('✅ Nenhum endereço novo para geocodificar');
          return;
        }
        
        console.log(`🌍 Enviando ${addressesToGeocode.length} endereços para geocodificação em lote`);
        
        // Marcar todos como carregando
        addressesToGeocode.forEach(({ orderId }) => {
          setLoadingCoordinates(prev => ({ ...prev, [orderId]: true }));
          setCoordinatesError(prev => ({ ...prev, [orderId]: null }));
        });
        
        // Fazer requisição em lote para o backend
        const response = await fetch('/api/geocode/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addresses: addressesToGeocode
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📍 Resultado geocodificação em lote:`, data);
        
        if (data.success && data.data) {
          // Processar resultados
          data.data.forEach(result => {
            const orderId = result.orderId;
            
            if (result.error) {
              console.log(`❌ Erro para ordem ${orderId}: ${result.error}`);
              setCoordinatesError(prev => ({
                ...prev,
                [orderId]: result.error
              }));
            } else if (result.lat && result.lng) {
              console.log(`✅ Coordenadas carregadas para ordem ${orderId}:`, result);
              
              // Salvar no cache
              setCoordinatesCache(prev => ({
                ...prev,
                [orderId]: {
                  lat: result.lat,
                  lng: result.lng,
                  display_name: result.display_name || result.address
                }
              }));
            }
          });
          
          console.log(`✅ Geocodificação em lote concluída - ${data.data.length} endereços processados`);
          console.log(`📊 Performance: ${data.performance?.totalTime}ms total, ${data.performance?.averageTimePerAddress}ms por endereço`);
        }
        
      } catch (error) {
        console.error('❌ Erro durante carregamento de coordenadas em lote:', error);
        
        // Marcar todos como erro
        const ordersToProcess = routeData?.orders || [...unroutedOrders, ...routedOrders];
        ordersToProcess.forEach(order => {
          const orderId = order.id || order.TB02115_CODIGO;
          if (loadingCoordinates[orderId]) {
            setCoordinatesError(prev => ({
              ...prev,
              [orderId]: 'Erro na geocodificação em lote'
            }));
          }
        });
      } finally {
        // Limpar estado de carregamento
        setLoadingCoordinates({});
        setIsLoadingAllCoordinates(false);
      }
    };

    // Função para agrupar ordens por localização
    const groupOrdersByLocation = (orders) => {
      const groups = {};
      const tolerance = 0.001; // Aproximadamente 100 metros
      
      orders.forEach(order => {
        const orderId = order.id || order.TB02115_CODIGO;
        const coordinates = coordinatesCache[orderId];
        
        if (coordinates && 
            typeof coordinates.lat === 'number' && 
            typeof coordinates.lng === 'number' && 
            !isNaN(coordinates.lat) && 
            !isNaN(coordinates.lng)) {
          
          // Criar chave de localização arredondada
          const latKey = Math.round(coordinates.lat / tolerance) * tolerance;
          const lngKey = Math.round(coordinates.lng / tolerance) * tolerance;
          const locationKey = `${latKey},${lngKey}`;
          
          if (!groups[locationKey]) {
            groups[locationKey] = {
              coordinates: coordinates,
              orders: []
            };
          }
          
          groups[locationKey].orders.push(order);
        }
      });
      
      return groups;
    };

    // Função para inicializar o mapa de ordens não roteirizadas
    const initializeUnroutedMap = () => {
      if (!window.L) {
        console.error('❌ Leaflet não carregado');
        return;
      }

      const mapElement = document.getElementById('unrouted-map');
      if (!mapElement) {
        console.error('❌ Elemento do mapa não encontrado');
        return;
      }

      // Filtrar ordens com coordenadas disponíveis
      const ordersWithCoordinates = unroutedOrders.filter(order => {
        const orderId = order.id || order.TB02115_CODIGO;
        return coordinatesCache[orderId];
      });

      if (ordersWithCoordinates.length === 0) {
        console.log('⚠️ Nenhuma ordem com coordenadas disponível para exibir no mapa');
        return;
      }

      // Agrupar ordens por localização
      const locationGroups = groupOrdersByLocation(ordersWithCoordinates);
      console.log(`🗺️ ${Object.keys(locationGroups).length} locais únicos encontrados`);

      // Calcular centro do mapa baseado nas coordenadas disponíveis
      const bounds = [];
      const markers = [];
      const brazilBounds = {
        north: -5.0,  // Norte (Roraima)
        south: -34.0, // Sul (Rio Grande do Sul)
        east: -34.0,  // Leste (Rio Grande do Norte)
        west: -74.0   // Oeste (Acre)
      };

      Object.entries(locationGroups).forEach(([locationKey, group]) => {
        const coordinates = group.coordinates;
        const orders = group.orders;
        
        if (coordinates && 
            typeof coordinates.lat === 'number' && 
            typeof coordinates.lng === 'number' && 
            !isNaN(coordinates.lat) && 
            !isNaN(coordinates.lng) &&
            coordinates.lat >= -90 && coordinates.lat <= 90 &&
            coordinates.lng >= -180 && coordinates.lng <= 180) {
          
          const position = [coordinates.lat, coordinates.lng];
          bounds.push(position);

          // Verificar se alguma ordem do grupo está na rota
          const hasRoutedOrders = orders.some(order => isOrderInMapRoute(order));
          
          // Criar marcador personalizado com quantidade de ordens
          const customIcon = window.L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                width: ${orders.length > 9 ? '28px' : '24px'}; 
                height: 24px; 
                background: ${hasRoutedOrders ? '#10b981' : '#ef4444'}; 
                border: 2px solid white; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                color: white; 
                font-size: ${orders.length > 9 ? '9px' : '10px'}; 
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
              ">
                ${orders.length}
              </div>
            `,
            iconSize: [orders.length > 9 ? 28 : 24, 24],
            iconAnchor: [orders.length > 9 ? 14 : 12, 12]
          });

          const marker = window.L.marker(position, { icon: customIcon });

          // Adicionar evento de clique no marcador
          marker.on('click', (event) => {
            const rect = event.originalEvent.target.getBoundingClientRect();
            setMapTooltipPosition({
              x: rect.left + rect.width / 2,
              y: rect.top - 10
            });
            // Mostrar primeira ordem do grupo no tooltip
            setMapTooltipOrder({
              ...orders[0],
              _locationGroup: orders // Adicionar todas as ordens do grupo
            });
          });

          markers.push(marker);
        } else {
          console.warn(`⚠️ Coordenadas inválidas para localização ${locationKey}:`, coordinates);
        }
      });

      // Criar mapa
      const map = window.L.map('unrouted-map').setView(
        bounds.length > 0 ? bounds[0] : [-23.5505, -46.6333], // São Paulo como fallback
        12
      );

      // Armazenar instância do mapa globalmente
      window.mapInstance = map;

      // Adicionar camada de tiles do OpenStreetMap
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Adicionar marcadores ao mapa
      markers.forEach(marker => {
        marker.addTo(map);
      });

      // Filtrar apenas coordenadas brasileiras para o foco do mapa
      const brazilianBounds = bounds.filter(position => {
        const [lat, lng] = position;
        return lat >= brazilBounds.south && lat <= brazilBounds.north &&
               lng >= brazilBounds.west && lng <= brazilBounds.east;
      });

      // Ajustar zoom para mostrar apenas marcadores brasileiros
      if (brazilianBounds.length > 1) {
        map.fitBounds(brazilianBounds);
      } else if (brazilianBounds.length === 1) {
        // Se há apenas um ponto, centralizar nele com zoom apropriado
        const [lat, lng] = brazilianBounds[0];
        map.setView([lat, lng], 12);
      } else {
        // Centro padrão do Brasil se não houver coordenadas brasileiras
        map.setView([-15.7801, -47.9292], 5);
      }

      console.log(`🗺️ Mapa OpenStreetMap inicializado com ${markers.length} marcadores`);
    };

    // Função para atualizar apenas os marcadores sem reinicializar o mapa
    const updateMapMarkers = () => {
      if (!window.mapInstance) {
        console.log('⚠️ Mapa não inicializado, pulando atualização de marcadores');
        return;
      }

      console.log('🔄 Atualizando marcadores do mapa');
      
      // Remover todos os marcadores existentes
      window.mapInstance.eachLayer((layer) => {
        if (layer instanceof window.L.Marker) {
          window.mapInstance.removeLayer(layer);
        }
      });

      // Verificar se há ordens com coordenadas
      const ordersWithCoordinates = unroutedOrders.filter(order => {
        const orderId = order.id || order.TB02115_CODIGO;
        return coordinatesCache[orderId];
      });
      
      if (ordersWithCoordinates.length === 0) {
        console.log('⚠️ Nenhuma ordem com coordenadas disponível para atualizar marcadores');
        return;
      }
      
      // Agrupar ordens por localização
      const locationGroups = groupOrdersByLocation(ordersWithCoordinates);
      const bounds = [];
      
      // Limites do Brasil para filtro
      const brazilBounds = {
        north: -5.0,
        south: -34.0,
        east: -34.0,
        west: -74.0
      };
      
      Object.entries(locationGroups).forEach(([locationKey, group]) => {
        const coordinates = group.coordinates;
        const orders = group.orders;
        
        if (coordinates && 
            typeof coordinates.lat === 'number' && 
            typeof coordinates.lng === 'number' && 
            !isNaN(coordinates.lat) && 
            !isNaN(coordinates.lng) &&
            coordinates.lat >= -90 && coordinates.lat <= 90 &&
            coordinates.lng >= -180 && coordinates.lng <= 180) {
          
          const position = [coordinates.lat, coordinates.lng];
          bounds.push(position);

          // Verificar se alguma ordem do grupo está na rota
          const hasRoutedOrders = orders.some(order => isOrderInMapRoute(order));
          
          // Criar marcador personalizado com quantidade de ordens
          const customIcon = window.L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                width: ${orders.length > 9 ? '28px' : '24px'}; 
                height: 24px; 
                background: ${hasRoutedOrders ? '#10b981' : '#ef4444'}; 
                border: 2px solid white; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                color: white; 
                font-size: ${orders.length > 9 ? '9px' : '10px'}; 
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
              ">
                ${orders.length}
              </div>
            `,
            iconSize: [orders.length > 9 ? 28 : 24, 24],
            iconAnchor: [orders.length > 9 ? 14 : 12, 12]
          });

          const marker = window.L.marker(position, { icon: customIcon });

          // Adicionar evento de clique no marcador
          marker.on('click', (event) => {
            const rect = event.originalEvent.target.getBoundingClientRect();
            setMapTooltipPosition({
              x: rect.left + rect.width / 2,
              y: rect.top - 10
            });
            // Mostrar primeira ordem do grupo no tooltip
            setMapTooltipOrder({
              ...orders[0],
              _locationGroup: orders // Adicionar todas as ordens do grupo
            });
          });

          marker.addTo(window.mapInstance);
        } else {
          console.warn(`⚠️ Coordenadas inválidas para localização ${locationKey}:`, coordinates);
        }
      });

      console.log(`🔄 Marcadores atualizados: ${bounds.length} pontos`);
    };

    // useEffect para inicializar o mapa quando o modal abrir
    React.useEffect(() => {
      if (showUnroutedMap) {
        // Aguardar um pouco para garantir que o DOM foi renderizado
        const timer = setTimeout(() => {
          initializeUnroutedMap();
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }, [showUnroutedMap, coordinatesCache, unroutedOrders]);

    // useEffect separado para atualizar marcadores quando a roteirização mudar
    React.useEffect(() => {
      if (showUnroutedMap && window.mapInstance) {
        // Atualizar apenas os marcadores existentes sem reinicializar o mapa
        updateMapMarkers();
      }
    }, [mapRoutedOrders]);

    // Função para imprimir o roteiro
    const printRoute = () => {
      if (routedOrders.length === 0) {
        alert('Não há ordens roteirizadas para imprimir.');
        return;
      }

      // Criar uma nova janela para impressão
      const printWindow = window.open('', '_blank');
      
      // Calcular a data do próximo dia útil
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      // Verificar se amanhã é fim de semana
      const dayOfWeek = tomorrow.getDay();
      let nextWorkDay = tomorrow;
      if (dayOfWeek === 0) { // Domingo
        nextWorkDay.setDate(tomorrow.getDate() + 1);
      } else if (dayOfWeek === 6) { // Sábado
        nextWorkDay.setDate(tomorrow.getDate() + 2);
      }
      
      const nextWorkDayStr = nextWorkDay.toLocaleDateString('pt-BR');

      // Ordenar ordens pela sequência
      const sortedOrders = [...routedOrders].sort((a, b) => a.routeOrder - b.routeOrder);

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Roteiro - ${routeData?.technicianName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              color: #333;
            }
            .header p {
              margin: 5px 0;
              font-size: 14px;
              color: #666;
            }
            .order-item {
              margin-bottom: 15px;
              border: 1px solid #ddd;
              padding: 10px;
              page-break-inside: avoid;
            }
            .order-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-weight: bold;
            }
            .order-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              margin-bottom: 8px;
            }
            .order-detail {
              display: flex;
              align-items: center;
            }
            .order-detail strong {
              min-width: 80px;
              margin-right: 5px;
            }
            .order-address {
              margin-top: 5px;
              padding-top: 5px;
              border-top: 1px solid #eee;
              font-style: italic;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .order-item { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${routeData?.technicianName}</h1>
            <p>Roteiro para o próximo dia útil: ${nextWorkDayStr}</p>
            <p>Total de ordens de serviço: ${sortedOrders.length}</p>
          </div>
          
          ${sortedOrders.map((order, index) => {
            const cliente = order.cliente || order.TB01008_NOME || 'N/A';
            const equipamento = order.equipamento || order.TB01010_RESUMIDO || order.TB01010_NOME || 'N/A';
            const serie = order.serie || order.TB02115_NUMSERIE || 'N/A';
            const pedidoVinculado = order.pedidoVinculado || order.TB02115_PEDIDO_VINCULADO || 'N/A';
            const endereco = order.endereco || order.TB02115_ENDERECO || 'N/A';
            
            return `
              <div class="order-item">
                <div class="order-header">
                  <span>${index + 1} >> ${order.id || order.TB02115_CODIGO}</span>
                </div>
                <div class="order-details">
                  <div class="order-detail">
                    <strong>Cliente:</strong> ${cliente}
                  </div>
                  <div class="order-detail">
                    <strong>Equipamento:</strong> ${equipamento}
                  </div>
                  <div class="order-detail">
                    <strong>Série:</strong> ${serie}
                  </div>
                  <div class="order-detail">
                    <strong>Pedido:</strong> ${pedidoVinculado}
                  </div>
                </div>
                <div class="order-address">
                  <strong>Endereço:</strong> ${endereco}
                </div>
              </div>
            `;
          }).join('')}
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Aguardar o carregamento e imprimir
      printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
      };
    };

    if (!isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="route-modal-content">
          <div className="route-modal-header">
            <div className="route-modal-title-section">
              <h2>
                <i className="bi bi-geo-alt"></i>
                Roteirização - {routeData?.technicianName}
              </h2>
              {isLoadingAllCoordinates && (
                <div className="coordinates-loading-indicator">
                  <i className="bi bi-arrow-repeat spin"></i>
                  <span>Carregando coordenadas...</span>
                </div>
              )}
            </div>
            <button 
              className="route-modal-close"
              onClick={onClose}
              title="Fechar"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="route-modal-body">
            {loading && (
              <div className="route-loading">
                <div className="loading-spinner"></div>
                <p>Carregando ordens de serviço...</p>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Preparando roteirização
                </span>
              </div>
            )}

            {error && (
              <div className="route-error">
                <i className="bi bi-exclamation-triangle"></i>
                <p>{error}</p>
              </div>
            )}

            {routeData && !loading && !error && (
              <div className="route-routing-container">
                {/* Coluna Esquerda - Ordens não roteirizadas */}
                <div className="route-column unrouted-column">
                  <div className="route-column-header">
                    <span className="route-count">{unroutedOrders.length}</span>
                    <div className="route-column-title-section">
                      <h3>Não Roteirizadas</h3>
                    </div>
                    <button 
                      className={`route-map-button ${unroutedOrders.length === 0 || isLoadingAllCoordinates ? 'disabled' : ''}`}
                      onClick={() => setShowUnroutedMap(true)}
                      disabled={unroutedOrders.length === 0 || isLoadingAllCoordinates}
                      title={unroutedOrders.length === 0 ? 'Nenhuma ordem disponível' : isLoadingAllCoordinates ? 'Carregando coordenadas...' : 'Roteirizar ordens pelo mapa'}
                    >
                      <i className="bi bi-geo-alt"></i>
                      <span>Roteirizar pelo Mapa</span>
                    </button>
                  </div>
                  <div 
                    className="route-column-content"
                    onDragOver={handleDragOver}
                    onDrop={handleDropToUnrouted}
                  >
                    {unroutedOrders.length === 0 ? (
                      <div className="route-empty-state">
                        <p>Nenhuma ordem disponível</p>
                      </div>
                    ) : (
                      <div className="route-orders-grouped">
                        {(() => {
                          const grouped = {};
                          unroutedOrders.forEach(order => {
                            const cidade = order.cidade || order.TB02115_CIDADE;
                            const bairro = order.bairro || order.TB02115_BAIRRO;
                            const cliente = order.cliente || order.TB01008_NOME;
                            const endereco = order.endereco || order.TB02115_ENDERECO;
                            
                            // Agrupamento por cidade
                            if (!grouped[cidade]) {
                              grouped[cidade] = {
                                cidade,
                                bairros: {}
                              };
                            }
                            
                            // Sub-agrupamento por bairro dentro da cidade
                            if (!grouped[cidade].bairros[bairro]) {
                              grouped[cidade].bairros[bairro] = {
                                bairro,
                                clientes: {}
                              };
                            }
                            
                            // Sub-agrupamento por cliente dentro do bairro
                            if (!grouped[cidade].bairros[bairro].clientes[cliente]) {
                              grouped[cidade].bairros[bairro].clientes[cliente] = {
                                cliente,
                                endereco,
                                orders: []
                              };
                            }
                            grouped[cidade].bairros[bairro].clientes[cliente].orders.push(order);
                          });
                          return Object.values(grouped);
                        })().map((cidadeGroup, cidadeIndex) => (
                          <div key={cidadeIndex} className="route-client-group">
                            <div className="route-client-info">
                              <h4>{cidadeGroup.cidade}</h4>
                            </div>
                            {Object.values(cidadeGroup.bairros).map((bairroGroup, bairroIndex) => (
                              <div key={bairroIndex} className="route-bairro-subgroup">
                                <div className="route-bairro-info">
                                  <p>Bairro: {bairroGroup.bairro}</p>
                                </div>
                                <div className="route-orders-badges">
                                  {Object.values(bairroGroup.clientes).flatMap((clienteGroup, clienteIndex) =>
                                    clienteGroup.orders.map((order, orderIndex) => (
                                      <div
                                        key={`${cidadeIndex}-${bairroIndex}-${clienteIndex}-${orderIndex}`}
                                        className={`route-order-badge ${hasLinkedOrder(order) ? 'has-linked-order' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, order)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOrderClick(order, e);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <span 
                                          className="service-type-badge-compact"
                                          style={{ backgroundColor: getServiceColor(getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA || 'N')) }}
                                        >
                                          {getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA || 'N')}
                                        </span>
                                        <span className="route-order-id-bold">{order.id || order.TB02115_CODIGO}</span>
                                        {order.TB01010_RESUMIDO && <span className="route-order-resumido">{order.TB01010_RESUMIDO}</span>}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Direita - Ordens roteirizadas */}
                <div className="route-column routed-column">
                  <div className="route-column-header">
                    <span className="route-count">{routedOrders.length}</span>
                    <div className="route-column-title-section">
                      <div className="route-title-with-date">
                        <h3>Roteirizadas</h3>
                        {routeData?.forecastDate && (
                          <span className="route-forecast-date">
                            {(() => {
                              // Formatar a data do forecast para exibição brasileira
                              const forecastDate = new Date(routeData.forecastDate);
                              const day = forecastDate.getUTCDate().toString().padStart(2, '0');
                              const month = (forecastDate.getUTCMonth() + 1).toString().padStart(2, '0');
                              const year = forecastDate.getUTCFullYear();
                              return `${day}/${month}/${year}`;
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="route-print-button"
                      onClick={printRoute}
                      title="Imprimir roteiro"
                      disabled={routedOrders.length === 0}
                    >
                      <i className="bi bi-printer"></i>
                    </button>
                  </div>
                  <div 
                    className="route-column-content"
                    onDragOver={handleDragOver}
                    onDrop={handleDropToRouted}
                  >
                    {routedOrders.length === 0 ? (
                      <div className="route-empty-state">
                        <p>Arraste ordens para criar a rota</p>
                      </div>
                    ) : (
                      <div className="route-orders-grouped">
                        {(() => {
                          const grouped = {};
                          routedOrders.forEach(order => {
                            const cidade = order.cidade || order.TB02115_CIDADE;
                            const bairro = order.bairro || order.TB02115_BAIRRO;
                            const cliente = order.cliente || order.TB01008_NOME;
                            const endereco = order.endereco || order.TB02115_ENDERECO;
                            
                            // Agrupamento por cidade
                            if (!grouped[cidade]) {
                              grouped[cidade] = {
                                cidade,
                                bairros: {}
                              };
                            }
                            
                            // Sub-agrupamento por bairro dentro da cidade
                            if (!grouped[cidade].bairros[bairro]) {
                              grouped[cidade].bairros[bairro] = {
                                bairro,
                                clientes: {}
                              };
                            }
                            
                            // Sub-agrupamento por cliente dentro do bairro
                            if (!grouped[cidade].bairros[bairro].clientes[cliente]) {
                              grouped[cidade].bairros[bairro].clientes[cliente] = {
                                cliente,
                                endereco,
                                orders: []
                              };
                            }
                            grouped[cidade].bairros[bairro].clientes[cliente].orders.push(order);
                          });
                          return Object.values(grouped);
                        })().map((cidadeGroup, cidadeIndex) => (
                          <div key={cidadeIndex} className="route-client-group">
                            <div className="route-client-info">
                              <h4>{cidadeGroup.cidade}</h4>
                            </div>
                            {Object.values(cidadeGroup.bairros).map((bairroGroup, bairroIndex) => (
                              <div key={bairroIndex} className="route-bairro-subgroup">
                                <div className="route-bairro-info">
                                  <p>Bairro: {bairroGroup.bairro}</p>
                                </div>
                                <div className="route-orders-badges">
                                  {Object.values(bairroGroup.clientes).flatMap((clienteGroup, clienteIndex) =>
                                    clienteGroup.orders.map((order, orderIndex) => {
                                      const globalIndex = routedOrders.findIndex(o => 
                                        o.id === order.id || o.TB02115_CODIGO === order.TB02115_CODIGO
                                      );
                                                                              return (
                                          <div
                                            key={`${cidadeIndex}-${bairroIndex}-${clienteIndex}-${orderIndex}`}
                                            className={`route-order-badge ${hasLinkedOrder(order) ? 'has-linked-order' : ''}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, order)}
                                            onDragOver={(e) => handleDragOverRouted(e, globalIndex)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDropInRouted(e, globalIndex)}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOrderClick(order, e);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <span className="route-order-number">{order.routeOrder}</span>
                                            <span 
                                              className="service-type-badge-compact"
                                              style={{ backgroundColor: getServiceColor(getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA || 'N')) }}
                                            >
                                              {getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA || 'N')}
                                            </span>
                                            <span className="route-order-id-bold">{order.id || order.TB02115_CODIGO}</span>
                                            {order.TB01010_RESUMIDO && <span className="route-order-resumido">{order.TB01010_RESUMIDO}</span>}
                                          </div>
                                        );
                                    })
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Tooltip */}
        {showTooltip && tooltipOrder && (
          <div 
            className="order-tooltip-modal" 
            onClick={closeTooltip}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000
            }}
          >
            <div 
              className="order-tooltip-content" 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: tooltipPosition.x,
                top: tooltipPosition.y,
                transform: 'translateY(-50%)'
              }}
            >
              <div className="order-tooltip-header">
                <h3 className="order-tooltip-title">
                  Ordem {tooltipOrder.id || tooltipOrder.TB02115_CODIGO}
                </h3>
                <button className="order-tooltip-close" onClick={closeTooltip}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              
              <div className="order-tooltip-info">
                <div className="order-tooltip-item">
                  <span className="order-tooltip-label">Previsão:</span>
                  <span className="order-tooltip-value">
                    {tooltipOrder.previsao || 'N/A'}
                  </span>
                </div>
                
                <div className="order-tooltip-item">
                  <span className="order-tooltip-label">Contrato:</span>
                  <span className="order-tooltip-value">
                    {tooltipOrder.contrato || tooltipOrder.TB02115_CONTRATO || 'N/A'}
                  </span>
                </div>
                
                <div className="order-tooltip-item">
                  <span className="order-tooltip-label">Equipamento:</span>
                  <span className="order-tooltip-value">
                                            {tooltipOrder.equipamento || tooltipOrder.TB01010_RESUMIDO || tooltipOrder.TB01010_NOME || 'N/A'}
                  </span>
                </div>
                
                <div className="order-tooltip-item">
                  <span className="order-tooltip-label">Série:</span>
                  <span className="order-tooltip-value">
                    {tooltipOrder.numeroSerie || tooltipOrder.serie || tooltipOrder.TB02115_NUMSERIE || 'N/A'}
                  </span>
                </div>
                
                <div className="order-tooltip-item">
                  <span className="order-tooltip-label">Motivo da OS:</span>
                  <span className="order-tooltip-value">
                    {tooltipOrder.motivoOS || tooltipOrder.motivo || tooltipOrder.TB02115_NOME || 'N/A'}
                  </span>
                </div>
                
                <div className="order-tooltip-item">
                  <span className="order-tooltip-label">Solicitante:</span>
                  <span className="order-tooltip-value">
                    {tooltipOrder.solicitante || tooltipOrder.TB02115_SOLICITANTE || 'N/A'}
                  </span>
                </div>
                
                {/* Coordenadas */}
                {(() => {
                  const orderId = tooltipOrder.id || tooltipOrder.TB02115_CODIGO;
                  const coordinates = coordinatesCache[orderId];
                  const isLoading = loadingCoordinates[orderId];
                  const error = coordinatesError[orderId];
                  
                  if (isLoading) {
                    return (
                      <div className="order-tooltip-item">
                        <span className="order-tooltip-label">Coordenadas:</span>
                        <span className="order-tooltip-value">
                          <i className="bi bi-arrow-repeat spin" style={{ fontSize: '10px', marginRight: '4px' }}></i>
                          Carregando...
                        </span>
                      </div>
                    );
                  }
                  
                  if (error) {
                    return (
                      <div className="order-tooltip-item">
                        <span className="order-tooltip-label">Coordenadas:</span>
                        <span className="order-tooltip-value" style={{ color: '#ef4444', fontSize: '10px' }}>
                          <i className="bi bi-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                          Erro: {error}
                        </span>
                      </div>
                    );
                  }
                  
                  if (coordinates) {
                    return (
                      <>
                        <div className="order-tooltip-item">
                          <span className="order-tooltip-label">Latitude:</span>
                          <span className="order-tooltip-value">
                            {coordinates.lat.toFixed(6)}
                          </span>
                        </div>
                        <div className="order-tooltip-item">
                          <span className="order-tooltip-label">Longitude:</span>
                          <span className="order-tooltip-value">
                            {coordinates.lng.toFixed(6)}
                          </span>
                        </div>
                      </>
                    );
                  }
                  
                  return (
                    <div className="order-tooltip-item">
                      <span className="order-tooltip-label">Coordenadas:</span>
                      <span className="order-tooltip-value" style={{ color: '#9ca3af', fontSize: '10px' }}>
                        <i className="bi bi-geo-alt" style={{ marginRight: '4px' }}></i>
                        Não disponível
                      </span>
                    </div>
                  );
                })()}
                
                {hasLinkedOrder(tooltipOrder) && (
                  <div className="order-tooltip-item order-tooltip-linked-order">
                    <span className="order-tooltip-label order-tooltip-linked-order-label">Pedido Vinculado:</span>
                    <span className="order-tooltip-value order-tooltip-linked-order-value">
                      {tooltipOrder.pedidoVinculado || tooltipOrder.TB02115_PEDIDO_VINCULADO || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal do Mapa de Ordens Não Roteirizadas */}
        {showUnroutedMap && (
          <div className="modal-overlay">
            <div className="route-map-modal-content">
              <div className="route-map-modal-header">
                <div className="route-map-modal-title-section">
                  <h2>
                    <i className="bi bi-geo-alt"></i>
                    Mapa - Ordens Não Roteirizadas
                  </h2>
                  {(() => {
                    const ordersWithCoordinates = unroutedOrders.filter(order => {
                      const orderId = order.id || order.TB02115_CODIGO;
                      return coordinatesCache[orderId];
                    });
                    
                    const ordersWithoutCoordinates = unroutedOrders.filter(order => {
                      const orderId = order.id || order.TB02115_CODIGO;
                      return !coordinatesCache[orderId];
                    });
                    
                    const locationGroups = groupOrdersByLocation(ordersWithCoordinates);
                    const uniqueLocations = Object.keys(locationGroups).length;
                    
                    return (
                      <div className="route-map-info">
                        <span className="route-map-count">
                          {uniqueLocations} pontos no mapa • {unroutedOrders.length} ordens carregadas
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <button 
                  className="route-modal-close"
                  onClick={() => setShowUnroutedMap(false)}
                  title="Fechar"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <div className="route-map-modal-body">
                <div className="route-map-layout">
                  <div className="route-map-container">
                    <div id="unrouted-map" className="route-map"></div>
                  </div>
                  
                  {/* Painel lateral direito para roteirização */}
                  <div className="route-map-sidebar-right">
                    <div className="route-map-sidebar-header">
                      {(() => {
                        const progress = getMapRouteProgress();
                        return (
                          <div className="route-progress-info">
                            <div className="route-progress-bar">
                              <div 
                                className="route-progress-fill" 
                                style={{ width: `${progress.percentage}%` }}
                              ></div>
                            </div>
                            <div className="route-progress-text">
                              {progress.routed} de {progress.total} ({progress.percentage}%)
                            </div>
                            <div className="route-progress-remaining">
                              {progress.remaining} restantes
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    <div className="route-map-sidebar-content">
                      {mapRoutedOrders.length === 0 ? (
                        <div className="route-empty-state">
                          <i className="bi bi-info-circle"></i>
                          <p>Clique nos pontos do mapa e selecione "Incluir na rota" para começar a roteirização</p>
                        </div>
                      ) : (
                        <div className="route-orders-list">
                          {mapRoutedOrders.map((order, index) => (
                            <div key={index} className="route-order-item">
                              <div className="route-order-header">
                                <div className="route-order-left">
                                  <span className="route-order-sequence">{order.routeOrder}</span>
                                  <span className="route-order-number">
                                    OS {order.id || order.TB02115_CODIGO}
                                  </span>
                                </div>
                                <button 
                                  className="route-order-remove-btn"
                                  onClick={() => removeOrderFromMapRoute(order)}
                                  title="Remover da rota"
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </div>
                              <div className="route-order-details">
                                <p><strong>Cliente:</strong> {order.cliente || order.TB01008_NOME}</p>
                                <p><strong>Endereço:</strong> {order.endereco || order.TB02115_ENDERECO}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Botão para salvar roteirização */}
                      {mapRoutedOrders.length > 0 && (
                        <div className="route-save-section">
                          <button 
                            className="route-save-btn"
                            onClick={async () => {
                              try {
                                console.log(`💾 Salvando roteirização com ${mapRoutedOrders.length} ordens`);
                                
                                // Salvar todas as ordens roteiradas no backend
                                const savePromises = mapRoutedOrders.map((order, index) => {
                                  const sequence = index + 1;
                                  return fetch(`${API_BASE_URL}/api/route/add-order`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      technicianId: routeData.technicianId,
                                      orderNumber: order.id || order.TB02115_CODIGO,
                                      sequence: sequence,
                                      forecast: routeData.forecastDate
                                    })
                                  });
                                });
                                
                                const responses = await Promise.all(savePromises);
                                const results = await Promise.all(responses.map(res => res.json()));
                                
                                const successCount = results.filter(result => result.success).length;
                                const errorCount = results.filter(result => !result.success).length;
                                
                                if (errorCount === 0) {
                                  console.log(`✅ Roteirização salva com sucesso: ${successCount} ordens`);
                                  
                                  // Atualizar as listas de ordens na tela principal
                                  const routedOrderIds = mapRoutedOrders.map(order => 
                                    order.id || order.TB02115_CODIGO
                                  );
                                  
                                  // Adicionar ordens roteiradas à lista "Roteirizadas"
                                  const newRoutedOrders = mapRoutedOrders.map((order, index) => ({
                                    ...order,
                                    routeOrder: index + 1
                                  }));
                                  
                                  setRoutedOrders(prev => [...prev, ...newRoutedOrders]);
                                  
                                  // Remover ordens roteiradas da lista "Não Roteirizadas"
                                  setUnroutedOrders(prev => prev.filter(order => {
                                    const orderId = order.id || order.TB02115_CODIGO;
                                    return !routedOrderIds.includes(orderId);
                                  }));
                                  
                                  // Fechar o modal do mapa
                                  setShowUnroutedMap(false);
                                  
                                  // Limpar estados do mapa
                                  setMapRoutedOrders([]);
                                  setSelectedMapOrders([]);
                                  setMapRoutedSequence(1);
                                  setMapTooltipOrder(null);
                                  
                                  // Mostrar mensagem de sucesso
                                  alert(`✅ Roteirização salva com sucesso!\n${successCount} ordens foram adicionadas à rota.`);
                                } else {
                                  console.error(`❌ Erro ao salvar roteirização: ${errorCount} falhas`);
                                  results.forEach((result, index) => {
                                    if (!result.success) {
                                      console.error(`  - Ordem ${mapRoutedOrders[index].id || mapRoutedOrders[index].TB02115_CODIGO}: ${result.message}`);
                                    }
                                  });
                                  alert(`❌ Erro ao salvar roteirização!\n${errorCount} ordens falharam ao serem salvas.`);
                                }
                              } catch (error) {
                                console.error('❌ Erro ao salvar roteirização:', error);
                                alert('❌ Erro ao salvar roteirização: ' + error.message);
                              }
                            }}
                          >
                            <i className="bi bi-check-circle"></i>
                            Salvar Roteirização
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Painel lateral com ordens não localizadas e ignoradas fora do Brasil */}
                  {(() => {
                    const ordersWithoutCoordinates = unroutedOrders.filter(order => {
                      const orderId = order.id || order.TB02115_CODIGO;
                      return !coordinatesCache[orderId];
                    });
                    
                    const ordersIgnoredOutsideBrazil = unroutedOrders.filter(order => {
                      const orderId = order.id || order.TB02115_CODIGO;
                      const coordinates = coordinatesCache[orderId];
                      // Verificar se tem coordenadas mas não está no mapa (ignorada fora do Brasil)
                      return coordinates && coordinates.lat && coordinates.lng && 
                             !isValidBrazilianCoordinates(coordinates.lat, coordinates.lng);
                    });
                    
                    const totalUnlocatedOrders = ordersWithoutCoordinates.length + ordersIgnoredOutsideBrazil.length;
                    
                    if (totalUnlocatedOrders > 0) {
                      return (
                        <div className={`route-map-sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
                          <div className="sidebar-header">
                            <div className="sidebar-title-section">
                              <h4>
                                <i className="bi bi-exclamation-triangle"></i>
                                Ordens não localizadas ({totalUnlocatedOrders})
                              </h4>
                              <button 
                                className="sidebar-toggle-btn"
                                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                                title={sidebarExpanded ? 'Recolher painel' : 'Expandir painel'}
                              >
                                <i className={`bi ${sidebarExpanded ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
                              </button>
                            </div>
                          </div>
                          
                          {sidebarExpanded && (
                            <div className="sidebar-content">
                              <div className="unlocated-orders-list">
                                {/* Ordens sem coordenadas */}
                                {ordersWithoutCoordinates.length > 0 && (
                                  <div className="unlocated-section">
                                    <div className="unlocated-section-header">
                                      <h5>
                                        <i className="bi bi-question-circle"></i>
                                        Sem coordenadas ({ordersWithoutCoordinates.length})
                                      </h5>
                                    </div>
                                    {ordersWithoutCoordinates.map((order, index) => (
                                      <div key={`no-coords-${index}`} className="unlocated-order-item">
                                        <div className="unlocated-order-header">
                                          <span className="unlocated-order-number">
                                            OS {order.id || order.TB02115_CODIGO}
                                          </span>
                                          <span className="unlocated-order-type">
                                            {getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA)}
                                          </span>
                                        </div>
                                        <div className="unlocated-order-details">
                                          <div className="unlocated-order-cliente">
                                            {order.cliente || order.TB02115_CLIENTE || 'N/A'}
                                          </div>
                                          <div className="unlocated-order-equipamento">
                                            {order.equipamento || order.TB01010_RESUMIDO || order.TB01010_NOME || 'N/A'}
                                          </div>
                                          <div className="unlocated-order-address">
                                            {order.endereco || order.TB02115_ENDERECO || 'N/A'}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Ordens ignoradas fora do Brasil */}
                                {ordersIgnoredOutsideBrazil.length > 0 && (
                                  <div className="unlocated-section">
                                    <div className="unlocated-section-header">
                                      <h5>
                                        <i className="bi bi-globe"></i>
                                        Fora do Brasil ({ordersIgnoredOutsideBrazil.length})
                                      </h5>
                                    </div>
                                    {ordersIgnoredOutsideBrazil.map((order, index) => {
                                      const orderId = order.id || order.TB02115_CODIGO;
                                      const coordinates = coordinatesCache[orderId];
                                      return (
                                        <div key={`outside-brazil-${index}`} className="unlocated-order-item outside-brazil">
                                          <div className="unlocated-order-header">
                                            <span className="unlocated-order-number">
                                              OS {order.id || order.TB02115_CODIGO}
                                            </span>
                                            <span className="unlocated-order-type">
                                              {getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA)}
                                            </span>
                                          </div>
                                          <div className="unlocated-order-details">
                                            <div className="unlocated-order-cliente">
                                              {order.cliente || order.TB02115_CLIENTE || 'N/A'}
                                            </div>
                                            <div className="unlocated-order-equipamento">
                                              {order.equipamento || order.TB01010_RESUMIDO || order.TB01010_NOME || 'N/A'}
                                            </div>
                                            <div className="unlocated-order-address">
                                              {order.endereco || order.TB02115_ENDERECO || 'N/A'}
                                            </div>
                                            {coordinates && (
                                              <div className="unlocated-order-coordinates">
                                                <small>
                                                  <i className="bi bi-geo-alt"></i>
                                                  Coordenadas encontradas: {coordinates.lat}, {coordinates.lng}
                                                </small>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* Tooltip do mapa */}
            {mapTooltipOrder && (
              <div 
                className="order-tooltip-modal" 
                onClick={() => setMapTooltipOrder(null)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 10001
                }}
              >
                <div 
                  className="order-tooltip-content" 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    left: mapTooltipPosition.x,
                    top: mapTooltipPosition.y,
                    transform: 'translateY(-50%)'
                  }}
                >
                  <div className="order-tooltip-header">
                    <h3 className="order-tooltip-title">
                      {mapTooltipOrder._locationGroup ? 
                        `${mapTooltipOrder._locationGroup.length} ordens no local` : 
                        `Ordem ${mapTooltipOrder.id || mapTooltipOrder.TB02115_CODIGO}`
                      }
                    </h3>
                    <button className="order-tooltip-close" onClick={() => setMapTooltipOrder(null)}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                  
                  <div className="order-tooltip-info">
                    <div className="order-tooltip-item">
                      <span className="order-tooltip-label">Previsão:</span>
                      <span className="order-tooltip-value">
                        {mapTooltipOrder.previsao || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="order-tooltip-item">
                      <span className="order-tooltip-label">Contrato:</span>
                      <span className="order-tooltip-value">
                        {mapTooltipOrder.contrato || mapTooltipOrder.TB02115_CONTRATO || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="order-tooltip-item">
                      <span className="order-tooltip-label">Equipamento:</span>
                      <span className="order-tooltip-value">
                        {mapTooltipOrder.equipamento || mapTooltipOrder.TB01010_RESUMIDO || mapTooltipOrder.TB01010_NOME || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="order-tooltip-item">
                      <span className="order-tooltip-label">Série:</span>
                      <span className="order-tooltip-value">
                        {mapTooltipOrder.numeroSerie || mapTooltipOrder.serie || mapTooltipOrder.TB02115_NUMSERIE || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="order-tooltip-item">
                      <span className="order-tooltip-label">Motivo da OS:</span>
                      <span className="order-tooltip-value">
                        {mapTooltipOrder.motivoOS || mapTooltipOrder.motivo || mapTooltipOrder.TB02115_NOME || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="order-tooltip-item">
                      <span className="order-tooltip-label">Solicitante:</span>
                      <span className="order-tooltip-value">
                        {mapTooltipOrder.solicitante || mapTooltipOrder.TB02115_SOLICITANTE || 'N/A'}
                      </span>
                    </div>
                    
                    {/* Lista de ordens do grupo (se houver múltiplas) */}
                    {mapTooltipOrder._locationGroup && mapTooltipOrder._locationGroup.length > 1 && (
                      <div className="order-tooltip-group">
                        <span className="order-tooltip-label">Ordens no local:</span>
                        <div className="order-tooltip-orders-list">
                          {mapTooltipOrder._locationGroup.map((order, index) => (
                            <div key={index} className="order-tooltip-order-item">
                              <span className="order-tooltip-order-number">
                                OS {order.id || order.TB02115_CODIGO}
                              </span>
                              <span className="order-tooltip-order-type">
                                {getServiceTypeFromPreventiva(order.TB02115_PREVENTIVA)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Coordenadas */}
                    {(() => {
                      const orderId = mapTooltipOrder.id || mapTooltipOrder.TB02115_CODIGO;
                      const coordinates = coordinatesCache[orderId];
                      const isLoading = loadingCoordinates[orderId];
                      const error = coordinatesError[orderId];
                      
                      if (isLoading) {
                        return (
                          <div className="order-tooltip-item">
                            <span className="order-tooltip-label">Coordenadas:</span>
                            <span className="order-tooltip-value">
                              <i className="bi bi-arrow-repeat spin" style={{ fontSize: '10px', marginRight: '4px' }}></i>
                              Carregando...
                            </span>
                          </div>
                        );
                      }
                      
                      if (error) {
                        return (
                          <div className="order-tooltip-item">
                            <span className="order-tooltip-label">Coordenadas:</span>
                            <span className="order-tooltip-value" style={{ color: '#ef4444', fontSize: '10px' }}>
                              <i className="bi bi-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                              Erro: {error}
                            </span>
                          </div>
                        );
                      }
                      
                      if (coordinates) {
                        return (
                          <>
                            <div className="order-tooltip-item">
                              <span className="order-tooltip-label">Latitude:</span>
                              <span className="order-tooltip-value">
                                {coordinates.lat.toFixed(6)}
                              </span>
                            </div>
                            <div className="order-tooltip-item">
                              <span className="order-tooltip-label">Longitude:</span>
                              <span className="order-tooltip-value">
                                {coordinates.lng.toFixed(6)}
                              </span>
                            </div>
                          </>
                        );
                      }
                      
                      return (
                        <div className="order-tooltip-item">
                          <span className="order-tooltip-label">Coordenadas:</span>
                          <span className="order-tooltip-value" style={{ color: '#9ca3af', fontSize: '10px' }}>
                            <i className="bi bi-geo-alt" style={{ marginRight: '4px' }}></i>
                            Não disponível
                          </span>
                        </div>
                      );
                    })()}
                    
                    {hasLinkedOrder(mapTooltipOrder) && (
                      <div className="order-tooltip-item order-tooltip-linked-order">
                        <span className="order-tooltip-label order-tooltip-linked-order-label">Pedido Vinculado:</span>
                        <span className="order-tooltip-value order-tooltip-linked-order-value">
                          {mapTooltipOrder.pedidoVinculado || mapTooltipOrder.TB02115_PEDIDO_VINCULADO || 'N/A'}
                        </span>
                      </div>
                    )}
                    
                    {/* Botão de ação para roteirização */}
                    <div className="order-tooltip-actions">
                      {isOrderInMapRoute(mapTooltipOrder) ? (
                        <button 
                          className="order-tooltip-action-btn remove-route-btn"
                          onClick={() => {
                            removeOrderFromMapRoute(mapTooltipOrder);
                            setMapTooltipOrder(null);
                          }}
                        >
                          <i className="bi bi-dash-circle"></i>
                          Retirar da rota
                        </button>
                      ) : (
                        <button 
                          className="order-tooltip-action-btn add-route-btn"
                          onClick={() => {
                            addOrderToMapRoute(mapTooltipOrder);
                            setMapTooltipOrder(null);
                          }}
                        >
                          <i className="bi bi-plus-circle"></i>
                          Incluir na rota
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Calcular dados com contagens para usar em ambos os componentes
  const citiesWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const cityData = {};
    
    if (dataSource === 'sql_server' && filtered.length > 0) {
      filtered.forEach(item => {
        if (item.cidade && item.cidade.trim() !== '') {
          // Aplicar filtros de bairro, cliente, tipo de OS, SLA e equipamento
          let ordensToCount = item.ordens || [];
          if (selectedColumnFilters.bairro.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const bairro = ordem.TB02115_BAIRRO || '';
              return selectedColumnFilters.bairro.includes(bairro);
            });
          }
          if (selectedColumnFilters.cliente.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              return selectedColumnFilters.cliente.includes(cliente);
            });
          }
          if (selectedColumnFilters.tipoOS.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              return selectedColumnFilters.tipoOS.includes(tipoVisual);
            });
          }
          if (selectedColumnFilters.sla.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              return selectedColumnFilters.sla.includes(sla);
            });
          }
          if (selectedColumnFilters.equipamento.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              return selectedColumnFilters.equipamento.includes(equipamento);
            });
          }
          if (selectedColumnFilters.status.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const status = ordem.TB01073_NOME || '';
              return selectedColumnFilters.status.includes(status);
            });
          }
          
          if (ordensToCount.length > 0) {
            if (!cityData[item.cidade]) {
              cityData[item.cidade] = 0;
            }
            cityData[item.cidade] += ordensToCount.length;
          }
        }
      });
    } else {
      filtered.forEach(item => {
        if (item.cidade && item.cidade.trim() !== '') {
          // Aplicar filtros de bairro, cliente, tipo de OS, SLA e equipamento
          let ordensToCount = item.ordens || [];
          if (selectedColumnFilters.bairro.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const bairro = ordem.TB02115_BAIRRO || '';
              return selectedColumnFilters.bairro.includes(bairro);
            });
          }
          if (selectedColumnFilters.cliente.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              return selectedColumnFilters.cliente.includes(cliente);
            });
          }
          if (selectedColumnFilters.tipoOS.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              return selectedColumnFilters.tipoOS.includes(tipoVisual);
            });
          }
          if (selectedColumnFilters.sla.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              return selectedColumnFilters.sla.includes(sla);
            });
          }
          if (selectedColumnFilters.equipamento.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              return selectedColumnFilters.equipamento.includes(equipamento);
            });
          }
          if (selectedColumnFilters.status.length > 0) {
            ordensToCount = ordensToCount.filter(ordem => {
              const status = ordem.TB01073_NOME || '';
              return selectedColumnFilters.status.includes(status);
            });
          }
          
          if (ordensToCount.length > 0) {
            if (!cityData[item.cidade]) {
              cityData[item.cidade] = 0;
            }
            cityData[item.cidade] += ordensToCount.length;
          }
        }
      });
    }
    
          return Object.entries(cityData)
        .map(([cidade, count]) => ({ cidade, count }))
        .sort((a, b) => a.cidade.localeCompare(b.cidade));
    }, [getFilteredOrders, dataSource, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.tipoOS, selectedColumnFilters.sla, selectedColumnFilters.equipamento, selectedColumnFilters.status]);

  const bairrosWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const bairroData = {};
    
    if (dataSource === 'sql_server' && filtered.length > 0) {
      filtered.forEach(item => {
        // Se há filtro de cidade aplicado, considerar apenas essa cidade
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return; // Pular esta cidade se não está nos filtros
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const bairro = ordem.TB02115_BAIRRO || '';
            if (bairro.trim() !== '') {
              if (!bairroData[bairro]) {
                bairroData[bairro] = 0;
              }
              bairroData[bairro] += 1;
            }
          });
        }
      });
    } else {
      filtered.forEach(item => {
        // Se há filtro de cidade aplicado, considerar apenas essa cidade
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return; // Pular esta cidade se não está nos filtros
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const bairro = ordem.TB02115_BAIRRO || '';
            if (bairro.trim() !== '') {
              if (!bairroData[bairro]) {
                bairroData[bairro] = 0;
              }
              bairroData[bairro] += 1;
            }
          });
        }
      });
    }
    
    return Object.entries(bairroData)
      .map(([bairro, count]) => ({ bairro, count }))
      .sort((a, b) => a.bairro.localeCompare(b.bairro));
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.cliente, selectedColumnFilters.tipoOS, selectedColumnFilters.sla, selectedColumnFilters.equipamento, selectedColumnFilters.status]);

  const clientesWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const clienteData = {};
    
    if (dataSource === 'sql_server' && filtered.length > 0) {
      filtered.forEach(item => {
        // Se há filtro de cidade aplicado, considerar apenas essa cidade
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return; // Pular esta cidade se não está nos filtros
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const cliente = ordem.cliente || ordem.TB01008_NOME;
            if (cliente && cliente.trim() !== '') {
              if (!clienteData[cliente]) {
                clienteData[cliente] = 0;
              }
              clienteData[cliente] += 1;
            }
          });
        }
      });
    } else {
      filtered.forEach(item => {
        // Se há filtro de cidade aplicado, considerar apenas essa cidade
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return; // Pular esta cidade se não está nos filtros
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const cliente = ordem.cliente || ordem.TB01008_NOME;
            if (cliente && cliente.trim() !== '') {
              if (!clienteData[cliente]) {
                clienteData[cliente] = 0;
              }
              clienteData[cliente] += 1;
            }
          });
        }
      });
    }
    
    return Object.entries(clienteData)
      .map(([cliente, count]) => ({ cliente, count }))
      .sort((a, b) => a.cliente.localeCompare(b.cliente));
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.tipoOS, selectedColumnFilters.sla, selectedColumnFilters.equipamento, selectedColumnFilters.status]);

  const statusWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const statusData = {};
    
    if (dataSource === 'sql_server' && filtered.length > 0) {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            const status = ordem.TB01073_NOME || '';
            if (status.trim() !== '') {
              if (!statusData[status]) {
                statusData[status] = 0;
              }
              statusData[status] += 1;
            }
          });
        }
      });
    } else {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            const status = ordem.TB01073_NOME || '';
            if (status.trim() !== '') {
              if (!statusData[status]) {
                statusData[status] = 0;
              }
              statusData[status] += 1;
            }
          });
        }
      });
    }
    
    return Object.entries(statusData)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => a.status.localeCompare(b.status));
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.tipoOS, selectedColumnFilters.sla, selectedColumnFilters.equipamento]);

  const slasWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const slaData = {};
    
    // Definir todos os SLAs possíveis para garantir ordem consistente
    const allSLAs = ['Vencido', 'Vencendo', 'OK'];
    allSLAs.forEach(sla => {
      slaData[sla] = 0;
    });
    
    if (dataSource === 'sql_server' && filtered.length > 0) {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const calcRestante = ordem.CALC_RESTANTE || 0;
            const sla = getSLAFromCalcRestante(calcRestante);
            if (slaData.hasOwnProperty(sla)) {
              slaData[sla] += 1;
            }
          });
        }
      });
    } else {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de tipo de OS aplicado, considerar apenas esses tipos
            if (selectedColumnFilters.tipoOS.length > 0) {
              const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
              const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
              if (!selectedColumnFilters.tipoOS.includes(tipoVisual)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const calcRestante = ordem.CALC_RESTANTE || 0;
            const sla = getSLAFromCalcRestante(calcRestante);
            if (slaData.hasOwnProperty(sla)) {
              slaData[sla] += 1;
            }
          });
        }
      });
    }
    
    return allSLAs
      .map(sla => ({ sla, count: slaData[sla] }))
      .filter(item => item.count > 0); // Mostrar apenas SLAs que têm ordens
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.tipoOS, selectedColumnFilters.equipamento, selectedColumnFilters.status]);

  const tiposOSWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const tipoData = {};
    
    // Definir todos os tipos de OS possíveis para garantir ordem consistente
    const allTipos = ['Preventiva', 'Corretiva', 'Instalação'];
    allTipos.forEach(tipo => {
      tipoData[tipo] = 0;
    });
    
    if (dataSource === 'sql_server' && filtered.length > 0) {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
            const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
            if (tipoData.hasOwnProperty(tipoVisual)) {
              tipoData[tipoVisual] += 1;
            }
          });
        }
      });
    } else {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de equipamento aplicado, considerar apenas esses equipamentos
            if (selectedColumnFilters.equipamento.length > 0) {
              const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME;
              if (!selectedColumnFilters.equipamento.includes(equipamento)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
            const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
            if (tipoData.hasOwnProperty(tipoVisual)) {
              tipoData[tipoVisual] += 1;
            }
          });
        }
      });
    }
    
    return allTipos
      .map(tipo => ({ tipo, count: tipoData[tipo] }))
      .filter(item => item.count > 0); // Mostrar apenas tipos que têm ordens
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.sla, selectedColumnFilters.equipamento, selectedColumnFilters.status]);

  const equipamentosWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const equipamentoData = {};
    
    if (dataSource === 'sql_server' && filtered.length > 0) {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME || '';
            if (equipamento) {
              equipamentoData[equipamento] = (equipamentoData[equipamento] || 0) + 1;
            }
          });
        }
      });
    } else {
      filtered.forEach(item => {
        // Se há filtros de cidade aplicados, considerar apenas essas cidades
        if (selectedColumnFilters.cidade.length > 0 && 
            !selectedColumnFilters.cidade.includes(item.cidade)) {
          return;
        }
        
        if (item.ordens) {
          item.ordens.forEach(ordem => {
            // Se há filtro de bairro aplicado, considerar apenas esses bairros
            if (selectedColumnFilters.bairro.length > 0) {
              const bairro = ordem.TB02115_BAIRRO || '';
              if (!selectedColumnFilters.bairro.includes(bairro)) {
                return;
              }
            }
            
            // Se há filtro de cliente aplicado, considerar apenas esses clientes
            if (selectedColumnFilters.cliente.length > 0) {
              const cliente = ordem.cliente || ordem.TB01008_NOME;
              if (!selectedColumnFilters.cliente.includes(cliente)) {
                return;
              }
            }
            
            // Se há filtro de SLA aplicado, considerar apenas esses SLAs
            if (selectedColumnFilters.sla.length > 0) {
              const calcRestante = ordem.CALC_RESTANTE || 0;
              const sla = getSLAFromCalcRestante(calcRestante);
              if (!selectedColumnFilters.sla.includes(sla)) {
                return;
              }
            }
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const equipamento = ordem.equipamento || ordem.TB01010_RESUMIDO || ordem.TB01010_NOME || '';
            if (equipamento) {
              equipamentoData[equipamento] = (equipamentoData[equipamento] || 0) + 1;
            }
          });
        }
      });
    }
    
    return Object.keys(equipamentoData)
      .map(equipamento => ({ equipamento, count: equipamentoData[equipamento] }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count); // Ordenar por quantidade decrescente
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.sla, selectedColumnFilters.status]);

  // Componente dropdown de opções de filtro
  const FilterOptionsDropdown = ({ onSelectFilter, onClose }) => {
    const totalCidades = citiesWithCounts.length;
    const totalBairros = bairrosWithCounts.length;
    const totalClientes = clientesWithCounts.length;
    const totalTiposOS = tiposOSWithCounts.length;
    const totalSLAs = slasWithCounts.length;
    const totalEquipamentos = equipamentosWithCounts.length;
    const totalStatus = statusWithCounts.length;
    
    const filterOptions = [
      { 
        key: 'cidade', 
        label: 'Cidade', 
        icon: 'geo-alt',
        count: selectedColumnFilters.cidade.length,
        available: totalCidades,
        description: `Filtrar por localização (${totalCidades} disponíveis)`
      },
      { 
        key: 'bairro', 
        label: 'Bairro', 
        icon: 'map',
        count: selectedColumnFilters.bairro.length,
        available: totalBairros,
        description: `Filtrar por bairro (${totalBairros} disponíveis)`
      },
      { 
        key: 'cliente', 
        label: 'Cliente', 
        icon: 'person',
        count: selectedColumnFilters.cliente.length,
        available: totalClientes,
        description: `Filtrar por cliente (${totalClientes} disponíveis)`
      },
      { 
        key: 'tipoOS', 
        label: 'Tipo de OS', 
        icon: 'wrench',
        count: selectedColumnFilters.tipoOS.length,
        available: totalTiposOS,
        description: `Filtrar por tipo de OS (${totalTiposOS} disponíveis)`
      },
      { 
        key: 'sla', 
        label: 'SLA', 
        icon: 'stopwatch',
        count: selectedColumnFilters.sla.length,
        available: totalSLAs,
        description: `Filtrar por SLA (${totalSLAs} disponíveis)`
      },
      { 
        key: 'equipamento', 
        label: 'Equipamento', 
        icon: 'printer',
        count: selectedColumnFilters.equipamento.length,
        available: totalEquipamentos,
        description: `Filtrar por equipamento (${totalEquipamentos} disponíveis)`
      },
      { 
        key: 'status', 
        label: 'Status', 
        icon: 'signpost-split',
        count: selectedColumnFilters.status.length,
        available: totalStatus,
        description: `Filtrar por status (${totalStatus} disponíveis)`
      }
    ];

    return (
      <div className="filter-options-dropdown" onClick={(e) => e.stopPropagation()}>
        {filterOptions.map(option => (
          <button
            key={option.key}
            className="filter-option-item"
            onClick={() => {
              onSelectFilter(option.key);
              onClose();
            }}
          >
            <div className="filter-option-info">
              <span className="filter-option-label">
                {option.icon && <i className={`bi bi-${option.icon}`}></i>}
                {option.label}
              </span>
              <span className="filter-option-desc">{option.description}</span>
            </div>
            {option.count > 0 && (
              <span className="filter-option-badge">{option.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  // Componente de filtro da coluna Em Aberto
  const ColumnFilterModal = ({ filterType, onClose, onBack }) => {
    const [tempFilters, setTempFilters] = useState({ ...selectedColumnFilters });
    const [searchTerm, setSearchTerm] = useState('');

    const availableCities = React.useMemo(() => {
      return citiesWithCounts.map(item => item.cidade);
    }, [citiesWithCounts]);

    const availableBairros = React.useMemo(() => {
      return bairrosWithCounts.map(item => item.bairro);
    }, [bairrosWithCounts]);

    const availableClientes = React.useMemo(() => {
      return clientesWithCounts.map(item => item.cliente);
    }, [clientesWithCounts]);

    const availableSLAs = React.useMemo(() => {
      return slasWithCounts.map(item => item.sla);
    }, [slasWithCounts]);

    const availableEquipamentos = React.useMemo(() => {
      return equipamentosWithCounts.map(item => item.equipamento);
    }, [equipamentosWithCounts]);

    const availableStatus = React.useMemo(() => {
      return statusWithCounts.map(item => item.status);
    }, [statusWithCounts]);

    const filteredCities = React.useMemo(() => {
      if (!searchTerm) return availableCities;
      return availableCities.filter(cidade => 
        cidade.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [availableCities, searchTerm]);

    const filteredBairros = React.useMemo(() => {
      if (!searchTerm) return availableBairros;
      return availableBairros.filter(bairro => 
        bairro.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [availableBairros, searchTerm]);

    const filteredClientes = React.useMemo(() => {
      if (!searchTerm) return availableClientes;
      return availableClientes.filter(cliente => 
        cliente.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [availableClientes, searchTerm]);

    const filteredEquipamentos = React.useMemo(() => {
      if (!searchTerm) return equipamentosWithCounts;
      return equipamentosWithCounts.filter(item => 
        item.equipamento.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [equipamentosWithCounts, searchTerm]);

    const filteredStatus = React.useMemo(() => {
      if (!searchTerm) return statusWithCounts;
      return statusWithCounts.filter(item => 
        item.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [statusWithCounts, searchTerm]);

    const getCityOrderCount = (cidade) => {
      const cityInfo = citiesWithCounts.find(item => item.cidade === cidade);
      return cityInfo ? cityInfo.count : 0;
    };

    const getBairroOrderCount = (bairro) => {
      const bairroInfo = bairrosWithCounts.find(item => item.bairro === bairro);
      return bairroInfo ? bairroInfo.count : 0;
    };

    const getClienteOrderCount = (cliente) => {
      const clienteInfo = clientesWithCounts.find(item => item.cliente === cliente);
      return clienteInfo ? clienteInfo.count : 0;
    };

    const getTipoOSOrderCount = (tipo) => {
      const tipoInfo = tiposOSWithCounts.find(item => item.tipo === tipo);
      return tipoInfo ? tipoInfo.count : 0;
    };

    const getSLAOrderCount = (sla) => {
      const slaInfo = slasWithCounts.find(item => item.sla === sla);
      return slaInfo ? slaInfo.count : 0;
    };

    const getEquipamentoOrderCount = (equipamento) => {
      const equipamentoInfo = equipamentosWithCounts.find(item => item.equipamento === equipamento);
      return equipamentoInfo ? equipamentoInfo.count : 0;
    };

    const getStatusOrderCount = (status) => {
      const statusInfo = statusWithCounts.find(item => item.status === status);
      return statusInfo ? statusInfo.count : 0;
    };

    const toggleCityFilter = (cidade) => {
      const newCidades = tempFilters.cidade.includes(cidade)
        ? tempFilters.cidade.filter(c => c !== cidade)
        : [...tempFilters.cidade, cidade];
      
      setTempFilters({
        ...tempFilters,
        cidade: newCidades
      });
    };

    const toggleBairroFilter = (bairro) => {
      const newBairros = tempFilters.bairro.includes(bairro)
        ? tempFilters.bairro.filter(b => b !== bairro)
        : [...tempFilters.bairro, bairro];
      
      setTempFilters({
        ...tempFilters,
        bairro: newBairros
      });
    };

    const toggleClienteFilter = (cliente) => {
      const newClientes = tempFilters.cliente.includes(cliente)
        ? tempFilters.cliente.filter(c => c !== cliente)
        : [...tempFilters.cliente, cliente];
      
      setTempFilters({
        ...tempFilters,
        cliente: newClientes
      });
    };

    const toggleTipoOSFilter = (tipo) => {
      const newTiposOS = tempFilters.tipoOS.includes(tipo)
        ? tempFilters.tipoOS.filter(t => t !== tipo)
        : [...tempFilters.tipoOS, tipo];
      
      setTempFilters({
        ...tempFilters,
        tipoOS: newTiposOS
      });
    };

    const toggleSLAFilter = (sla) => {
      const newSLAs = tempFilters.sla.includes(sla)
        ? tempFilters.sla.filter(s => s !== sla)
        : [...tempFilters.sla, sla];
      
      setTempFilters({
        ...tempFilters,
        sla: newSLAs
      });
    };

    const toggleEquipamentoFilter = (equipamento) => {
      const newEquipamentos = tempFilters.equipamento.includes(equipamento)
        ? tempFilters.equipamento.filter(e => e !== equipamento)
        : [...tempFilters.equipamento, equipamento];
      
      setTempFilters({
        ...tempFilters,
        equipamento: newEquipamentos
      });
    };

    const toggleStatusFilter = (status) => {
      const newStatus = tempFilters.status.includes(status)
        ? tempFilters.status.filter(s => s !== status)
        : [...tempFilters.status, status];
      
      setTempFilters({
        ...tempFilters,
        status: newStatus
      });
    };

    const applyFilters = () => {
      setSelectedColumnFilters(tempFilters);
      onClose();
    };

    const clearFilters = () => {
      if (filterType === 'cidade') {
        setTempFilters({ ...tempFilters, cidade: [] });
      } else if (filterType === 'bairro') {
        setTempFilters({ ...tempFilters, bairro: [] });
      } else if (filterType === 'cliente') {
        setTempFilters({ ...tempFilters, cliente: [] });
      } else if (filterType === 'tipoOS') {
        setTempFilters({ ...tempFilters, tipoOS: [] });
      } else if (filterType === 'sla') {
        setTempFilters({ ...tempFilters, sla: [] });
      } else if (filterType === 'equipamento') {
        setTempFilters({ ...tempFilters, equipamento: [] });
      } else if (filterType === 'status') {
        setTempFilters({ ...tempFilters, status: [] });
      }
      setSearchTerm(''); // Limpar busca para mostrar todos os itens
    };

    const selectAll = () => {
      if (filterType === 'cidade') {
        setTempFilters({
          ...tempFilters,
          cidade: [...filteredCities]
        });
      } else if (filterType === 'bairro') {
        setTempFilters({
          ...tempFilters,
          bairro: [...filteredBairros]
        });
      } else if (filterType === 'cliente') {
        setTempFilters({
          ...tempFilters,
          cliente: [...filteredClientes]
        });
      } else if (filterType === 'tipoOS') {
        const allTipos = tiposOSWithCounts.map(item => item.tipo);
        setTempFilters({
          ...tempFilters,
          tipoOS: [...allTipos]
        });
      } else if (filterType === 'sla') {
        const allSLAs = slasWithCounts.map(item => item.sla);
        setTempFilters({
          ...tempFilters,
          sla: [...allSLAs]
        });
      } else if (filterType === 'equipamento') {
        setTempFilters({
          ...tempFilters,
          equipamento: [...filteredEquipamentos.map(item => item.equipamento)]
        });
      } else if (filterType === 'status') {
        const allStatus = statusWithCounts.map(item => item.status);
        setTempFilters({
          ...tempFilters,
          status: [...allStatus]
        });
      }
    };

    const getFilterTitle = () => {
      switch(filterType) {
        case 'cidade': return 'Filtrar por Cidade';
        case 'bairro': return 'Filtrar por Bairro';
        case 'cliente': return 'Filtrar por Cliente';
        case 'tipoOS': return 'Filtrar por Tipo de OS';
        case 'sla': return 'Filtrar por SLA';
        case 'equipamento': return 'Filtrar por Equipamento';
        case 'status': return 'Filtrar por Status';
        default: return 'Filtro';
      }
    };

    const handleBack = () => {
      setShowColumnFilter(false);
      setShowFilterOptions(true);
    };

    const hasActiveFilters = () => {
      return selectedColumnFilters.cidade.length > 0 || selectedColumnFilters.bairro.length > 0 || selectedColumnFilters.cliente.length > 0 || selectedColumnFilters.tipoOS.length > 0 || selectedColumnFilters.sla.length > 0 || selectedColumnFilters.equipamento.length > 0 || selectedColumnFilters.status.length > 0;
    };

    const getFilterInfoMessage = () => {
      if (filterType === 'cidade') {
        const otherFilters = [];
        if (selectedColumnFilters.bairro.length > 0) {
          otherFilters.push(`${selectedColumnFilters.bairro.length} bairro(s)`);
        }
        if (selectedColumnFilters.cliente.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cliente.length} cliente(s)`);
        }
        if (selectedColumnFilters.tipoOS.length > 0) {
          otherFilters.push(`${selectedColumnFilters.tipoOS.length} tipo(s) de OS`);
        }
        if (selectedColumnFilters.sla.length > 0) {
          otherFilters.push(`${selectedColumnFilters.sla.length} SLA(s)`);
        }
        if (selectedColumnFilters.equipamento.length > 0) {
          otherFilters.push(`${selectedColumnFilters.equipamento.length} equipamento(s)`);
        }
        if (selectedColumnFilters.status.length > 0) {
          otherFilters.push(`${selectedColumnFilters.status.length} status`);
        }
        if (otherFilters.length > 0) {
          return `Exibindo apenas cidades dos ${otherFilters.join(' e ')} selecionado(s)`;
        }
      } else if (filterType === 'bairro') {
        const otherFilters = [];
        if (selectedColumnFilters.cidade.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cidade.length} cidade(s)`);
        }
        if (selectedColumnFilters.cliente.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cliente.length} cliente(s)`);
        }
        if (selectedColumnFilters.tipoOS.length > 0) {
          otherFilters.push(`${selectedColumnFilters.tipoOS.length} tipo(s) de OS`);
        }
        if (selectedColumnFilters.sla.length > 0) {
          otherFilters.push(`${selectedColumnFilters.sla.length} SLA(s)`);
        }
        if (selectedColumnFilters.equipamento.length > 0) {
          otherFilters.push(`${selectedColumnFilters.equipamento.length} equipamento(s)`);
        }
        if (selectedColumnFilters.status.length > 0) {
          otherFilters.push(`${selectedColumnFilters.status.length} status`);
        }
        if (otherFilters.length > 0) {
          return `Exibindo apenas bairros das ${otherFilters.join(' e ')} selecionado(s)`;
        }
      } else if (filterType === 'cliente') {
        const otherFilters = [];
        if (selectedColumnFilters.cidade.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cidade.length} cidade(s)`);
        }
        if (selectedColumnFilters.bairro.length > 0) {
          otherFilters.push(`${selectedColumnFilters.bairro.length} bairro(s)`);
        }
        if (selectedColumnFilters.tipoOS.length > 0) {
          otherFilters.push(`${selectedColumnFilters.tipoOS.length} tipo(s) de OS`);
        }
        if (selectedColumnFilters.sla.length > 0) {
          otherFilters.push(`${selectedColumnFilters.sla.length} SLA(s)`);
        }
        if (selectedColumnFilters.equipamento.length > 0) {
          otherFilters.push(`${selectedColumnFilters.equipamento.length} equipamento(s)`);
        }
        if (selectedColumnFilters.status.length > 0) {
          otherFilters.push(`${selectedColumnFilters.status.length} status`);
        }
        if (otherFilters.length > 0) {
          return `Exibindo apenas clientes das ${otherFilters.join(' e ')} selecionado(s)`;
        }
      } else if (filterType === 'tipoOS') {
        const otherFilters = [];
        if (selectedColumnFilters.cidade.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cidade.length} cidade(s)`);
        }
        if (selectedColumnFilters.bairro.length > 0) {
          otherFilters.push(`${selectedColumnFilters.bairro.length} bairro(s)`);
        }
        if (selectedColumnFilters.cliente.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cliente.length} cliente(s)`);
        }
        if (selectedColumnFilters.sla.length > 0) {
          otherFilters.push(`${selectedColumnFilters.sla.length} SLA(s)`);
        }
        if (selectedColumnFilters.equipamento.length > 0) {
          otherFilters.push(`${selectedColumnFilters.equipamento.length} equipamento(s)`);
        }
        if (selectedColumnFilters.status.length > 0) {
          otherFilters.push(`${selectedColumnFilters.status.length} status`);
        }
        if (otherFilters.length > 0) {
          return `Exibindo apenas tipos de OS das ${otherFilters.join(' e ')} selecionado(s)`;
        }
      } else if (filterType === 'equipamento') {
        const otherFilters = [];
        if (selectedColumnFilters.cidade.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cidade.length} cidade(s)`);
        }
        if (selectedColumnFilters.bairro.length > 0) {
          otherFilters.push(`${selectedColumnFilters.bairro.length} bairro(s)`);
        }
        if (selectedColumnFilters.cliente.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cliente.length} cliente(s)`);
        }
        if (selectedColumnFilters.tipoOS.length > 0) {
          otherFilters.push(`${selectedColumnFilters.tipoOS.length} tipo(s) de OS`);
        }
        if (selectedColumnFilters.sla.length > 0) {
          otherFilters.push(`${selectedColumnFilters.sla.length} SLA(s)`);
        }
        if (selectedColumnFilters.status.length > 0) {
          otherFilters.push(`${selectedColumnFilters.status.length} status`);
        }
        if (otherFilters.length > 0) {
          return `Exibindo apenas equipamentos dos ${otherFilters.join(' e ')} selecionado(s)`;
        }
      } else if (filterType === 'sla') {
        const otherFilters = [];
        if (selectedColumnFilters.cidade.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cidade.length} cidade(s)`);
        }
        if (selectedColumnFilters.bairro.length > 0) {
          otherFilters.push(`${selectedColumnFilters.bairro.length} bairro(s)`);
        }
        if (selectedColumnFilters.cliente.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cliente.length} cliente(s)`);
        }
        if (selectedColumnFilters.tipoOS.length > 0) {
          otherFilters.push(`${selectedColumnFilters.tipoOS.length} tipo(s) de OS`);
        }
        if (selectedColumnFilters.equipamento.length > 0) {
          otherFilters.push(`${selectedColumnFilters.equipamento.length} equipamento(s)`);
        }
        if (selectedColumnFilters.status.length > 0) {
          otherFilters.push(`${selectedColumnFilters.status.length} status`);
        }
        if (otherFilters.length > 0) {
          return `Exibindo apenas SLAs dos ${otherFilters.join(' e ')} selecionado(s)`;
        }
      } else if (filterType === 'status') {
        const otherFilters = [];
        if (selectedColumnFilters.cidade.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cidade.length} cidade(s)`);
        }
        if (selectedColumnFilters.bairro.length > 0) {
          otherFilters.push(`${selectedColumnFilters.bairro.length} bairro(s)`);
        }
        if (selectedColumnFilters.cliente.length > 0) {
          otherFilters.push(`${selectedColumnFilters.cliente.length} cliente(s)`);
        }
        if (selectedColumnFilters.tipoOS.length > 0) {
          otherFilters.push(`${selectedColumnFilters.tipoOS.length} tipo(s) de OS`);
        }
        if (selectedColumnFilters.sla.length > 0) {
          otherFilters.push(`${selectedColumnFilters.sla.length} SLA(s)`);
        }
        if (selectedColumnFilters.equipamento.length > 0) {
          otherFilters.push(`${selectedColumnFilters.equipamento.length} equipamento(s)`);
        }
        if (otherFilters.length > 0) {
          return `Exibindo apenas status dos ${otherFilters.join(' e ')} selecionado(s)`;
        }
      }
      return null;
    };

    return (
      <div className={`column-filter-modal ${filterType === 'cliente' || filterType === 'equipamento' ? 'column-filter-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="column-filter-header">
          <div className="column-filter-header-left">
            <button className="column-filter-back" onClick={handleBack}>
              <i className="bi bi-arrow-left"></i>
            </button>
            <span className="column-filter-title">{getFilterTitle()}</span>
          </div>
          <button className="column-filter-close" onClick={onClose}>×</button>
        </div>
        
        {filterType === 'cidade' && (
          <>
            <div className="column-filter-search-section">
              {getFilterInfoMessage() && (
                <div className="column-filter-info-message">
                  <i className="bi bi-info-circle"></i>
                  {getFilterInfoMessage()}
                </div>
              )}
              <input
                type="text"
                placeholder={`Buscar cidade... (${filteredCities.length} disponíveis)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="column-filter-search-input"
                autoFocus
              />
            </div>

            <div className="column-filter-content">
              <div className="column-filter-options">
                {filteredCities.length > 0 ? (
                  filteredCities.map(cidade => (
                    <label key={cidade} className="column-filter-option">
                      <input
                        type="checkbox"
                        checked={tempFilters.cidade.includes(cidade)}
                        onChange={() => toggleCityFilter(cidade)}
                      />
                      <span className="column-filter-option-content">
                        <span className="column-filter-option-text">{cidade}</span>
                        <span className="column-filter-option-count">{getCityOrderCount(cidade)}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="column-filter-no-results">
                    Nenhuma cidade encontrada para "{searchTerm}"
                  </div>
                )}
              </div>
            </div>

            <div className="column-filter-actions">
              <button className="column-filter-clear" onClick={clearFilters}>
                Limpar
              </button>
              {filteredCities.length > 1 && (
                <button className="column-filter-select-all" onClick={selectAll}>
                  Selecionar Todas
                </button>
              )}
              <button className="column-filter-apply" onClick={applyFilters}>
                Aplicar ({tempFilters.cidade.length})
              </button>
            </div>
          </>
        )}

        {filterType === 'bairro' && (
          <>
            <div className="column-filter-search-section">
              {getFilterInfoMessage() && (
                <div className="column-filter-info-message">
                  <i className="bi bi-info-circle"></i>
                  {getFilterInfoMessage()}
                </div>
              )}
              <input
                type="text"
                placeholder={`Buscar bairro... (${filteredBairros.length} disponíveis)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="column-filter-search-input"
                autoFocus
              />
            </div>

            <div className="column-filter-content">
              <div className="column-filter-options">
                {filteredBairros.length > 0 ? (
                  filteredBairros.map(bairro => (
                    <label key={bairro} className="column-filter-option">
                      <input
                        type="checkbox"
                        checked={tempFilters.bairro.includes(bairro)}
                        onChange={() => toggleBairroFilter(bairro)}
                      />
                      <span className="column-filter-option-content">
                        <span className="column-filter-option-text">{bairro}</span>
                        <span className="column-filter-option-count">{getBairroOrderCount(bairro)}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="column-filter-no-results">
                    Nenhum bairro encontrado para "{searchTerm}"
                  </div>
                )}
              </div>
            </div>

            <div className="column-filter-actions">
              <button className="column-filter-clear" onClick={clearFilters}>
                Limpar
              </button>
              {filteredBairros.length > 1 && (
                <button className="column-filter-select-all" onClick={selectAll}>
                  Selecionar Todos
                </button>
              )}
              <button className="column-filter-apply" onClick={applyFilters}>
                Aplicar ({tempFilters.bairro.length})
              </button>
            </div>
          </>
        )}

        {filterType === 'cliente' && (
          <>
            <div className="column-filter-search-section">
              {getFilterInfoMessage() && (
                <div className="column-filter-info-message">
                  <i className="bi bi-info-circle"></i>
                  {getFilterInfoMessage()}
                </div>
              )}
              <input
                type="text"
                placeholder={`Buscar cliente... (${filteredClientes.length} disponíveis)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="column-filter-search-input"
                autoFocus
              />
            </div>

            <div className="column-filter-content">
              <div className="column-filter-options">
                {filteredClientes.length > 0 ? (
                  filteredClientes.map(cliente => (
                    <label key={cliente} className="column-filter-option">
                      <input
                        type="checkbox"
                        checked={tempFilters.cliente.includes(cliente)}
                        onChange={() => toggleClienteFilter(cliente)}
                      />
                      <span className="column-filter-option-content">
                        <span className="column-filter-option-text">{cliente}</span>
                        <span className="column-filter-option-count">{getClienteOrderCount(cliente)}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="column-filter-no-results">
                    Nenhum cliente encontrado para "{searchTerm}"
                  </div>
                )}
              </div>
            </div>

            <div className="column-filter-actions">
              <button className="column-filter-clear" onClick={clearFilters}>
                Limpar
              </button>
              {filteredClientes.length > 1 && (
                <button className="column-filter-select-all" onClick={selectAll}>
                  Selecionar Todos
                </button>
              )}
              <button className="column-filter-apply" onClick={applyFilters}>
                Aplicar ({tempFilters.cliente.length})
              </button>
            </div>
          </>
        )}

        {filterType === 'tipoOS' && (
          <>
            <div className="column-filter-search-section">
              {getFilterInfoMessage() && (
                <div className="column-filter-info-message">
                  <i className="bi bi-info-circle"></i>
                  {getFilterInfoMessage()}
                </div>
              )}
              <div className="column-filter-info-message">
                <i className="bi bi-info-circle"></i>
                Tipos de OS disponíveis ({tiposOSWithCounts.length} tipos)
              </div>
            </div>
            
            <div className="column-filter-content">
              <div className="column-filter-options">
                {tiposOSWithCounts.length > 0 ? (
                  tiposOSWithCounts.map(item => {
                    // Mapear as iniciais para nomes completos
                    const tipoNames = {
                      'C': 'Corretiva',
                      'I': 'Instalação', 
                      'D': 'Desinstalação',
                      'E': 'Estoque',
                      'S': 'Preventiva',
                      'B': 'Balcão',
                      'R': 'Retorno/Recarga',
                      'A': 'Aferição'
                    };
                    
                    const displayName = tipoNames[item.tipo] || item.tipo;
                    
                    return (
                      <label key={item.tipo} className="column-filter-option">
                        <input
                          type="checkbox"
                          checked={tempFilters.tipoOS.includes(item.tipo)}
                          onChange={() => toggleTipoOSFilter(item.tipo)}
                        />
                        <span className="column-filter-option-content">
                          <span className="column-filter-option-text">{displayName}</span>
                          <span className="column-filter-option-count">{item.count}</span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="column-filter-no-results">
                    Nenhum tipo de OS encontrado
                  </div>
                )}
              </div>
            </div>

            <div className="column-filter-actions">
              <button className="column-filter-clear" onClick={clearFilters}>
                Limpar
              </button>
              {tiposOSWithCounts.length > 1 && (
                <button className="column-filter-select-all" onClick={selectAll}>
                  Selecionar Todos
                </button>
              )}
              <button className="column-filter-apply" onClick={applyFilters}>
                Aplicar ({tempFilters.tipoOS.length})
              </button>
            </div>
          </>
        )}

        {filterType === 'sla' && (
          <>
            <div className="column-filter-search-section">
              {getFilterInfoMessage() && (
                <div className="column-filter-info-message">
                  <i className="bi bi-info-circle"></i>
                  {getFilterInfoMessage()}
                </div>
              )}
              <div className="column-filter-info-message">
                <i className="bi bi-info-circle"></i>
                SLAs disponíveis ({slasWithCounts.length} tipos)
              </div>
            </div>
            
            <div className="column-filter-content">
              <div className="column-filter-options">
                {slasWithCounts.length > 0 ? (
                  slasWithCounts.map(item => {
                    // Mapear SLAs para nomes amigáveis
                    const slaNames = {
                      'vencido': 'Vencido',
                      'vencendo': 'À vencer', 
                      'ok': 'Futuro'
                    };
                    
                    const displayName = slaNames[item.sla] || item.sla;
                    
                    return (
                      <label key={item.sla} className="column-filter-option">
                        <input
                          type="checkbox"
                          checked={tempFilters.sla.includes(item.sla)}
                          onChange={() => toggleSLAFilter(item.sla)}
                        />
                        <span className="column-filter-option-content">
                          <span className="column-filter-option-text">{displayName}</span>
                          <span className="column-filter-option-count">{item.count}</span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="column-filter-no-results">
                    Nenhum SLA encontrado
                  </div>
                )}
              </div>
            </div>

            <div className="column-filter-actions">
              <button className="column-filter-clear" onClick={clearFilters}>
                Limpar
              </button>
              {slasWithCounts.length > 1 && (
                <button className="column-filter-select-all" onClick={selectAll}>
                  Selecionar Todos
                </button>
              )}
              <button className="column-filter-apply" onClick={applyFilters}>
                Aplicar ({tempFilters.sla.length})
              </button>
            </div>
          </>
        )}

        {filterType === 'equipamento' && (
          <>
            <div className="column-filter-search-section">
              {getFilterInfoMessage() && (
                <div className="column-filter-info-message">
                  <i className="bi bi-info-circle"></i>
                  {getFilterInfoMessage()}
                </div>
              )}
              <input
                type="text"
                placeholder={`Buscar equipamento... (${filteredEquipamentos.length} disponíveis)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="column-filter-search-input"
                autoFocus
              />
            </div>

            <div className="column-filter-content">
              <div className="column-filter-options">
                {filteredEquipamentos.length > 0 ? (
                  filteredEquipamentos.map(item => (
                    <label key={item.equipamento} className="column-filter-option">
                      <input
                        type="checkbox"
                        checked={tempFilters.equipamento.includes(item.equipamento)}
                        onChange={() => toggleEquipamentoFilter(item.equipamento)}
                      />
                      <span className="column-filter-option-content">
                        <span className="column-filter-option-text">{item.equipamento}</span>
                        <span className="column-filter-option-count">{getEquipamentoOrderCount(item.equipamento)}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="column-filter-no-results">
                    {searchTerm ? `Nenhum equipamento encontrado para "${searchTerm}"` : 'Nenhum equipamento encontrado'}
                  </div>
                )}
              </div>
            </div>

            <div className="column-filter-actions">
              <button className="column-filter-clear" onClick={clearFilters}>
                Limpar
              </button>
              {filteredEquipamentos.length > 1 && (
                <button className="column-filter-select-all" onClick={selectAll}>
                  Selecionar Todos
                </button>
              )}
              <button className="column-filter-apply" onClick={applyFilters}>
                Aplicar ({tempFilters.equipamento.length})
              </button>
            </div>
          </>
        )}

        {filterType === 'status' && (
          <>
            <div className="column-filter-search-section">
              {getFilterInfoMessage() && (
                <div className="column-filter-info-message">
                  <i className="bi bi-info-circle"></i>
                  {getFilterInfoMessage()}
                </div>
              )}
              <input
                type="text"
                placeholder={`Buscar status... (${filteredStatus.length} disponíveis)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="column-filter-search-input"
                autoFocus
              />
            </div>

            <div className="column-filter-content">
              <div className="column-filter-options">
                {filteredStatus.length > 0 ? (
                  filteredStatus.map(item => (
                    <label key={item.status} className="column-filter-option">
                      <input
                        type="checkbox"
                        checked={tempFilters.status.includes(item.status)}
                        onChange={() => toggleStatusFilter(item.status)}
                      />
                      <span className="column-filter-option-content">
                        <span className="column-filter-option-text">{item.status}</span>
                        <span className="column-filter-option-count">{getStatusOrderCount(item.status)}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="column-filter-no-results">
                    {searchTerm ? `Nenhum status encontrado para "${searchTerm}"` : 'Nenhum status encontrado'}
                  </div>
                )}
              </div>
            </div>

            <div className="column-filter-actions">
              <button className="column-filter-clear" onClick={clearFilters}>
                Limpar
              </button>
              {filteredStatus.length > 1 && (
                <button className="column-filter-select-all" onClick={selectAll}>
                  Selecionar Todos
                </button>
              )}
              <button className="column-filter-apply" onClick={applyFilters}>
                Aplicar ({tempFilters.status.length})
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Modal de detalhes da ordem de serviço
  const OrderDetailsModal = ({ order, onClose }) => {
    const [showDefeitoDetails, setShowDefeitoDetails] = React.useState(false);
    const [defeitoData, setDefeitoData] = React.useState(null);
    const [loadingDefeito, setLoadingDefeito] = React.useState(false);
    const [defeitoError, setDefeitoError] = React.useState(null);

    if (!order) return null;

    // Debug temporário: verificar dados recebidos
    console.log('🔍 Debug - Dados da ordem no modal:', order);
    console.log('🔍 Debug - Campos específicos:', {
      dataAbertura: order.dataAbertura,
      contrato: order.contrato,
      numeroSerie: order.numeroSerie,
      patrimonio: order.patrimonio,
      motivoOS: order.motivoOS,
      solicitante: order.solicitante,
      endereco: order.endereco,
      previsao: order.previsao,
      pedidoVinculado: order.pedidoVinculado
    });
    
    // Debug: verificar TODAS as propriedades do objeto order
    console.log('🔍 Debug - TODAS as propriedades do objeto order:');
    Object.keys(order).forEach(key => {
      console.log(`${key}:`, order[key]);
    });

    // Dados de teste apenas para reincidência (campo não disponível no banco)
    const testData = {
      reincidencia: Math.random() > 0.7 ? 'Sim' : 'Não'
    };

    // Função para buscar detalhes do defeito
    const fetchDefeitoDetails = async () => {
      if (defeitoData) return; // Já carregado
      
      setLoadingDefeito(true);
      setDefeitoError(null);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${order.id}/defeito`);
        const result = await response.json();
        
        if (result.success) {
          setDefeitoData(result.data);
        } else {
          setDefeitoError(result.message);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar detalhes do defeito:', error);
        setDefeitoError('Erro ao conectar com o servidor');
      } finally {
        setLoadingDefeito(false);
      }
    };

    // Função para alternar exibição dos detalhes do defeito
    const toggleDefeitoDetails = () => {
      if (!showDefeitoDetails) {
        fetchDefeitoDetails();
      }
      setShowDefeitoDetails(!showDefeitoDetails);
    };

    const getServiceTypeName = (tipo) => {
      const types = {
        'E': 'Estoque',
        'B': 'Balcão',
        'A': 'Aferição',
        'R': 'Retorno/Recarga',
        'D': 'Desinstalação',
        'I': 'Instalação',
        'S': 'Preventiva',
        'N': 'Corretiva',
        'C': 'Corretiva'
      };
      return types[tipo] || 'Corretiva';
    };

    const getSLAStatus = (sla) => {
      const status = {
        'vencido': { text: 'Vencido', color: '#ef5350' },
        'vencendo': { text: 'Vencendo', color: '#ff9800' },
        'ok': { text: 'No Prazo', color: '#4caf50' }
      };
      return status[sla] || { text: 'No Prazo', color: '#4caf50' };
    };

    const slaInfo = getSLAStatus(order.sla);

    const openGoogleMaps = () => {
      const endereco = order.endereco || 'Endereço não informado';
      
      // Verificar se há endereço válido
      if (!endereco || endereco === 'Endereço não informado' || endereco.trim() === '') {
        alert('Endereço não disponível para visualização no mapa.');
        return;
      }
      
      // Construir endereço completo se houver cidade e estado disponíveis
      let enderecoCompleto = endereco;
      
      // Adicionar cidade e estado se disponíveis nos dados da ordem
      const cidade = order.TB02115_CIDADE || order.cidade;
      const estado = order.TB02115_ESTADO;
      
      if (cidade && !enderecoCompleto.toLowerCase().includes(cidade.toLowerCase())) {
        enderecoCompleto += `, ${cidade}`;
      }
      
      if (estado && !enderecoCompleto.toLowerCase().includes(estado.toLowerCase())) {
        enderecoCompleto += `, ${estado}`;
      }
      
      // Adicionar Brasil se não estiver presente
      if (!enderecoCompleto.toLowerCase().includes('brasil') && !enderecoCompleto.toLowerCase().includes('brazil')) {
        enderecoCompleto += ', Brasil';
      }
      
      console.log('🗺️ Abrindo Google Street View para:', enderecoCompleto);
      
      // Codificar endereço para URL
      const encodedAddress = encodeURIComponent(enderecoCompleto);
      
      // URL do Google Maps normal
      const mapsUrl = `https://www.google.com/maps/search/${encodedAddress}/@?entry=ttu`;
      
      console.log('🗺️ Abrindo Google Maps para:', enderecoCompleto);
      
      // Abrir Google Maps
      try {
        const mapsWindow = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        
        if (!mapsWindow || mapsWindow.closed) {
          console.error('❌ Não foi possível abrir o Google Maps');
          alert('Não foi possível abrir o Google Maps. Verifique se o bloqueador de popup está desabilitado.');
        } else {
          console.log('✅ Google Maps aberto com sucesso');
        }
      } catch (error) {
        console.error('❌ Erro ao abrir Google Maps:', error);
        alert('Erro ao abrir o Google Maps. Tente novamente.');
      }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="order-details-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="order-details-header">
            <div className="order-details-title-section">
              <div className="order-details-title-row">
                <h2 className="order-details-title">OS {order.id}</h2>
                <div className="order-details-tags">
                  <span className="order-tag order-tag-tipo">
                    <span className="order-tag-label">Tipo:</span> {getServiceTypeName(order.tipo)}
                  </span>
                  <span className={`order-tag order-tag-sla ${order.sla === 'vencido' ? 'order-tag-sla-vencido' : ''}`}>
                    <span className="order-tag-label">SLA:</span> {slaInfo.text}
                  </span>
                  {testData.reincidencia === 'Sim' && (
                    <span className="order-tag order-tag-reincidencia">
                      <span className="order-tag-label">Reincidência:</span> Sim
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="order-details-content">
            <div className="order-details-columns">
              {/* Coluna Esquerda */}
              <div className="order-details-column-left">
                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Data de abertura:</span>
                  <span className="order-detail-value">{order.dataAbertura || 'Não informado'}</span>
                </div>

                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Cliente:</span>
                  <span className="order-detail-value order-detail-cliente">{order.cliente}</span>
                </div>

                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Contrato:</span>
                  <span className="order-detail-value">{order.contrato || 'Não informado'}</span>
                </div>

                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Equipamento:</span>
                  <span className="order-detail-value">{order.equipamento}</span>
                </div>

                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Número de série:</span>
                  <span className="order-detail-value">{order.numeroSerie || 'Não informado'}</span>
                </div>

                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Patrimônio:</span>
                  <span className="order-detail-value">{order.patrimonio || 'Não informado'}</span>
                </div>

                <div className="order-detail-item">
                  <span className="order-detail-label">Motivo da OS:</span>
                  <div className="order-detail-with-action">
                    <span className="order-detail-value">{order.motivoOS || 'Não informado'}</span>
              <button 
                      className="order-detail-defeito-btn"
                      onClick={toggleDefeitoDetails}
                      title={showDefeitoDetails ? "Ocultar detalhes do defeito" : "Ver detalhes do defeito"}
                    >
                      <i className={`bi ${showDefeitoDetails ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                      {showDefeitoDetails ? 'Ocultar defeito' : 'Ver defeito'}
              </button>
                  </div>
            </div>

                {/* Seção expandível dos detalhes do defeito */}
                {showDefeitoDetails && (
                  <div className="order-detail-defeito-section">
                    {loadingDefeito && (
                      <div className="defeito-loading">
                        <i className="bi bi-clock-history"></i> Carregando detalhes do defeito...
                      </div>
                    )}
                    
                    {defeitoError && (
                      <div className="defeito-error">
                        <i className="bi bi-exclamation-triangle"></i> {defeitoError}
                      </div>
                    )}
                    
                    {defeitoData && !loadingDefeito && !defeitoError && (
                      <div className="defeito-table-container">
                        <table className="defeito-table">
                          <thead>
                            <tr>
                              <th>Defeito</th>
                              <th>Observação</th>
                              <th>Solução</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{defeitoData.defeito}</td>
                              <td>{defeitoData.observacao}</td>
                              <td>{defeitoData.solucao}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Solicitante:</span>
                  <span className="order-detail-value">{order.solicitante || 'Não informado'}</span>
                </div>

                                <div className="order-detail-item">
                  <span className="order-detail-label">Endereço:</span>
                  <div className="order-detail-with-action">
                    <span className="order-detail-value">{order.endereco || 'Não informado'}</span>
                    <button 
                      className="order-detail-maps-btn"
                      onClick={openGoogleMaps}
                      title="Abrir endereço no Google Maps"
                    >
                      <i className="bi bi-geo-alt"></i>
                      Maps
                    </button>
                  </div>
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="order-details-column-right">
                <div className="order-detail-item order-detail-item-simple">
                  <span className="order-detail-label">Previsão:</span>
                  <span className="order-detail-value">{order.previsao || 'Não informado'}</span>
                </div>

                {order.pedidoVinculado && (
                  <div className="order-detail-item order-detail-item-simple">
                    <span className="order-detail-label">Pedido Vinculado:</span>
                    <div className="order-detail-with-action">
                      <span className="order-detail-value">{order.pedidoVinculado}</span>
                      <button 
                        className="order-detail-maps-btn"
                        onClick={() => {
                          setSelectedOrderData(order);
                          setShowOrderSidebar(true);
                          fetchPedidoDetails(order.pedidoVinculado);
                        }}
                        title="Consultar pedido"
                      >
                        <i className="bi bi-binoculars"></i>
                      </button>
                    </div>
                  </div>
                )}

                <div className="order-detail-item order-detail-item-simple">
                  <button 
                    className="order-detail-action-btn equipment-detail-btn"
                    onClick={() => {
                      setSelectedEquipmentData(order);
                      setShowEquipmentSidebar(true);
                    }}
                  >
                    <i className="bi bi-gear"></i>
                    Dados do equipamento
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="order-details-footer">
            <button className="order-close-btn" onClick={onClose}>
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  };

  const OrderSidebar = ({ order, isOpen, onClose }) => {
    if (!isOpen || !order) return null;

    return (
      <div className={`order-sidebar ${isOpen ? 'order-sidebar-open' : ''}`}>
        <div className="order-sidebar-header">
          <div className="order-sidebar-title">
            <h3>Detalhes do Pedido</h3>
            <span className="order-sidebar-subtitle">Pedido: {order.pedidoVinculado}</span>
          </div>
          <button 
            className="order-sidebar-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="order-sidebar-content">
          {loadingPedido && (
            <div className="order-sidebar-section">
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                <i className="bi bi-clock-history"></i> Carregando dados do pedido...
              </div>
            </div>
          )}
          
          {pedidoError && (
            <div className="order-sidebar-section">
              <div style={{ textAlign: 'center', padding: '20px', color: '#dc2626', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                <i className="bi bi-exclamation-triangle"></i> {pedidoError}
              </div>
            </div>
          )}
          
          {!loadingPedido && !pedidoError && (
            <>
              <div className="order-sidebar-section">
                <h4>Informações do Pedido</h4>
                <div className="order-sidebar-info">
                  <div className="order-sidebar-info-item">
                    <span className="order-sidebar-label">Nota Fiscal:</span>
                    <span className="order-sidebar-value">
                      {pedidoDetails?.notaFiscal || 'Não disponível'}
                </span>
                  </div>
                </div>
              </div>
              
              <div className="order-sidebar-section">
                <h4>Status</h4>
                <div className="order-sidebar-status-inline">
                  <span className="order-sidebar-status-badge">
                    {pedidoDetails?.status || 'Carregando...'}
                  </span>
                  <button 
                    className="timeline-btn"
                    onClick={() => toggleTimeline(order.pedidoVinculado)}
                    title={showTimeline ? "Ocultar linha do tempo" : "Exibir linha do tempo"}
                    disabled={loadingPedido}
                  >
                    <i className="bi bi-clock-history"></i>
                  </button>
                </div>
              </div>
              
              {/* Seção da linha do tempo */}
              {showTimeline && (
                <div className="order-sidebar-section">
                  <h4>Linha do Tempo</h4>
                  {loadingTimeline && (
                    <div className="timeline-loading">
                      <i className="bi bi-clock-history"></i> Carregando linha do tempo...
              </div>
            )}
                  
                  {timelineError && (
                    <div className="timeline-error">
                      <i className="bi bi-exclamation-triangle"></i> {timelineError}
          </div>
        )}
                  
                  {timelineData && timelineData.length > 0 && (
                    <div className="timeline-container">
                      {timelineData.map((item, index) => (
                        <div key={index} className="timeline-item">
                          <div className="timeline-marker"></div>
                          <div className="timeline-content">
                            <div className="timeline-date">
                              {formatDateTimeBR(item.TB02130_DATA)}
                            </div>
                            <div className="timeline-status">
                              <span className="timeline-status-code">{item.TB02130_STATUS}</span>
                              <span className="timeline-status-name">{item.TB02130_NOME}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {timelineData && timelineData.length === 0 && (
                    <div className="timeline-empty">
                      <p>Nenhum registro de histórico encontrado</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="order-sidebar-section">
                <h4>Produtos</h4>
                <div className="order-sidebar-products">
                  <div className="products-table">
                    <div className="products-header">
                      <div className="product-col-codigo">Código</div>
                      <div className="product-col-referencia">Referência</div>
                      <div className="product-col-produto">Produto</div>
                      <div className="product-col-quantidade">Qtd</div>
                    </div>
                    <div className="products-body">
                      {pedidoDetails?.produtos && pedidoDetails.produtos.length > 0 ? (
                        pedidoDetails.produtos.map((produto, index) => (
                          <div key={index} className="product-row">
                            <div className="product-col-codigo">{produto.codigo}</div>
                            <div className="product-col-referencia">{produto.referencia}</div>
                            <div className="product-col-produto" title={produto.nome}>
                              {produto.nome}
                            </div>
                            <div className="product-col-quantidade">{produto.quantidade}</div>
                          </div>
                        ))
                      ) : (
                        <div className="products-empty">
                          <p>{pedidoDetails ? 'Nenhum produto encontrado' : 'Aguardando dados...'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-sidebar-section">
                <h4>Observações</h4>
                <div className="order-sidebar-notes">
                  <p>{pedidoDetails?.observacoes || 'Sem observações'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const EquipmentSidebar = ({ order, isOpen, onClose }) => {
    // Estados para controlar dados e loading (movidos para antes do return condicional)
    const [expandedCard, setExpandedCard] = useState(null);
    const [lastServiceData, setLastServiceData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [defeitoData, setDefeitoData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Carregar dados do equipamento quando o sidebar abrir
    useEffect(() => {
      if (isOpen && order && order.numeroSerie) {
        fetchEquipmentData();
      }
    }, [isOpen, order]);

    // Return condicional movido para após os hooks
    if (!isOpen || !order) return null;

    const fetchEquipmentData = async () => {
      if (!order.numeroSerie) {
        setError('Número de série não disponível');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Buscar último atendimento, histórico e defeito em paralelo
        const [lastServiceResponse, historyResponse, defeitoResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/equipment/last-service/${order.numeroSerie}`),
          fetch(`${API_BASE_URL}/api/equipment/history/${order.numeroSerie}`),
          fetch(`${API_BASE_URL}/api/orders/${order.id}/defeito`)
        ]);

        if (!lastServiceResponse.ok || !historyResponse.ok) {
          throw new Error('Erro ao buscar dados do equipamento');
        }

        const lastServiceResult = await lastServiceResponse.json();
        const historyResult = await historyResponse.json();
        const defeitoResult = defeitoResponse.ok ? await defeitoResponse.json() : null;

        if (lastServiceResult.success) {
          setLastServiceData(lastServiceResult.data);
        }

        if (historyResult.success) {
          setHistoryData(historyResult.data || []);
        }

        if (defeitoResult && defeitoResult.success) {
          setDefeitoData(defeitoResult.data);
        }

      } catch (err) {
        console.error('Erro ao buscar dados do equipamento:', err);
        setError('Erro ao carregar dados do equipamento');
      } finally {
        setIsLoading(false);
      }
    };

    // Função para formatar contadores
    const formatCounter = (value) => {
      if (!value || value === '0' || value === 0) return '-';
      return typeof value === 'string' ? value : value.toLocaleString('pt-BR');
    };

    const toggleCardExpansion = (cardId) => {
      setExpandedCard(expandedCard === cardId ? null : cardId);
    };

    const getConditionClass = (condicao) => {
      const condicaoLower = condicao.toLowerCase();
      if (condicaoLower.includes('reparado')) return 'reparado';
      if (condicaoLower.includes('funcionando')) return 'funcionando';
      if (condicaoLower.includes('manutenção') || condicaoLower.includes('manutencao')) return 'manutencao';
      if (condicaoLower.includes('substituído') || condicaoLower.includes('substituido')) return 'substituido';
      return '';
  };

    return (
      <div className={`equipment-sidebar ${isOpen ? 'equipment-sidebar-open' : ''}`}>
        <div className="equipment-sidebar-header">
          <div className="equipment-sidebar-title">
            <h3>{order.equipamento}</h3>
            <span className="equipment-sidebar-subtitle">Série: {order.numeroSerie || order.serie || 'N/A'}</span>
            <span className="equipment-sidebar-info-small">
              Instalação: {lastServiceData?.dataInstalacao || 'N/A'}
            </span>
            <span className="equipment-sidebar-info-small">
              Patrimônio: {order.patrimonio || 'N/A'}
            </span>
          </div>
          <button 
            className="equipment-sidebar-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="equipment-sidebar-content">
          {isLoading && (
            <div className="equipment-sidebar-loading">
              <i className="bi bi-hourglass-split"></i>
              <span>Carregando dados do equipamento...</span>
            </div>
          )}

          {error && (
            <div className="equipment-sidebar-error">
              <i className="bi bi-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="equipment-sidebar-section">
                <h4>Último atendimento</h4>
                {lastServiceData ? (
                  <div className="equipment-sidebar-info">
                    <div className="equipment-sidebar-info-item compact">
                      <span className="equipment-sidebar-label">Data:</span>
                      <span className="equipment-sidebar-value">{lastServiceData.ultimaData}</span>
                    </div>
                    <div className="equipment-sidebar-info-item compact">
                      <span className="equipment-sidebar-label">Ordem de serviço:</span>
                      <span className="equipment-sidebar-value">
                        {lastServiceData.ultimaOS} ({lastServiceData.ultimoTipo})
                      </span>
                    </div>
                    <div className="equipment-sidebar-info-item compact">
                      <span className="equipment-sidebar-label">Defeito:</span>
                      <span className="equipment-sidebar-value">
                        {defeitoData?.defeito || order.motivoOS || 'Não informado'}
                      </span>
                    </div>
                    {defeitoData?.observacao && (
                      <div className="equipment-sidebar-info-item compact">
                        <div className="equipment-history-laudo">
                          {defeitoData.observacao}
                        </div>
                      </div>
                    )}
                    <div className="equipment-sidebar-info-item compact">
                      <span className="equipment-sidebar-label">Técnico:</span>
                      <span className="equipment-sidebar-value">{lastServiceData.ultimoTecnico}</span>
                    </div>
                    <div className="equipment-sidebar-info-item laudo-item">
                      <div className="equipment-laudo-header">
                        <span className="equipment-sidebar-label">Laudo:</span>
                        {lastServiceData.ultimaCondicao && (
                          <span className={`equipment-condition-tag ${getConditionClass(lastServiceData.ultimaCondicao)}`}>
                            {lastServiceData.ultimaCondicao}
                          </span>
                        )}
                      </div>
                      <div className="equipment-history-laudo">
                        {lastServiceData.ultimoLaudo || 'Nenhum laudo registrado'}
                      </div>
                    </div>
                    <div className="equipment-sidebar-info-item counters-item">
                      <span className="equipment-sidebar-label">Contadores:</span>
                      <div className="equipment-sidebar-counters">
                        <div className="counters-table">
                          <div className="counters-header">
                            <div className="counter-col">P&B</div>
                            <div className="counter-col">Color</div>
                            <div className="counter-col">DG</div>
                            <div className="counter-col">GF P&B</div>
                            <div className="counter-col">GF Color</div>
                          </div>
                          <div className="counters-body">
                            <div className="counter-row">
                              <div className="counter-col">{formatCounter(lastServiceData.contadores?.pb)}</div>
                              <div className="counter-col">{formatCounter(lastServiceData.contadores?.color)}</div>
                              <div className="counter-col">{formatCounter(lastServiceData.contadores?.dg)}</div>
                              <div className="counter-col">{formatCounter(lastServiceData.contadores?.gfPb)}</div>
                              <div className="counter-col">{formatCounter(lastServiceData.contadores?.gfColor)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
          </div>
        ) : (
                  <div className="equipment-sidebar-no-data">
                    <i className="bi bi-info-circle"></i>
                    <span>Nenhum atendimento encontrado para este equipamento</span>
                  </div>
                )}
              </div>

              <div className="equipment-sidebar-section">
                <h4>Histórico de Atendimentos</h4>
                <div className="equipment-history">
                  {historyData.length > 0 ? (
                    historyData.map((item) => (
                      <div 
                        key={item.id} 
                        className={`equipment-history-item ${expandedCard === item.id ? 'expanded' : ''}`}
                        onClick={() => toggleCardExpansion(item.id)}
                      >
                        <div className="equipment-history-header">
                          <div className="equipment-history-date">{item.data}</div>
                          <div className="equipment-history-os">
                            <span className="equipment-history-os-number">{item.numeroOS}</span>
                            <span className={`equipment-history-os-type ${(item.tipoOS || '').toLowerCase()}`}>
                              {item.tipoOS}
                            </span>
                          </div>
                        </div>
                        <div className="equipment-history-tech">Técnico: {item.tecnico}</div>
                        <div className="equipment-history-click-hint">Clique para ver detalhes</div>
                        
                        {expandedCard === item.id && (
                          <div className="equipment-history-expanded">
                            <button 
                              className="equipment-history-collapse-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCard(null);
                              }}
                              title="Recolher"
                            >
                              <i className="bi bi-chevron-up"></i>
                            </button>
                            
                            <div className="equipment-history-detail">
                              <div className="equipment-history-detail-item compact">
                                <span className="equipment-history-detail-label">Defeito:</span>
                                <span className="equipment-history-detail-value">
                                  {item.defeito || item.motivoOS || 'Não informado'}
                                </span>
                              </div>
                              {item.observacao && (
                                <div className="equipment-history-detail-item compact">
                                  <div className="equipment-history-laudo">
                                    {item.observacao}
                                  </div>
                                </div>
                              )}
                              <div className="equipment-history-detail-item compact">
                                <span className="equipment-history-detail-label">Condição:</span>
                                <span className="equipment-history-detail-value">{item.condicao}</span>
                              </div>
                              
                              <div className="equipment-history-detail-item laudo-item">
                                <span className="equipment-history-detail-label">Laudo:</span>
                                <div className="equipment-history-laudo">
                                  {item.laudo || 'Nenhum laudo registrado'}
                                </div>
                              </div>
                              
                              <div className="equipment-history-detail-item counters-detail-item">
                                <span className="equipment-history-detail-label">Contadores:</span>
                                <div className="equipment-history-counters">
                                  <div className="counters-compact-table">
                                    <div className="counters-compact-header">
                                      <div className="counter-compact-col">P&B</div>
                                      <div className="counter-compact-col">Color</div>
                                      <div className="counter-compact-col">DG</div>
                                      <div className="counter-compact-col">GF P&B</div>
                                      <div className="counter-compact-col">GF Color</div>
                                    </div>
                                    <div className="counters-compact-body">
                                      <div className="counter-compact-row">
                                        <div className="counter-compact-col">{formatCounter(item.contadores?.pb)}</div>
                                        <div className="counter-compact-col">{formatCounter(item.contadores?.color)}</div>
                                        <div className="counter-compact-col">{formatCounter(item.contadores?.dg)}</div>
                                        <div className="counter-compact-col">{formatCounter(item.contadores?.gfPb)}</div>
                                        <div className="counter-compact-col">{formatCounter(item.contadores?.gfColor)}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="equipment-sidebar-no-data">
                      <i className="bi bi-info-circle"></i>
                      <span>Nenhum histórico de atendimento encontrado</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const CityGroup = ({ cidade, ordens }) => {
    const getSLAColor = (sla) => {
      switch(sla) {
        case 'vencido':
          return '#ef5350'; // Vermelho
        case 'vencendo':
          return '#ff9800'; // Amarelo/Laranja
        case 'ok':
        default:
          return 'transparent'; // Sem cor (branco)
      }
    };

    const getSLAIndicator = (sla) => {
      const color = getSLAColor(sla);
      if (color === 'transparent') return null;
      
      return (
        <div 
          className="sla-indicator"
          style={{ backgroundColor: color }}
        />
      );
    };

    const getServiceIcon = (tipo) => {
      // Usar diretamente as iniciais do TB02115_PREVENTIVA (já mapeadas para visualização)
      return tipo || '?';
    };

    const getServiceColor = (tipo) => {
      switch(tipo) {
        case 'E': return '#9c27b0'; // ESTOQUE - Roxo
        case 'B': return '#ff5722'; // BALCÃO - Laranja
        case 'A': return '#607d8b'; // AFERIÇÃO - Azul acinzentado
        case 'R': return '#795548'; // RETORNO-RECARGA - Marrom
        case 'D': return '#f44336'; // DESINSTALAÇÃO - Vermelho
        case 'I': return '#2196f3'; // INSTALAÇÃO - Azul
        case 'S': return '#4caf50'; // PREVENTIVA - Verde
        case 'C': return '#ff9800'; // CORRETIVA - Amarelo/Laranja
        default: return '#9e9e9e';  // Cinza para desconhecido
      }
    };

    // Ordenar ordens por prioridade de SLA
    const getSLAPriority = (sla) => {
      switch(sla) {
        case 'vencido': return 1;    // Primeira prioridade
        case 'vencendo': return 2;   // Segunda prioridade
        case 'ok': return 3;         // Terceira prioridade
        default: return 4;           // Última prioridade
      }
    };

    const sortedOrdens = [...ordens].sort((a, b) => {
      const priorityA = getSLAPriority(a.sla);
      const priorityB = getSLAPriority(b.sla);
      
      // Se a prioridade for diferente, ordenar por prioridade
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Se a prioridade for igual, ordenar por ID da ordem
      return a.id.localeCompare(b.id);
    });

    // Verificar se todas as ordens da cidade estão selecionadas
    const allSelected = ordens.every(ordem => selectedOrders.includes(ordem.id));
    const someSelected = ordens.some(ordem => selectedOrders.includes(ordem.id));

    return (
      <div className="city-group">
        <div 
          className="city-header" 
          onClick={ordens.length > 1 ? () => setOpenCityDropdown(openCityDropdown === cidade ? null : cidade) : undefined}
          style={{ cursor: ordens.length > 1 ? 'pointer' : 'default' }}
        >
          <div className="city-title-section">
            <span className="city-title">{cidade}</span>
            <span className="city-count">{ordens.length}</span>
            </div>
          {ordens.length > 1 && (
            <div className="city-actions">
              {someSelected && (
                <div className="city-selection-indicator">
                  {allSelected ? '✓' : '◐'}
                </div>
              )}
              <span className="city-dropdown-arrow">▼</span>
            </div>
          )}
          
          {openCityDropdown === cidade && ordens.length > 1 && (
            <div className="city-dropdown">
              <div 
                className="city-dropdown-option"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAllOrdersFromCity(ordens);
                }}
              >
                <span className="city-dropdown-icon">
                  {allSelected ? '☐' : '☑'}
                </span>
                <span className="city-dropdown-text">
                  {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
                </span>
                <span className="city-dropdown-count">({ordens.length})</span>
              </div>
            </div>
          )}
        </div>
        <div className="city-orders-container">
          <div className="orders-table">
            {sortedOrdens.map(ordem => (
              <div 
                key={ordem.id} 
                className={`order-row ${selectedOrders.includes(ordem.id) ? 'selected' : ''}`}
                onClick={() => handleOrderClick(ordem)}
                draggable
                onDragStart={(e) => {
                  if (!selectedOrders.includes(ordem.id)) {
                    setSelectedOrders([ordem.id]);
                  }
                }}
              >
                <div className="order-cell order-id">
                  <span 
                    className="service-type-badge-compact"
                    style={{ backgroundColor: getServiceColor(ordem.tipo) }}
                  >
                    {getServiceIcon(ordem.tipo)}
                  </span>
                  {getSLAIndicator(ordem.sla)}
                  <span className="order-id-text">{ordem.id}</span>
                  {ordem.pedidoVinculado && (
                    <i className="bi bi-box-seam pedido-vinculado-icon" title={`Pedido vinculado: ${ordem.pedidoVinculado}`}></i>
                  )}
                </div>
                <div className="order-cell order-cliente" title={ordem.cliente}>
                  {ordem.cliente}
                </div>
                <div className="order-cell order-equipamento" title={ordem.equipamento}>
                  {ordem.equipamento}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Se não estiver autenticado, mostrar tela de login
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <div className={`app ${isInitialLoading ? 'loading' : ''}`}>
        <header className="main-header">
        <div className="company-name">{companyName}</div>
        <nav className="main-nav">
          <button 
            className={`nav-item ${activeSection === 'Board' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('Board');
              setShowConfigMenu(false);
            }}
          >
            Board
          </button>
          <button 
            className={`nav-item ${activeSection === 'Equipe' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('Equipe');
              setShowConfigMenu(false);
            }}
          >
            Equipe
          </button>
          <button 
            className={`nav-item ${activeSection === 'Calendário' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('Calendário');
              setShowConfigMenu(false);
            }}
          >
            Calendário
          </button>
        </nav>
        <div className="header-actions">
          <div className="data-status">
            {isLoadingData ? (
              <span className="status-indicator loading" title="Carregando dados...">
                🔄 Carregando...
              </span>
            ) : (
              <span 
                className={`status-indicator ${dataSource === 'sql_server' ? 'connected' : 'mock'}`}
                title={
                  dataSource === 'sql_server' 
                    ? 'Dados carregados do SQL Server' 
                    : dataSource === 'mock_fallback'
                    ? 'Erro SQL Server - usando dados mock'
                    : 'Usando dados mock - configure o banco'
                }
              >
                {dataSource === 'sql_server' ? '🟢 Conectado' : '🟡 Mock Data'}
              </span>
            )}
          </div>
          
          {/* Componente de usuário logado */}
          {currentUser && (
            <div className="user-info">
              <button 
                className="user-button"
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                title={`Usuário: ${currentUser.name || currentUser.username || 'Usuário'}`}
              >
                <span className="user-badge">
                  <i className="bi bi-person-circle"></i>
                  <span className="user-name">{currentUser.name || currentUser.username || 'Usuário'}</span>
                  <i className="bi bi-chevron-down"></i>
                </span>
              </button>
              
              {showLogoutMenu && (
                <div className="logout-menu">
                  {/* Opção Configurações - apenas para administradores */}
                  {currentUser && currentUser.type === '1' && (
                    <button 
                      className="logout-option"
                      onClick={() => {
                        setShowConfigMenu(true);
                        setShowLogoutMenu(false);
                      }}
                    >
                      <i className="bi bi-gear"></i>
                      Configurações
                    </button>
                  )}
                  <button 
                    className="logout-option"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right"></i>
                    Sair do sistema
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Menu de configurações - apenas para administradores */}
      {showConfigMenu && currentUser && currentUser.type === '1' && (
        <div className="config-bar">
          <div className="config-nav">
            <button 
              className={`config-nav-item ${activeConfigSection === 'database' ? 'active' : ''}`}
              onClick={() => setActiveConfigSection('database')}
            >
              Banco de dados
            </button>
            <button 
              className={`config-nav-item ${activeConfigSection === 'process' ? 'active' : ''}`}
              onClick={() => setActiveConfigSection('process')}
            >
              Processos
            </button>
            <button 
              className={`config-nav-item ${activeConfigSection === 'users' ? 'active' : ''}`}
              onClick={() => setActiveConfigSection('users')}
            >
              Usuários
            </button>
            <button 
              className={`config-nav-item ${activeConfigSection === 'company' ? 'active' : ''}`}
              onClick={() => setActiveConfigSection('company')}
            >
              Empresa
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo das configurações - apenas para administradores */}
      {showConfigMenu && currentUser && currentUser.type === '1' && activeConfigSection === 'database' && (
        <div className="config-content">
          <DatabaseConfig 
            dbConfig={dbConfig}
            setDbConfig={setDbConfig}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            isTestingConnection={isTestingConnection}
            setIsTestingConnection={setIsTestingConnection}
            connectionTested={connectionTested}
            setConnectionTested={setConnectionTested}
          />
            </div>
      )}

      {showConfigMenu && currentUser && currentUser.type === '1' && activeConfigSection === 'process' && (
        <div className="config-content">
          <ProcessConfig />
        </div>
      )}

      {showConfigMenu && currentUser && currentUser.type === '1' && activeConfigSection === 'users' && (
        <div className="config-content">
          <UserManagement 
            users={users}
            setUsers={setUsers}
            isLoadingUsers={isLoadingUsers}
            setIsLoadingUsers={setIsLoadingUsers}
            showUserForm={showUserForm}
            setShowUserForm={setShowUserForm}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            showPasswordUser={showPasswordUser}
            setShowPasswordUser={setShowPasswordUser}
            userFormData={userFormData}
            setUserFormData={setUserFormData}
            userFormErrors={userFormErrors}
            setUserFormErrors={setUserFormErrors}
          />
        </div>
      )}

      {showConfigMenu && currentUser && currentUser.type === '1' && activeConfigSection === 'company' && (
        <div className="config-content">
          <CompanyConfig />
        </div>
      )}

      {!showConfigMenu && activeSection === 'Board' && (
        <>
          <div className="filters-bar">
            <div className="filter-buttons">
              <div className="filter-group">
                <button 
                  className="filter-btn"
                  onClick={() => {
                    console.log('🔍 Coordenador button clicked! Current openModal:', openModal);
                    console.log('🔍 isLoadingCoordinators:', isLoadingCoordinators);
                    setOpenModal(openModal === 'coordenador' ? null : 'coordenador');
                  }}
                  disabled={isLoadingCoordinators}
                >
                  Coordenador
                  {selectedFilterItems.coordenador.length > 0 && (
                    <span className="filter-count">{selectedFilterItems.coordenador.length}</span>
                  )}
                  <span className="dropdown-arrow">▼</span>
                </button>
                {openModal === 'coordenador' && (
                  <SimpleFilterModal 
                    type="coordenador"
                    options={getFilterOptions('coordenador')}
                    onClose={() => {
                      console.log('🔍 Closing coordenador modal');
                      setOpenModal(null);
                    }}
                  />
                )}
              </div>

              <div className="filter-group">
                <button 
                  className="filter-btn"
                  onClick={() => {
                    console.log('🔍 Área button clicked! Current openModal:', openModal);
                    console.log('🔍 isLoadingCoordinators:', isLoadingCoordinators, 'isLoadingAreas:', isLoadingAreas);
                    setOpenModal(openModal === 'area' ? null : 'area');
                  }}
                  disabled={isLoadingCoordinators || isLoadingAreas}
                >
                  Área
                  {selectedFilterItems.area.length > 0 && (
                    <span className="filter-count">{selectedFilterItems.area.length}</span>
                  )}
                  <span className="dropdown-arrow">▼</span>
                </button>
                {openModal === 'area' && (
                  <SimpleFilterModal 
                    type="area"
                    options={getFilterOptions('area')}
                    onClose={() => setOpenModal(null)}
                  />
                )}
              </div>

              <div className="filter-group">
                <button 
                  className="filter-btn"
                  onClick={() => {
                    console.log('🔍 Técnicos button clicked! Current openModal:', openModal);
                    console.log('🔍 isLoadingTechnicians:', isLoadingTechnicians, 'isLoadingAreas:', isLoadingAreas);
                    setOpenModal(openModal === 'tecnico' ? null : 'tecnico');
                  }}
                  disabled={isLoadingTechnicians || isLoadingAreas}
                >
                  Técnicos
                  {selectedFilterItems.tecnico.length > 0 && (
                    <span className="filter-count">{selectedFilterItems.tecnico.length}</span>
                  )}
                  <span className="dropdown-arrow">▼</span>
                </button>
                {openModal === 'tecnico' && (
                  <SimpleFilterModal 
                    type="tecnico"
                    options={getFilterOptions('tecnico')}
                    onClose={() => setOpenModal(null)}
                  />
                )}
              </div>


            </div>

            <div className="search-container">
              <button 
                className="refresh-btn"
                onClick={refreshData}
                disabled={isRefreshing}
                title="Atualizar dados das ordens de serviço e técnicos"
                style={{
                  marginRight: '12px',
                  padding: '5px 16px',
                  background: 'transparent',
                  color: isRefreshing ? '#6c757d' : '#4a5568',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12.6px',
                  fontWeight: '500',
                  fontFamily: 'Sora, sans-serif',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '140px',
                  justifyContent: 'center'
                }}
              >
                {isRefreshing ? (
                  <>
                    <span style={{ 
                      width: '14px', 
                      height: '14px', 
                      border: '2px solid #6c757d',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      display: 'inline-block'
                    }}></span>
                    Atualizando...
                  </>
                ) : (
                  <>
                    🔄 Atualizar dados
                  </>
                )}
              </button>
              <input
                type="text"
                placeholder="Pesquisar ordens de serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            </div>



          <div className="board-section">
            <div className="kanban-board">
              {/* Coluna fixa "Em aberto" */}
              <div className="kanban-fixed-column">
                <div 
                  className={`kanban-column ${isDragOverOpen ? 'drop-target' : ''}`}
                  onDrop={(e) => {
                    e.preventDefault();
                    console.log(`🎯 Drop detectado na coluna "Em aberto"`);
                    const orderId = e.dataTransfer.getData('orderId');
                    const fromTechnician = e.dataTransfer.getData('fromTechnician');
                    console.log(`📋 Dados recebidos: orderId=${orderId}, fromTechnician=${fromTechnician}`);
                    
                    if (fromTechnician === 'true' && orderId) {
                      console.log(`✅ Chamando handleReturnToOpen para ordem ${orderId}`);
                      console.log(`📋 Ordens selecionadas:`, selectedOrders);
                      console.log(`📋 Quantidade de ordens selecionadas:`, selectedOrders.length);
                      
                      // Se há ordens selecionadas, usar todas elas, senão usar apenas a ordem arrastada
                      const ordersToReturn = selectedOrders.length > 0 ? selectedOrders : [orderId];
                      console.log(`📋 Ordens que serão processadas:`, ordersToReturn);
                      console.log(`📋 Quantidade de ordens a processar:`, ordersToReturn.length);
                      
                      handleReturnToOpen(ordersToReturn);
                    } else {
                      console.log(`❌ Drop ignorado: fromTechnician=${fromTechnician}, orderId=${orderId}`);
                    }
                    setIsDragOverOpen(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverOpen(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOverOpen(false);
                  }}
                >
                  <div className="column-header">
                    <div className="column-title-section">
                      <span className="column-title">Em aberto</span>
                      <div className="column-filter-container">
                        <button 
                          className={`column-filter-icon ${(selectedColumnFilters.cidade.length > 0 || selectedColumnFilters.bairro.length > 0 || selectedColumnFilters.cliente.length > 0 || selectedColumnFilters.tipoOS.length > 0 || selectedColumnFilters.sla.length > 0 || selectedColumnFilters.equipamento.length > 0 || selectedColumnFilters.status.length > 0) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFilterOptions(!showFilterOptions);
                            setShowColumnFilter(false);
                          }}
                          title="Filtrar dados da coluna"
                        >
                          <i className="bi bi-funnel"></i>
                                    {(selectedColumnFilters.cidade.length > 0 || selectedColumnFilters.bairro.length > 0 || selectedColumnFilters.cliente.length > 0 || selectedColumnFilters.tipoOS.length > 0 || selectedColumnFilters.sla.length > 0 || selectedColumnFilters.equipamento.length > 0 || selectedColumnFilters.status.length > 0) && (
                  <span className="column-filter-badge">{selectedColumnFilters.cidade.length + selectedColumnFilters.bairro.length + selectedColumnFilters.cliente.length + selectedColumnFilters.tipoOS.length + selectedColumnFilters.sla.length + selectedColumnFilters.equipamento.length + selectedColumnFilters.status.length}</span>
                          )}
                        </button>
                        
                        {showFilterOptions && (
                          <div className="column-filter-overlay">
                            <FilterOptionsDropdown 
                              onSelectFilter={(filterType) => {
                                setShowColumnFilter(true);
                                setShowFilterOptions(false);
                                // Store the selected filter type for the modal
                                setSelectedFilterType(filterType);
                              }}
                              onClose={() => setShowFilterOptions(false)}
                            />
                          </div>
                        )}
                        
                        {showColumnFilter && (
                          <div className="column-filter-overlay">
                            <ColumnFilterModal 
                              filterType={selectedFilterType}
                              onClose={() => setShowColumnFilter(false)} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="column-count">
                      {getGroupedByCity.reduce((total, group) => total + group.ordens.length, 0)}
                    </span>
                  </div>
                  <div className="column-content custom-scroll" ref={openColumnScrollRef}>
                    {(() => {
                      console.log('🔍 Renderizando coluna Em Aberto - getGroupedByCity:', getGroupedByCity);
                      console.log('🔍 Renderizando coluna Em Aberto - length:', getGroupedByCity.length);
                      return getGroupedByCity.map(group => (
                        <CityGroup 
                          key={group.cidade}
                          cidade={group.cidade}
                          ordens={group.ordens}
                        />
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Área scrollável para colunas de técnicos */}
              <div className="kanban-scrollable-area">
                {/* Mostrar colunas de técnicos apenas quando há filtros de equipe ativos */}
                {hasActiveTeamFilters && columnOrder.map((technician, index) => (
                  <TechnicianColumn
                    key={technician}
                    technician={technician}
                    orders={techniqueColumns[technician] || []}
                    index={index}
                  />
                ))}

                {/* Indicador quando não há filtros de equipe ativos */}
                {!hasActiveTeamFilters && (
                  <div className="technician-columns-placeholder">
                    <div className="placeholder-content">
                      <i className="bi bi-people"></i>
                      <p className="placeholder-title">Colunas de Técnicos</p>
                      <p className="placeholder-description">
                        Aplique filtros de <strong>Coordenador</strong>, <strong>Área</strong> ou <strong>Técnicos</strong> 
                        para visualizar as colunas dos técnicos relacionados
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {!showConfigMenu && activeSection === 'Equipe' && (
        <div className="team-section">
          {/* Header com cadastro de área */}
          <div className="team-header">
            <div className="team-title">
              <h2>Gestão de Equipe</h2>
              <p>Organize técnicos, áreas e coordenadores</p>
            </div>
            <div className="header-actions">
              {/* Formulário de criação de área */}
              <div className="area-creation">
                <div className="form-group-inline">
              <input
                type="text"
                    value={newAreaName}
                    onChange={(e) => {
                      setNewAreaName(e.target.value);
                      setCreateAreaError('');
                    }}
                    placeholder="Nome da nova área"
                    className="area-input"
                    disabled={isCreatingArea}
                    maxLength={100}
                  />
                  <button 
                    onClick={createNewArea}
                    className="btn-create-area"
                    disabled={isCreatingArea || !newAreaName.trim()}
                    title="Cadastrar nova área"
                  >
                    {isCreatingArea ? (
                      <>
                        <i className="bi bi-arrow-repeat spin"></i>
                        Criando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i>
                        Cadastrar
                      </>
                    )}
                  </button>
                </div>
                {createAreaError && (
                  <div className="error-message" style={{ fontSize: '12px', marginTop: '4px', color: '#ef4444' }}>
                    {createAreaError}
                  </div>
                )}
            </div>

              <div className="header-divider">|</div>
              
              <button 
                onClick={openManagementDiagram}
                className="btn-view-diagram"
              >
                <i className="bi bi-diagram-3"></i>
                Visualizar gestão
              </button>
              
              {/* Status de carregamento das áreas */}
              {isLoadingAreas && (
                <>
                  <div className="header-divider">|</div>
                  <div className="header-loading">
                    <i className="bi bi-arrow-repeat spin"></i>
                    <span>Carregando áreas...</span>
                  </div>
                </>
              )}
              
              {areasError && (
                <>
                  <div className="header-divider">|</div>
                  <div className="header-error">
                    <i className="bi bi-exclamation-triangle"></i>
                    <span>Erro ao carregar áreas</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Área principal com layout de colunas */}
          <div className="team-board">
            {/* Coluna de técnicos não vinculados */}
            <div className="team-column">
              <div className="team-column-header">
                <h3>Técnicos Disponíveis</h3>
                <span className="team-count">{getFilteredUnassignedTechnicians().length}</span>
              </div>
              
              {/* Campo de busca de técnicos */}
              <div className="technician-search-container">
                <div className="search-input-group">
                  <i className="bi bi-search"></i>
              <input
                type="text"
                    placeholder="Buscar técnico..."
                    value={technicianSearchTerm}
                    onChange={(e) => setTechnicianSearchTerm(e.target.value)}
                    className="technician-search-input"
                  />
                  {technicianSearchTerm && (
                    <button 
                      className="clear-search-btn"
                      onClick={() => setTechnicianSearchTerm('')}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
            </div>

              <div className="team-column-content">
                {/* Indicador de carregamento */}
                {isLoadingTechnicians && (
                  <div className="loading-indicator">
                    <i className="bi bi-arrow-repeat spin"></i>
                    <span>Carregando técnicos...</span>
                  </div>
                )}
                
                {/* Mensagem de erro */}
                {techniciansError && (
                  <div className="error-message">
                    <i className="bi bi-exclamation-triangle"></i>
                    <span>Erro: {techniciansError}</span>
                  </div>
                )}
                
                {/* Lista de técnicos */}
                {!isLoadingTechnicians && !techniciansError && getFilteredUnassignedTechnicians().map(tecnico => (
                  <div
                    key={tecnico.id}
                    className="team-item tecnico-item compact"
                    draggable
                    onDragStart={() => handleDragStart(tecnico, 'tecnico')}
                  >
                    <i className="bi bi-person"></i>
                    <TechnicianName name={tecnico.nome} maxLength={25} />
                  </div>
                ))}
                
                {/* Estados vazios */}
                {!isLoadingTechnicians && !techniciansError && getFilteredUnassignedTechnicians().length === 0 && technicianSearchTerm && (
                  <div className="empty-state">
                    <i className="bi bi-search"></i>
                    <span>Nenhum técnico encontrado</span>
                  </div>
                )}
                {!isLoadingTechnicians && !techniciansError && getUnassignedTechnicians().length === 0 && !technicianSearchTerm && (
                  <div className="empty-state">
                    <i className="bi bi-check-circle"></i>
                    <span>Todos os técnicos estão vinculados</span>
                  </div>
                )}
              </div>
            </div>

            {/* Colunas de áreas */}
            <div className="areas-container">
              {/* Áreas não vinculadas a coordenadores */}
              <div className="areas-section">
                <div className="section-title-clean">
                  <h3>Áreas <span className="section-count-inline">({getUnassignedAreas().length})</span></h3>
                </div>
                
                {/* Indicador de carregamento das áreas */}
                {isLoadingAreas && (
                  <div className="loading-indicator">
                    <i className="bi bi-arrow-repeat spin"></i>
                    <span>Carregando áreas...</span>
                  </div>
                )}
                
                {/* Mensagem de erro */}
                {areasError && (
                  <div className="error-message">
                    <i className="bi bi-exclamation-triangle"></i>
                    <span>Erro: {areasError}</span>
                  </div>
                )}
                
                {!isLoadingAreas && !areasError && getUnassignedAreas().length > 0 ? (
                  <div className="areas-grid">
                    {getUnassignedAreas().map(area => (
                      <div
                        key={area.id}
                        className="area-card"
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(area.id, 'area');
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <div 
                          className="area-header"
                          draggable
                          onDragStart={() => handleDragStart(area, 'area')}
                        >
                          <div className="area-title">
                            <i className="bi bi-diagram-3"></i>
                            <span>{area.nome}</span>
                            <span className="area-tech-count">{getTecnicosByArea(area.id).length}</span>
                          </div>
                          <div className="area-header-actions">
              <button 
                              className="btn-delete-area"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteArea(area.id);
                              }}
                              title="Excluir área"
                            >
                              <i className="bi bi-trash"></i>
              </button>
                          </div>
                        </div>
                        <div className="area-technicians">
                          {getTecnicosByArea(area.id).map(tecnico => (
                            <div key={tecnico.id} className="area-tech-item">
                              <div className="tech-info">
                                <i className="bi bi-person-fill"></i>
                                <TechnicianName name={tecnico.nome} maxLength={25} />
                              </div>
                              <button 
                                className="remove-tech-btn"
                                onClick={() => removeTechnicianFromArea(tecnico.id)}
                                title="Remover técnico"
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          ))}
                          {getTecnicosByArea(area.id).length === 0 && (
                            <div className="area-drop-zone">
                              <i className="bi bi-arrow-down-circle"></i>
                              <span>Arraste técnicos aqui</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isLoadingAreas && !areasError ? (
                  <div className="empty-state">
                    <i className="bi bi-diagram-3"></i>
                    <span>Nenhuma área cadastrada</span>
                  </div>
                ) : null}
            </div>

              {/* Coordenadores com suas áreas */}
              <div className="coordinators-section">
                <div className="section-title-clean">
                  <h3>Coordenadores <span className="section-count-inline">({teamData.coordenadores.length})</span></h3>
                </div>
                
                {/* Indicador de carregamento dos coordenadores */}
                {isLoadingCoordinators && (
                  <div className="loading-indicator">
                    <i className="bi bi-arrow-repeat spin"></i>
                    <span>Carregando coordenadores...</span>
                  </div>
                )}
                
                {/* Mensagem de erro */}
                {coordinatorsError && (
                  <div className="error-message">
                    <i className="bi bi-exclamation-triangle"></i>
                    <span>Erro: {coordinatorsError}</span>
                  </div>
                )}
                
                {!isLoadingCoordinators && !coordinatorsError && teamData.coordenadores.length > 0 && (
                  <div className="coordinators-grid">
                    {teamData.coordenadores.map(coordenador => {
                    const areas = getAreasByCoordinator(coordenador.id);
                    const totalTecnicos = areas.reduce((sum, area) => sum + getTecnicosByArea(area.id).length, 0);
                    
                    return (
                      <div
                        key={coordenador.id}
                        className="coordinator-card"
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(coordenador.id, 'coordenador');
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <div className="coordinator-header">
                          <div className="coordinator-info">
                            <i className="bi bi-person-badge"></i>
                            <div>
                              <h4>{coordenador.nome}</h4>
                              <span className="coordinator-stats">
                                {areas.length} área{areas.length !== 1 ? 's' : ''} • {totalTecnicos} técnico{totalTecnicos !== 1 ? 's' : ''}
                </span>
              </div>
                          </div>
                        </div>
                        <div className="coordinator-areas">
                          {areas.map(area => (
                            <div key={area.id} className="coordinator-area-item">
                              <div className="area-name">
                                <div className="area-name-content">
                                  <i className="bi bi-diagram-3-fill"></i>
                                  <span>{area.nome}</span>
                                  <span className="area-tech-badge">{getTecnicosByArea(area.id).length}</span>
                                </div>
                                <div className="area-action-container">
                                  <button 
                                    className="area-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAreaActionMenu(area.id);
                                    }}
                                  >
                                    <i className="bi bi-three-dots"></i>
                                  </button>
                                  {areaActionMenus[area.id] && (
                                    <div className="area-action-menu">
                                      <button 
                                        onClick={() => removeAreaFromCoordinator(area.id)}
                                        className="action-menu-item"
                                      >
                                        <i className="bi bi-arrow-up"></i>
                                        Configurar área
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="area-technicians-list">
                                {getTecnicosByArea(area.id).map(tecnico => (
                                  <span key={tecnico.id} className="tech-tag">
                                    <TechnicianName name={tecnico.nome} maxLength={20} />
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {areas.length === 0 && (
                            <div className="coordinator-drop-zone">
                              <i className="bi bi-arrow-down-circle"></i>
                              <span>Arraste áreas aqui</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
                
                {!isLoadingCoordinators && !coordinatorsError && teamData.coordenadores.length === 0 && (
                  <div className="empty-state">
                    <i className="bi bi-person-badge"></i>
                    <span>Nenhum coordenador cadastrado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal de confirmação */}
          {showConfirmModal && (
            <div className="modal-overlay">
              <div className="confirm-modal">
                <div className="confirm-header">
                  <h3>Confirmar Ação</h3>
                </div>
                <div className="confirm-content">
                  <p>{confirmAction?.description}</p>
                </div>
                <div className="confirm-actions">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="btn-cancel"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDragAction}
                    className="btn-confirm"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de erro de exclusão */}
          {showDeleteErrorModal && (
            <div className="modal-overlay">
              <div className="delete-error-modal">
                <div className="delete-error-header">
                  <div className="delete-error-icon">
                    <i className="bi bi-exclamation-circle"></i>
                  </div>
                  <h3>Não é possível excluir</h3>
                </div>
                <div className="delete-error-content">
                  <p>{deleteErrorMessage}</p>
                </div>
                <div className="delete-error-actions">
                  <button 
                    onClick={() => setShowDeleteErrorModal(false)}
                    className="btn-understand"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal do diagrama de gestão */}
          {showManagementDiagram && (
            <div className="modal-overlay">
              <div className="management-diagram-modal">
                <div className="diagram-modal-header">
                  <h2>Diagrama de Gestão de Equipe</h2>
                  <div className="diagram-modal-actions">
                    <button 
                      onClick={printManagementDiagram}
                      className="btn-print"
                      title="Imprimir diagrama"
                    >
                      <i className="bi bi-printer"></i>
                      Imprimir
                    </button>
                    <button 
                      onClick={closeManagementDiagram}
                      className="btn-close-diagram"
                      title="Fechar"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
                
                <div className="management-diagram-content">
                  <div className="reactflow-container">
                    <ReactFlow
                      ref={reactFlowRef}
                      {...(() => {
                        const nodes = generateNodes();
                        const edges = generateEdges();
                        return getLayoutedElements(nodes, edges);
                      })()}
                      connectionLineType={ConnectionLineType.Straight}
                      fitView
                      fitViewOptions={{ padding: 0.3 }}
                      nodesDraggable={false}
                      nodesConnectable={false}
                      elementsSelectable={false}
                      panOnDrag={true}
                      zoomOnScroll={true}
                      zoomOnPinch={true}
                      preventScrolling={false}
                      defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                      minZoom={0.3}
                      maxZoom={2}
                      attributionPosition="bottom-left"
                    >
                      <Background color="#f1f5f9" gap={20} />
                      <MiniMap 
                        nodeColor="#e2e8f0"
                        nodeStrokeWidth={2}
                        nodeBorderRadius={8}
                        maskColor="rgba(0, 0, 0, 0.1)"
                        position="bottom-right"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          width: 150,
                          height: 100
                        }}
                      />
                      <Controls 
                        position="top-right"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                    </ReactFlow>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!showConfigMenu && activeSection === 'Calendário' && (
        <div className="section-placeholder">
          <h2>Seção Calendário</h2>
          <p>Conteúdo do calendário será implementado aqui</p>
        </div>
      )}

      {/* Renderizar todos os modais de filtro de técnicos */}
      <TechnicianFilterModals />
      
      {/* Renderizar todos os modais de menu de técnicos */}
      <TechnicianMenuModals />

      {/* Modal do roteiro de hoje */}
      {Object.entries(showTodayRouteModal).map(([technician, isOpen]) => {
        if (!isOpen) return null;
        
        return (
          <TodayRouteModal
            key={technician}
            technician={technician}
            isOpen={isOpen}
            onClose={() => setShowTodayRouteModal(prev => ({ ...prev, [technician]: false }))}
          />
        );
      })}

      {/* Modal de rota do técnico */}
      <RouteModal 
        isOpen={showRouteModal}
        routeData={routeModalData}
        loading={routeModalLoading}
        error={routeModalError}
        onClose={() => {
          setShowRouteModal(false);
          setRouteModalData(null);
          setRouteModalError(null);
        }}
      />

      {/* Modal de detalhes da ordem de serviço */}
      {selectedOrderForDetails && (
        <OrderDetailsModal 
          order={selectedOrderForDetails} 
          onClose={() => setSelectedOrderForDetails(null)} 
        />
      )}

      {/* Barra lateral do pedido */}
      <OrderSidebar 
        order={selectedOrderData}
        isOpen={showOrderSidebar}
        onClose={() => {
          setShowOrderSidebar(false);
          setPedidoDetails(null);
          setPedidoError(null);
          setLoadingPedido(false);
          setShowTimeline(false);
          setTimelineData(null);
          setTimelineError(null);
          setLoadingTimeline(false);
        }}
      />

      {/* Barra lateral do equipamento */}
      <EquipmentSidebar 
        order={selectedEquipmentData}
        isOpen={showEquipmentSidebar}
        onClose={() => {
          setShowEquipmentSidebar(false);
          setSelectedEquipmentData(null);
        }}
      />

      </div>

      {/* Modal de status das ordens */}
      <OrderStatusModal 
        isOpen={showOrderStatusModal}
        results={orderStatusResults}
        summary={orderStatusSummary}
        onClose={() => setShowOrderStatusModal(false)}
      />

      {/* Modal de carregamento inicial */}
      <InitialLoadingModal 
        isOpen={isInitialLoading}
        steps={loadingSteps}
        hasError={loadingHasError}
        errorMessage={loadingErrorMessage}
        onContinue={() => setIsInitialLoading(false)}
      />

      {/* Modal de carregamento para atualização de dados */}
      <RefreshLoadingModal 
        isOpen={isRefreshing}
        progress={refreshProgress}
      />
    </>
  );
}

export default App;


