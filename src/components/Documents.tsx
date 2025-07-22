import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, FileText, Upload, Search, Edit, Trash2, Download, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  folder: string;
  file_url: string | null;
  upload_date: string;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  documentCount: number;
}

const defaultFolders: Omit<Folder, 'id' | 'documentCount'>[] = [
  { name: 'Imposto de Renda', color: 'bg-blue-500' },
  { name: 'Documentos Pessoais', color: 'bg-green-500' },
  { name: 'Trabalho', color: 'bg-purple-500' },
  { name: 'Contratos', color: 'bg-orange-500' },
];

const folderColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
  'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500'
];

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      initializeFolders();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const initializeFolders = () => {
    // Carregar pastas do localStorage se existirem
    const savedFolders = localStorage.getItem(`folders_${user?.id}`);
    let userFolders = savedFolders ? JSON.parse(savedFolders) : [];
    
    // Se não há pastas salvas, usar as padrão
    if (userFolders.length === 0) {
      userFolders = defaultFolders.map((folder, index) => ({
        ...folder,
        id: (index + 1).toString(),
        documentCount: 0
      }));
      localStorage.setItem(`folders_${user?.id}`, JSON.stringify(userFolders));
    }
    
    setFolders(userFolders);
  };

  useEffect(() => {
    // Update folder counts when documents change
    setFolders(prev => {
      const updatedFolders = prev.map(folder => ({
        ...folder,
        documentCount: documents.filter(doc => doc.folder === folder.name).length
      }));
      
      // Salvar no localStorage
      if (user?.id) {
        localStorage.setItem(`folders_${user.id}`, JSON.stringify(updatedFolders));
      }
      
      return updatedFolders;
    });
  }, [documents, user?.id]);

  const filteredDocuments = documents.filter(doc => 
    (!selectedFolder || doc.folder === selectedFolder) &&
    (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     doc.folder.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddFolder = (name: string, color: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      color,
      documentCount: 0
    };
    
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    
    // Salvar no localStorage
    if (user?.id) {
      localStorage.setItem(`folders_${user.id}`, JSON.stringify(updatedFolders));
    }
    
    setShowAddFolderModal(false);
  };

  const handleUploadDocument = async (name: string, folder: string, file: File) => {
    try {
      const { error } = await supabase
        .from('documents')
        .insert([{
          user_id: user?.id,
          name: name || file.name,
          file_type: file.type,
          file_size: file.size,
          folder,
          upload_date: new Date().toISOString(),
        }]);

      if (error) throw error;
      
      setShowUploadModal(false);
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Erro ao fazer upload do documento');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Erro ao excluir documento');
    }
  };

  const handleDeleteFolder = (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (folder && folder.documentCount > 0) {
      alert('Não é possível excluir uma pasta que contém documentos.');
      return;
    }
    
    const updatedFolders = folders.filter(f => f.id !== id);
    setFolders(updatedFolders);
    
    // Salvar no localStorage
    if (user?.id) {
      localStorage.setItem(`folders_${user.id}`, JSON.stringify(updatedFolders));
    }
    
    if (selectedFolder === folder?.name) {
      setSelectedFolder(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Documentos</h1>
          <p className="text-gray-500 mt-1">Organize seus documentos importantes</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowAddFolderModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Pasta</span>
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Total de Documentos</p>
              <p className="text-3xl font-bold mt-1">{totalDocuments}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Pastas</p>
              <p className="text-3xl font-bold mt-1">{folders.length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <FolderOpen className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Espaço Usado</p>
              <p className="text-3xl font-bold mt-1">{formatFileSize(totalSize)}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Upload className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Busca e filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                !selectedFolder
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* Pastas */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Pastas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedFolder === folder.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
              onClick={() => setSelectedFolder(selectedFolder === folder.name ? null : folder.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${folder.color}`}>
                  <FolderOpen className="h-5 w-5 text-white" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-medium text-gray-800 mb-1">{folder.name}</h3>
              <p className="text-sm text-gray-500">{folder.documentCount} documentos</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedFolder ? `Documentos - ${selectedFolder}` : 'Todos os Documentos'}
          </h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento encontrado</h3>
              <p className="text-gray-500">Faça upload de seus documentos para organizá-los.</p>
            </div>
          ) : (
            filteredDocuments.map((document) => (
              <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-800">{document.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">{document.folder}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{document.file_type}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{formatFileSize(document.file_size)}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          {new Date(document.upload_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDocument(document.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de adicionar pasta */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Nova Pasta</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const color = formData.get('color') as string;
              
              if (name && color) {
                handleAddFolder(name, color);
              }
            }} className="p-6 space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Nome da pasta"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor da pasta</label>
                <div className="grid grid-cols-4 gap-3">
                  {folderColors.map(color => (
                    <label key={color} className="cursor-pointer">
                      <input 
                        type="radio" 
                        name="color" 
                        value={color} 
                        className="sr-only" 
                        required 
                      />
                      <div className={`w-12 h-12 rounded-lg ${color} border-2 border-transparent hover:border-gray-300 transition-colors duration-200 flex items-center justify-center`}>
                        <FolderOpen className="h-6 w-6 text-white" />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Upload de Documento</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const file = (formData.get('file') as File);
              const name = formData.get('name') as string;
              const folder = formData.get('folder') as string;
              
              if (file && folder) {
                handleUploadDocument(name || file.name, folder, file);
              }
            }} className="p-6 space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Nome do documento (opcional)"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
              />
              
              <select
                name="folder"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
              >
                <option value="">Selecione uma pasta</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.name}>
                    {folder.name}
                  </option>
                ))}
              </select>
              
              <input
                type="file"
                name="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="w-full p-3 border border-gray-200 rounded-xl bg-white text-black cursor-pointer
                          file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 
                          file:text-blue-700 file:bg-white file:border file:border-gray-300
                          file:hover:bg-gray-50 file:transition-colors file:duration-200 file:cursor-pointer
                          hover:border-gray-300 transition-colors duration-200"
              />
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}