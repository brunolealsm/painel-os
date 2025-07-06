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

// Configuração da API
const API_BASE_URL = 'http://localhost:3001';

// Mock data simulando dados reais da consulta SQL
const mockData = {
  coordenadores: ['João Silva', 'Maria Santos', 'Pedro Costa'],
  areas: {
    'João Silva': ['Área Norte', 'Área Central'],
    'Maria Santos': ['Área Sul', 'Área Oeste'],
    'Pedro Costa': ['Área Leste']
  },
  tecnicos: {
    'João Silva': ['Carlos Mendes', 'Ana Paula'],
    'Maria Santos': ['Roberto Lima', 'Fernanda Costa'],
    'Pedro Costa': ['Lucas Oliveira']
  }
};

// Dados de ordens baseados na consulta SQL LCMY_ASSTEC01
const availableOrders = [
  {
    cidade: 'São Paulo', // TB02115_CIDADE
    ordens: [
      {
        TB02115_CODIGO: 'OS-2024001',
        TB01008_NOME: 'Empresa ABC Ltda',
        TB01010_NOME: 'Impressora HP LaserJet Pro M404',
        TB02115_PREVENTIVA: 'N', // NORMAL
        CALC_RESTANTE: 12, // SLA Vencido (vermelho)
        sla: 'vencido',
        ENDERECO: 'Av. Paulista, 1578, Bela Vista, São Paulo, SP',
        pedidoVinculado: 'PED-2024-1001',
        notaFiscal: 'NF-2024-0001',
        produtos: [
          { codigo: 'TN-001', referencia: 'HP-CF258A', nome: 'Toner HP LaserJet 58A Original - 3.000 páginas', quantidade: 2 },
          { codigo: 'CL-002', referencia: 'HP-CF257A', nome: 'Cilindro HP LaserJet 57A Original - 80.000 páginas', quantidade: 1 },
          { codigo: 'KIT-003', referencia: 'HP-MAINT', nome: 'Kit Manutenção HP LaserJet Pro M404', quantidade: 1 }
        ]
      },
      {
        TB02115_CODIGO: 'OS-2024002',
        TB01008_NOME: 'Construtora XYZ S.A.',
        TB01010_NOME: 'Multifuncional Canon ImageRunner',
        TB02115_PREVENTIVA: 'I', // INSTALAÇÃO
        CALC_RESTANTE: 36, // SLA à vencer (amarelo)
        sla: 'vencendo',
        ENDERECO: 'Rua Oscar Freire, 379, Jardins, São Paulo, SP'
      },
      {
        TB02115_CODIGO: 'OS-2024003',
        TB01008_NOME: 'Shopping Center Norte',
        TB01010_NOME: 'Sistema de Som Bose',
        TB02115_PREVENTIVA: 'S', // PREVENTIVA
        CALC_RESTANTE: 72, // SLA futuro (sem bolinha)
        sla: 'ok',
        ENDERECO: 'Travessa Casalbuono, 120, Vila Guilherme, São Paulo, SP',
        pedidoVinculado: 'PED-2024-1003',
        notaFiscal: 'NF-2024-0003',
        produtos: []
      },
      {
        TB02115_CODIGO: 'OS-2024004',
        TB01008_NOME: 'Clínica Médica Central',
        TB01010_NOME: 'Impressora Epson EcoTank',
        TB02115_PREVENTIVA: 'D', // DESINSTALAÇÃO
        CALC_RESTANTE: 8, // SLA Vencido (vermelho)
        sla: 'vencido',
        ENDERECO: 'Rua Dr. Enéas de Carvalho Aguiar, 255, Cerqueira César, São Paulo, SP'
      }
    ]
  },
  {
    cidade: 'Rio de Janeiro', // TB02115_CIDADE
    ordens: [
      {
        TB02115_CODIGO: 'OS-2024005',
        TB01008_NOME: 'Hotel Copacabana Palace',
        TB01010_NOME: 'Impressora Brother HL-L2350DW',
        TB02115_PREVENTIVA: 'A', // AFERIÇÃO
        CALC_RESTANTE: 18, // SLA Vencido (vermelho)
        sla: 'vencido',
        ENDERECO: 'Av. Atlântica, 1702, Copacabana, Rio de Janeiro, RJ',
        pedidoVinculado: 'PED-2024-1005',
        notaFiscal: '',
        produtos: [
          { codigo: 'TN-201', referencia: 'BR-TN2370', nome: 'Toner Brother TN-2370 Original - 2.600 páginas', quantidade: 3 },
          { codigo: 'DR-202', referencia: 'BR-DR2340', nome: 'Cilindro Brother DR-2340 Original - 12.000 páginas', quantidade: 1 }
        ]
      },
      {
        TB02115_CODIGO: 'OS-2024006',
        TB01008_NOME: 'Cristo Redentor',
        TB01010_NOME: 'Sistema de Iluminação LED',
        TB02115_PREVENTIVA: 'B', // BALCÃO
        CALC_RESTANTE: 45, // SLA à vencer (amarelo)
        sla: 'vencendo',
        ENDERECO: 'Parque Nacional da Tijuca, Alto da Boa Vista, Rio de Janeiro, RJ'
      },
      {
        TB02115_CODIGO: 'OS-2024007',
        TB01008_NOME: 'Farmácia São José',
        TB01010_NOME: 'Leitor de Código de Barras',
        TB02115_PREVENTIVA: 'R', // RETORNO-RECARGA
        CALC_RESTANTE: 96, // SLA futuro (sem bolinha)
        sla: 'ok',
        ENDERECO: 'Rua Barata Ribeiro, 200, Copacabana, Rio de Janeiro, RJ'
      }
    ]
  },
  {
    cidade: 'Belo Horizonte', // TB02115_CIDADE
    ordens: [
      {
        TB02115_CODIGO: 'OS-2024008',
        TB01008_NOME: 'Mineradora Vale do Aço',
        TB01010_NOME: 'Impressora Industrial Zebra',
        TB02115_PREVENTIVA: 'E', // ESTOQUE
        CALC_RESTANTE: 30, // SLA à vencer (amarelo)
        sla: 'vencendo'
      },
      {
        TB02115_CODIGO: 'OS-2024009',
        TB01008_NOME: 'Universidade Federal MG',
        TB01010_NOME: 'Projetor Epson PowerLite',
        TB02115_PREVENTIVA: 'N', // NORMAL
        CALC_RESTANTE: 120, // SLA futuro (sem bolinha)
        sla: 'ok'
      }
    ]
  },
  {
    cidade: 'Brasília', // TB02115_CIDADE
    ordens: [
      {
        TB02115_CODIGO: 'OS-2024010',
        TB01008_NOME: 'Ministério da Fazenda',
        TB01010_NOME: 'Servidor Dell PowerEdge',
        TB02115_PREVENTIVA: 'S', // PREVENTIVA
        CALC_RESTANTE: 6, // SLA Vencido (vermelho)
        sla: 'vencido'
      },
      {
        TB02115_CODIGO: 'OS-2024011',
        TB01008_NOME: 'Tribunal de Contas União',
        TB01010_NOME: 'Switch Cisco Catalyst',
        TB02115_PREVENTIVA: 'I', // INSTALAÇÃO
        CALC_RESTANTE: 84, // SLA futuro (sem bolinha)
        sla: 'ok'
      }
    ]
  }
];

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
  const [activeSection, setActiveSection] = useState('Board');
  const [activeFilters, setActiveFilters] = useState({
    coordenador: null,
    area: null,
    tecnico: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showOnlyLate, setShowOnlyLate] = useState(false);
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
    coordenadores: [
      { id: 1, nome: 'João Silva', areas: [] },
      { id: 2, nome: 'Maria Santos', areas: [] },
      { id: 3, nome: 'Pedro Costa', areas: [] },
      { id: 4, nome: 'Ana Oliveira', areas: [] }
    ],
    areas: [
      { id: 1, nome: 'Área Norte', coordenadorId: null, tecnicos: [] },
      { id: 2, nome: 'Área Sul', coordenadorId: null, tecnicos: [] },
      { id: 3, nome: 'Área Central', coordenadorId: 1, tecnicos: [] }
    ],
    tecnicos: []
  });
  
  // Estados para carregar técnicos da API
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);
  const [techniciansError, setTechniciansError] = useState(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedType, setDraggedType] = useState(null);
  
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnFilter, showFilterOptions, showTechnicianFilter, openCityDropdown, showOrderSidebar, showEquipmentSidebar, areaOptionsMenus, areaActionMenus, showManagementDiagram]);
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
  
  // Estrutura para agrupamentos de técnicos
  const [technicianGroups, setTechnicianGroups] = useState({});
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

  // Função para carregar dados da API
  const loadOrdersFromAPI = useCallback(async () => {
    setIsLoadingData(true);
    try {
      console.log('🔄 Carregando dados da API...');
      const response = await fetch(`${API_BASE_URL}/api/orders/open?t=${Date.now()}`);
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${result.total} ordens carregadas da API (${result.dataSource})`);
        console.log('🔍 Dados recebidos da API:', result.data);
        setApiData(result.data);
        setDataSource(result.dataSource);
        
        // Atualizar estado com dados da API
        setAvailableOrdersState(result.data);
        console.log('🔍 availableOrdersState atualizado com:', result.data);
      } else {
        console.error('❌ Erro ao carregar dados da API:', result.message);
        // Manter dados mock em caso de erro
        setAvailableOrdersState(availableOrders);
        setDataSource('mock');
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API:', error);
      // Manter dados mock em caso de erro
      setAvailableOrdersState(availableOrders);
      setDataSource('mock');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Função para carregar técnicos da API
  const loadTechniciansFromAPI = useCallback(async () => {
    setIsLoadingTechnicians(true);
    setTechniciansError(null);
    try {
      console.log('🔄 Carregando técnicos da API...');
      const response = await fetch(`${API_BASE_URL}/api/technicians`);
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${result.data.length} técnicos carregados da API`);
        console.log('🔍 Técnicos recebidos da API:', result.data);
        
        // Atualizar apenas os técnicos no teamData
        setTeamData(prev => ({
          ...prev,
          tecnicos: result.data
        }));
      } else {
        console.error('❌ Erro ao carregar técnicos da API:', result.message);
        setTechniciansError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro na requisição da API de técnicos:', error);
      setTechniciansError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsLoadingTechnicians(false);
    }
  }, []);

  // Carregar dados iniciais e configuração salva
  useEffect(() => {
    // Carregar configuração salva do localStorage
    const savedConfig = localStorage.getItem('dbConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setDbConfig(config);
        console.log('📋 Configuração carregada do localStorage');
      } catch (error) {
        console.error('❌ Erro ao carregar configuração do localStorage:', error);
      }
    }

    // Carregar dados da API
    loadOrdersFromAPI();
  }, [loadOrdersFromAPI]);

  // Recarregar dados quando a configuração for salva
  useEffect(() => {
    if (connectionStatus?.success && connectionStatus.message.includes('salva com sucesso')) {
      console.log('🔄 Recarregando dados após configuração salva...');
      setTimeout(() => {
        loadOrdersFromAPI();
      }, 1000); // Aguardar 1 segundo para o backend processar
    }
  }, [connectionStatus, loadOrdersFromAPI]);

  // Carregar técnicos quando navegar para a seção Equipe
  useEffect(() => {
    if (activeSection === 'Equipe') {
      loadTechniciansFromAPI();
    }
  }, [activeSection, loadTechniciansFromAPI]);

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
      equipamento: ordem.TB01010_NOME,
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
  const SimpleFilterModal = ({ type, options, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const currentSelected = selectedFilterItems[type] || [];
    
    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isSelected = (item) => currentSelected.includes(item);

    const toggleItem = (item) => {
      const newSelection = isSelected(item)
        ? currentSelected.filter(i => i !== item)
        : [...currentSelected, item];
      
      setSelectedFilterItems(prev => ({
        ...prev,
        [type]: newSelection
      }));
    };

    const clearAll = () => {
      setSelectedFilterItems(prev => ({
        ...prev,
        [type]: []
      }));
    };

    return (
      <div className="filter-modal">
        <div className="filter-modal-content">
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
          <div className="filter-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div key={option} className="filter-option">
                  <input 
                    type="checkbox" 
                    id={`${type}-${option}`}
                    checked={isSelected(option)}
                    onChange={() => toggleItem(option)}
                  />
                  <label htmlFor={`${type}-${option}`}>{option}</label>
                </div>
              ))
            ) : (
              <div className="no-results">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
          <div className="filter-actions">
            <button className="apply-btn" onClick={onClose}>
              Aplicar ({currentSelected.length})
            </button>
            <button className="cancel-btn" onClick={clearAll}>
              Limpar Tudo
            </button>
          </div>
        </div>
      </div>
    );
  };



  const getFilterOptions = (type) => {
    switch(type) {
      case 'coordenador':
        return mockData.coordenadores;
      case 'area':
        return activeFilters.coordenador 
          ? mockData.areas[activeFilters.coordenador] || []
          : Object.values(mockData.areas).flat();
      case 'tecnico':
        return activeFilters.coordenador 
          ? mockData.tecnicos[activeFilters.coordenador] || []
          : Object.values(mockData.tecnicos).flat();
      default:
        return [];
    }
  };

  const getFilteredOrders = React.useMemo(() => {
    console.log('🔍 getFilteredOrders - availableOrdersState:', availableOrdersState);
    console.log('🔍 getFilteredOrders - showOnlyLate:', showOnlyLate);
    
    const filtered = availableOrdersState
      .filter(item => item.cidade && item.cidade.trim() !== '') // Garantir que tem cidade
      .map(item => ({
        ...item,
        ordens: showOnlyLate 
          ? item.ordens.filter(ordem => ordem.CALC_RESTANTE <= 24) // Usar CALC_RESTANTE para filtrar atrasadas
          : item.ordens
      }))
      .filter(item => item.ordens.length > 0);
    
    console.log('🔍 getFilteredOrders - resultado filtrado:', filtered);
    return filtered;
  }, [availableOrdersState, showOnlyLate]);

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
          const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
    return Object.values(mockData.tecnicos).flat();
  };

  const getVisibleTechniques = React.useMemo(() => {
    if (selectedFilterItems.tecnico.length > 0) {
      return selectedFilterItems.tecnico;
    }
    return getAllTechniques();
  }, [selectedFilterItems.tecnico]);

  // Inicializar colunas de técnicos quando os filtros mudarem
  React.useEffect(() => {
    const visibleTechs = getVisibleTechniques;
    let hasChanges = false;
    const newTechniqueColumns = {};
    const newTechnicianGroups = {};
    
    visibleTechs.forEach((tech, index) => {
      if (!techniqueColumns[tech]) {
        newTechniqueColumns[tech] = [];
        hasChanges = true;
      } else {
        newTechniqueColumns[tech] = techniqueColumns[tech];
      }
      
      // Inicializar grupos para cada técnico
      if (!technicianGroups[tech]) {
        hasChanges = true;
        // Adicionar ordens de exemplo apenas para o primeiro técnico
        const isFirstTech = index === 0;
        newTechnicianGroups[tech] = {
          'Em serviço': isFirstTech ? [
            { 
              id: 'OS-EM001', 
              tipo: 'N', 
              cliente: 'Empresa Tech Solutions',
              equipamento: 'Impressora HP LaserJet Pro',
              cidade: 'São Paulo',
              sla: 'ok',
              emAndamento: true 
            }
          ] : [],
          'Previsto para hoje': isFirstTech ? [
            { 
              id: 'OS-HJ001', 
              tipo: 'I', 
              cliente: 'Banco Central SP',
              equipamento: 'ATM Diebold Nixdorf',
              cidade: 'São Paulo',
              sla: 'vencendo' 
            },
            { 
              id: 'OS-HJ002', 
              tipo: 'S', 
              cliente: 'Hospital Santa Casa',
              equipamento: 'Monitor Philips IntelliVue',
              cidade: 'São Paulo',
              sla: 'ok' 
            },
            { 
              id: 'OS-HJ003', 
              tipo: 'N', 
              cliente: 'Loja Magazine Luiza',
              equipamento: 'POS Ingenico iWL250',
              cidade: 'Rio de Janeiro',
              sla: 'vencido' 
            }
          ] : [],
          'Previstas para amanhã': isFirstTech ? [
            { 
              id: 'OS-AM001', 
              tipo: 'D', 
              cliente: 'Shopping Barra',
              equipamento: 'Câmera Hikvision DS-2CD',
              cidade: 'Rio de Janeiro',
              sla: 'ok' 
            },
            { 
              id: 'OS-AM002', 
              tipo: 'I', 
              cliente: 'Vale Mineração',
              equipamento: 'Tablet Samsung Galaxy Tab',
              cidade: 'Belo Horizonte',
              sla: 'ok' 
            }
          ] : [],
          'Futura': isFirstTech ? [
            { 
              id: 'OS-FUT001', 
              tipo: 'S', 
              cliente: 'Ministério da Fazenda',
              equipamento: 'Servidor Dell PowerEdge',
              cidade: 'Brasília',
              sla: 'ok' 
            }
          ] : []
        };
      } else {
        newTechnicianGroups[tech] = technicianGroups[tech];
      }
    });

    // Só atualizar se houve mudanças
    if (hasChanges) {
      setTechniqueColumns(newTechniqueColumns);
      setTechnicianGroups(newTechnicianGroups);
      setColumnOrder(visibleTechs);
    }
  }, [getVisibleTechniques]);

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

  const handleDropToTechnique = (technicianName, groupName = 'Previsto para hoje') => {
    // Não permitir drop no grupo "Em serviço"
    if (groupName === 'Em serviço') {
      return;
    }
    
    const newTechnicianGroups = { ...technicianGroups };
    if (!newTechnicianGroups[technicianName]) {
      return;
    }
    
    // Encontrar os dados reais das ordens selecionadas
    const realOrdersData = [];
    const currentData = availableOrdersState;
    
    selectedOrders.forEach(orderId => {
      // Procurar a ordem nos dados disponíveis
      currentData.forEach(cityGroup => {
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
  };

  // Nova função para retornar ordens para "Em aberto"
  const handleReturnToOpen = (orderId) => {
    const newTechnicianGroups = { ...technicianGroups };
    let orderToReturn = null;
    
    // Encontrar e remover a ordem dos grupos de técnicos
    Object.keys(newTechnicianGroups).forEach(technician => {
      Object.keys(newTechnicianGroups[technician]).forEach(groupName => {
        const orderIndex = newTechnicianGroups[technician][groupName].findIndex(order => order.id === orderId);
        if (orderIndex !== -1) {
          orderToReturn = newTechnicianGroups[technician][groupName][orderIndex];
          newTechnicianGroups[technician][groupName] = newTechnicianGroups[technician][groupName].filter(
            order => order.id !== orderId
          );
        }
      });
    });
    
    // Se encontrou a ordem, adicionar de volta aos dados disponíveis
    if (orderToReturn) {
      const newAvailableOrders = [...availableOrdersState];
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
      
      setAvailableOrdersState(newAvailableOrders);
    }
    
    setTechnicianGroups(newTechnicianGroups);
  };

  const handleColumnReorder = (dragIndex, hoverIndex) => {
    const newOrder = [...columnOrder];
    const draggedItem = newOrder[dragIndex];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, draggedItem);
    setColumnOrder(newOrder);
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
  const handleCreateArea = () => {
    if (!newAreaName.trim()) return;
    
    const newArea = {
      id: Math.max(...teamData.areas.map(a => a.id)) + 1,
      nome: newAreaName.trim(),
      coordenadorId: null,
      tecnicos: []
    };
    
    setTeamData(prev => ({
      ...prev,
      areas: [...prev.areas, newArea]
    }));
    
    setNewAreaName('');
  };

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
      actionFunction = () => {
        setTeamData(prev => ({
          ...prev,
          tecnicos: prev.tecnicos.map(t => 
            t.id === draggedItem.id ? { ...t, areaId: targetId } : t
          )
        }));
      };
    } else if (draggedType === 'area' && targetType === 'coordenador') {
      const area = teamData.areas.find(a => a.id === draggedItem.id);
      const coordenador = teamData.coordenadores.find(c => c.id === targetId);
      
      if (area.coordenadorId === targetId) return; // Já está com o coordenador
      
      actionDescription = `Vincular área "${area.nome}" ao coordenador "${coordenador.nome}"?`;
      actionFunction = () => {
        setTeamData(prev => ({
          ...prev,
          areas: prev.areas.map(a => 
            a.id === draggedItem.id ? { ...a, coordenadorId: targetId } : a
          )
        }));
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

  const confirmDragAction = () => {
    if (confirmAction) {
      confirmAction.action();
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
  const removeTechnicianFromArea = (technicianId) => {
    setTeamData(prev => ({
      ...prev,
      tecnicos: prev.tecnicos.map(t => 
        t.id === technicianId ? { ...t, areaId: null } : t
      )
    }));
  };

  // Função para editar nome da área
  const startEditingArea = (areaId, currentName) => {
    setEditingAreaId(areaId);
    setEditingAreaName(currentName);
    setAreaOptionsMenus({});
  };

  const saveAreaEdit = () => {
    if (editingAreaName.trim()) {
      setTeamData(prev => ({
        ...prev,
        areas: prev.areas.map(a => 
          a.id === editingAreaId ? { ...a, nome: editingAreaName.trim() } : a
        )
      }));
    }
    setEditingAreaId(null);
    setEditingAreaName('');
  };

  const cancelAreaEdit = () => {
    setEditingAreaId(null);
    setEditingAreaName('');
  };

  // Função para excluir área
  const deleteArea = (areaId) => {
    setConfirmAction({
      description: 'Tem certeza que deseja excluir esta área? Todos os técnicos vinculados ficarão sem área.',
      action: () => {
        setTeamData(prev => ({
          ...prev,
          areas: prev.areas.filter(a => a.id !== areaId),
          tecnicos: prev.tecnicos.map(t => 
            t.areaId === areaId ? { ...t, areaId: null } : t
          )
        }));
      }
    });
    setShowConfirmModal(true);
    setAreaOptionsMenus({});
  };

  // Função para desvincular área do coordenador
  const removeAreaFromCoordinator = (areaId) => {
    setTeamData(prev => ({
      ...prev,
      areas: prev.areas.map(a => 
        a.id === areaId ? { ...a, coordenadorId: null } : a
      )
    }));
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
              className="technician-order-row"
              onClick={() => handleOrderClick(ordem)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('orderId', ordem.id);
                e.dataTransfer.setData('fromTechnician', 'true');
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
            handleDropToTechnique(technician, groupName);
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
    if (!technicianGroups[technician] || !technicianFilters[technician]) {
      return technicianGroups[technician] || {};
    }

    const filtered = {};
    Object.entries(technicianGroups[technician]).forEach(([groupName, orders]) => {
      // "Em serviço" sempre aparece
      if (groupName === 'Em serviço') {
        filtered[groupName] = orders;
      } else if (technicianFilters[technician][groupName]) {
        filtered[groupName] = orders;
      }
    });
    return filtered;
  }, [technicianGroups, technicianFilters]);

  // Função para contar filtros ativos (memoizada)
  const getActiveTechnicianFiltersCount = React.useCallback((technician) => {
    if (!technicianFilters[technician]) return 0;
    return Object.values(technicianFilters[technician]).filter(Boolean).length;
  }, [technicianFilters]);

  const TechnicianColumn = ({ technician, orders, index }) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const filterButtonRef = React.useRef(null);

    // Filtro já é inicializado no useEffect principal do App

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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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

  const tiposOSWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const tipoData = {};
    
    // Definir todos os tipos possíveis para garantir ordem consistente
    const allTypes = ['C', 'I', 'D', 'E', 'S', 'B', 'R', 'A'];
    allTypes.forEach(tipo => {
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
            
            // Usar valor original do banco de dados
            const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
            // Mapear para valor visual
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
            
            // Usar valor original do banco de dados
            const tipoOriginal = ordem.TB02115_PREVENTIVA || 'N';
            // Mapear para valor visual
            const tipoVisual = getServiceTypeFromPreventiva(tipoOriginal);
            if (tipoData.hasOwnProperty(tipoVisual)) {
              tipoData[tipoVisual] += 1;
            }
          });
        }
      });
    }
    
    return allTypes
      .map(tipo => ({ tipo, count: tipoData[tipo] }))
      .filter(item => item.count > 0); // Mostrar apenas tipos que têm ordens
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.sla, selectedColumnFilters.equipamento, selectedColumnFilters.status]);

  const slasWithCounts = React.useMemo(() => {
    const filtered = getFilteredOrders;
    const slaData = {
      'vencido': 0,
      'vencendo': 0, 
      'ok': 0
    };
    
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
            
            // Calcular SLA baseado em CALC_RESTANTE
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
            
            // Calcular SLA baseado em CALC_RESTANTE
            const calcRestante = ordem.CALC_RESTANTE || 0;
            const sla = getSLAFromCalcRestante(calcRestante);
            if (slaData.hasOwnProperty(sla)) {
              slaData[sla] += 1;
            }
          });
        }
      });
    }
    
    return [
      { sla: 'vencido', count: slaData.vencido },
      { sla: 'vencendo', count: slaData.vencendo },
      { sla: 'ok', count: slaData.ok }
    ].filter(item => item.count > 0); // Mostrar apenas SLAs que têm ordens
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.tipoOS, selectedColumnFilters.equipamento, selectedColumnFilters.status]);

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
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const equipamento = ordem.equipamento || ordem.TB01010_NOME;
            if (equipamento && equipamento.trim() !== '') {
              if (!equipamentoData[equipamento]) {
                equipamentoData[equipamento] = 0;
              }
              equipamentoData[equipamento] += 1;
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
            
            // Se há filtro de status aplicado, considerar apenas esses status
            if (selectedColumnFilters.status.length > 0) {
              const status = ordem.TB01073_NOME || '';
              if (!selectedColumnFilters.status.includes(status)) {
                return;
              }
            }
            
            const equipamento = ordem.equipamento || ordem.TB01010_NOME;
            if (equipamento && equipamento.trim() !== '') {
              if (!equipamentoData[equipamento]) {
                equipamentoData[equipamento] = 0;
              }
              equipamentoData[equipamento] += 1;
            }
          });
        }
      });
    }
    
    return Object.entries(equipamentoData)
      .map(([equipamento, count]) => ({ equipamento, count }))
      .sort((a, b) => a.equipamento.localeCompare(b.equipamento));
  }, [getFilteredOrders, dataSource, selectedColumnFilters.cidade, selectedColumnFilters.bairro, selectedColumnFilters.cliente, selectedColumnFilters.tipoOS, selectedColumnFilters.sla, selectedColumnFilters.status]);

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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
              const equipamento = ordem.equipamento || ordem.TB01010_NOME;
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
                  <span className="order-detail-value">{order.motivoOS || 'Não informado'}</span>
                </div>

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
        // Buscar último atendimento e histórico em paralelo
        const [lastServiceResponse, historyResponse] = await Promise.all([
          fetch(`http://localhost:3001/api/equipment/last-service/${order.numeroSerie}`),
          fetch(`http://localhost:3001/api/equipment/history/${order.numeroSerie}`)
        ]);

        if (!lastServiceResponse.ok || !historyResponse.ok) {
          throw new Error('Erro ao buscar dados do equipamento');
        }

        const lastServiceResult = await lastServiceResponse.json();
        const historyResult = await historyResponse.json();

        if (lastServiceResult.success) {
          setLastServiceData(lastServiceResult.data);
        }

        if (historyResult.success) {
          setHistoryData(historyResult.data || []);
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

  return (
    <div className="app">
      <header className="main-header">
        <div className="company-name">Empresa teste</div>
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
                {dataSource === 'sql_server' ? '🟢 SQL Server' : '🟡 Mock Data'}
              </span>
            )}
          </div>
          <button 
            className={`config-btn ${showConfigMenu ? 'active' : ''}`}
            onClick={() => setShowConfigMenu(!showConfigMenu)}
            title="Configurações"
          >
            ⚙️
          </button>
        </div>
      </header>

      {showConfigMenu && (
        <div className="config-bar">
          <div className="config-nav">
            <button 
              className={`config-nav-item ${activeConfigSection === 'database' ? 'active' : ''}`}
              onClick={() => setActiveConfigSection('database')}
            >
              Banco de dados
            </button>
            <button 
              className={`config-nav-item ${activeConfigSection === 'users' ? 'active' : ''}`}
              onClick={() => setActiveConfigSection('users')}
            >
              Usuários
            </button>
          </div>
        </div>
      )}

      {showConfigMenu && activeConfigSection === 'database' && (
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

      {showConfigMenu && activeConfigSection === 'users' && (
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

      {!showConfigMenu && activeSection === 'Board' && (
        <>
          <div className="filters-bar">
            <div className="filter-buttons">
              <div className="filter-group">
                <button 
                  className="filter-btn"
                  onClick={() => setOpenModal(openModal === 'coordenador' ? null : 'coordenador')}
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
                    onClose={() => setOpenModal(null)}
                  />
                )}
              </div>

              <div className="filter-group">
                <button 
                  className="filter-btn"
                  onClick={() => setOpenModal(openModal === 'area' ? null : 'area')}
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
                  onClick={() => setOpenModal(openModal === 'tecnico' ? null : 'tecnico')}
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

              <span className="filter-separator">|</span>

              <button 
                className={`filter-btn ${showOnlyLate ? 'active' : ''}`}
                onClick={() => setShowOnlyLate(!showOnlyLate)}
              >
                Atrasadas
              </button>
            </div>

            <div className="search-container">
              <input 
                type="text"
                placeholder="Pesquisar no Kanban..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="board-section">
            <div className="kanban-board">
              <div 
                className={`kanban-column ${isDragOverOpen ? 'drop-target' : ''}`}
                onDrop={(e) => {
                  e.preventDefault();
                  const orderId = e.dataTransfer.getData('orderId');
                  const fromTechnician = e.dataTransfer.getData('fromTechnician');
                  
                  if (fromTechnician === 'true' && orderId) {
                    handleReturnToOpen(orderId);
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

              {columnOrder.map((technician, index) => (
                <TechnicianColumn
                  key={technician}
                  technician={technician}
                  orders={techniqueColumns[technician] || []}
                  index={index}
                />
              ))}
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
              <button 
                onClick={openManagementDiagram}
                className="btn-view-diagram"
              >
                <i className="bi bi-diagram-3"></i>
                Visualizar gestão
              </button>
              
              <div className="header-divider">|</div>
              
              <div className="area-creation">
                <div className="form-group-inline">
                  <input
                    type="text"
                    placeholder="Nome da nova área"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    className="area-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateArea()}
                  />
                  <button 
                    onClick={handleCreateArea}
                    className="btn-create-area"
                    disabled={!newAreaName.trim()}
                  >
                    <i className="bi bi-plus-circle"></i>
                    Criar Área
                  </button>
                </div>
              </div>
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
                {getUnassignedAreas().length > 0 ? (
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
                            {editingAreaId === area.id ? (
                              <div className="area-edit-form">
                                <input
                                  type="text"
                                  value={editingAreaName}
                                  onChange={(e) => setEditingAreaName(e.target.value)}
                                  className="area-edit-input"
                                  onKeyPress={(e) => e.key === 'Enter' && saveAreaEdit()}
                                  autoFocus
                                />
                                <div className="area-edit-actions">
                                  <button onClick={saveAreaEdit} className="btn-save">
                                    <i className="bi bi-check"></i>
                                  </button>
                                  <button onClick={cancelAreaEdit} className="btn-cancel">
                                    <i className="bi bi-x"></i>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span>{area.nome}</span>
                            )}
                          </div>
                          <div className="area-header-actions">
                            <span className="area-tech-count">{getTecnicosByArea(area.id).length}</span>
                            {editingAreaId !== area.id && (
                              <div className="area-options-container">
                                <button 
                                  className="area-options-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAreaOptionsMenu(area.id);
                                  }}
                                >
                                  <i className="bi bi-three-dots"></i>
                                </button>
                                {areaOptionsMenus[area.id] && (
                                  <div className="area-options-menu">
                                    <button 
                                      onClick={() => startEditingArea(area.id, area.nome)}
                                      className="options-menu-item"
                                    >
                                      <i className="bi bi-pencil"></i>
                                      Alterar nome
                                    </button>
                                    <button 
                                      onClick={() => deleteArea(area.id)}
                                      className="options-menu-item delete"
                                    >
                                      <i className="bi bi-trash"></i>
                                      Excluir área
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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
                ) : (
                  // Quando não há áreas, mostrar coordenadores logo abaixo
                  <div className="coordinators-section">
                    <div className="section-title-clean">
                      <h3>Coordenadores <span className="section-count-inline">({teamData.coordenadores.length})</span></h3>
                    </div>
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
                  </div>
                )}
              </div>

              {/* Coordenadores com suas áreas - só aparece quando há áreas */}
              {getUnassignedAreas().length > 0 && (
                <div className="coordinators-section">
                <div className="section-title-clean">
                  <h3>Coordenadores <span className="section-count-inline">({teamData.coordenadores.length})</span></h3>
                </div>
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
                                    {tecnico.nome}
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
              </div>
            )}
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
  );
}

export default App;
