import React, { useState, useEffect } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import LoadingSpinner from '../UI/LoadingSpinner';
import { usersAPI, categoriesAPI, questionsAPI } from '../../services/api';
import { UsersIcon, TagIcon, FileQuestionIcon as QuestionMarkCircleIcon, PlusIcon, EditIcon, TrashIcon } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'category' | 'question'>('user');
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          const usersResponse = await usersAPI.getUsers();
          setUsers(usersResponse.data);
          break;
        case 'categories':
          const categoriesResponse = await categoriesAPI.getCategories();
          setCategories(categoriesResponse.data);
          break;
        case 'questions':
          const questionsResponse = await questionsAPI.getQuestions();
          setQuestions(questionsResponse.data);
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalType(activeTab as any);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      switch (activeTab) {
        case 'users':
          await usersAPI.deleteUser(id);
          break;
        case 'categories':
          await categoriesAPI.deleteCategory(id);
          break;
        case 'questions':
          await questionsAPI.deleteQuestion(id);
          break;
      }
      loadData();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setModalType(activeTab as any);
    setModalOpen(true);
  };

  const tabs = [
    { id: 'users', name: 'Users', icon: UsersIcon },
    { id: 'categories', name: 'Categories', icon: TagIcon },
    { id: 'questions', name: 'Questions', icon: QuestionMarkCircleIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
        <Button onClick={handleAdd}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add {activeTab.slice(0, -1)}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <Card className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dark-700">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-800 divide-y divide-dark-700">
                    {users.map((user: any) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">{user.username}</div>
                            <div className="text-sm text-dark-300">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-red-900 text-red-300'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-primary-400 hover:text-primary-300"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category: any) => (
                  <Card key={category.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{category.name}</h3>
                        <p className="text-sm text-dark-300">{category.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-primary-400 hover:text-primary-300"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="space-y-4">
                {questions.map((question: any) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{question.text}</p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-dark-300">
                          <span>Difficulty: {question.difficulty}</span>
                          <span>Category ID: {question.category_id}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            question.is_verified 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-yellow-900 text-yellow-300'
                          }`}>
                            {question.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(question)}
                          className="text-primary-400 hover:text-primary-300"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal for editing/adding */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editingItem ? 'Edit' : 'Add'} ${modalType}`}
      >
        <AdminForm
          type={modalType}
          item={editingItem}
          onSave={() => {
            setModalOpen(false);
            loadData();
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

// Admin Form Component
const AdminForm: React.FC<{
  type: 'user' | 'category' | 'question';
  item?: any;
  onSave: () => void;
  onCancel: () => void;
}> = ({ type, item, onSave, onCancel }) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      // Initialize with empty form
      switch (type) {
        case 'user':
          setFormData({ username: '', email: '', role: 'user', is_active: true });
          break;
        case 'category':
          setFormData({ name: '', description: '' });
          break;
        case 'question':
          setFormData({ text: '', category_id: '', difficulty: 'easy', is_verified: false });
          break;
      }
    }
  }, [type, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (item) {
        // Update existing
        switch (type) {
          case 'user':
            await usersAPI.updateUser(item.id, formData);
            break;
          case 'category':
            await categoriesAPI.updateCategory(item.id, formData);
            break;
          case 'question':
            await questionsAPI.updateQuestion(item.id, formData);
            break;
        }
      } else {
        // Create new
        switch (type) {
          case 'user':
            await usersAPI.getUsers(); // Note: Create user should be done via registration
            break;
          case 'category':
            await categoriesAPI.createCategory(formData);
            break;
          case 'question':
            await questionsAPI.createQuestion(formData);
            break;
        }
      }
      onSave();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type === 'user' && (
        <>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Username</label>
            <input
              type="text"
              value={formData.username || ''}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Role</label>
            <select
              value={formData.role || 'user'}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
        </>
      )}

      {type === 'category' && (
        <>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
          </div>
        </>
      )}

      {type === 'question' && (
        <>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Question Text</label>
            <textarea
              value={formData.text || ''}
              onChange={(e) => setFormData({...formData, text: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Category ID</label>
            <input
              type="number"
              value={formData.category_id || ''}
              onChange={(e) => setFormData({...formData, category_id: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Difficulty</label>
            <select
              value={formData.difficulty || 'easy'}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
              className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </>
      )}

      <div className="flex space-x-3 pt-4">
        <Button type="submit" loading={loading} className="flex-1">
          {item ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default AdminPanel;