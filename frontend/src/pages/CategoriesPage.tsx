import React, { useState, useEffect } from 'react';
import Card from '../components/UI/Card';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { categoriesAPI, questionsAPI } from '../services/api';
import { TagIcon, BookOpenIcon } from 'lucide-react';
import { Category } from '../types';

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<{[key: number]: number}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesResponse = await categoriesAPI.getCategories();
      console.log(categoriesResponse.data);
      
      setCategories(categoriesResponse.data);
      console.log("adsadas", categories);
      

      // Load question count for each category
      const stats: {[key: number]: number} = {};
      for (const category of categoriesResponse.data) {
        try {
          const questionsResponse = await questionsAPI.getQuestions({ 
            category_id: category.id, 
            verified: true 
          });
          stats[category.id] = questionsResponse.data.length;
        } catch (error) {
          stats[category.id] = 0;
        }
      }
      setCategoryStats(stats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'from-red-600 to-pink-600',
      'from-blue-600 to-indigo-600',
      'from-green-600 to-teal-600',
      'from-yellow-600 to-orange-600',
      'from-purple-600 to-indigo-600',
      'from-pink-600 to-rose-600',
      'from-indigo-600 to-blue-600',
      'from-teal-600 to-green-600',
    ];
    return colors[index % colors.length];
  };

  const getCategoryIcon = (categoryName: string) => {
    // Normalize & and amp; to plain 'and' for easier matching
 
    
    const name = categoryName
      .toLowerCase()
   
      
    if (name.includes('vehicles')) return '🚗';
    if (name.includes('sports')) return '🏅';
    if (name.includes('mathematics')) return '➗';
    if (name.includes('gadgets')) return '📱';
    if (name.includes('computers')) return '💻';
    if (name.includes('nature')) return '🌱';
    if (name.includes('politics')) return '🏛️';
    if (name.includes('mythology')) return '⚡';
    if (name.includes('history')) return '📚';
    if (name.includes('general knowledge')) return '❔';
    if (name.includes('video games')) return '🎮';
    if (name.includes('television')) return '📺';
    if (name.includes('musicals and theatres')) return '🎭';
    if (name.includes('music')) return '🎵';
    if (name.includes('anime') || name.includes('manga')) return '🗾';
    if (name.includes('film')) return '🎬';
    if (name.includes('comics')) return '🦸';
    if (name.includes('cartoon and animations')) return '🐭';
    if (name.includes('books')) return '📖';
    if (name.includes('board games')) return '🎲';
    if (name.includes('celebrities')) return '🌟';
    if (name.includes('art')) return '🎨';
    if (name.includes('animals')) return '🐾';
    if (name.includes('science')) return '🔬';
    if (name.includes('entertainment')) return '🎬';
    if (name.includes('literature')) return '📖';
    if (name.includes('geography')) return '🌍';
    return '❓';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dark-900 min-h-screen">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dark-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Quiz Categories</h1>
        <p className="text-dark-300 mt-2">
          Explore different topics and test your knowledge
        </p>
      </div>

      {categories.length === 0 ? (
        <Card className="p-12 text-center">
          <TagIcon className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Categories Available</h3>
          <p className="text-dark-300">Categories will appear here once they are created.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category: Category, index) => (
            <Card key={category.id} className="overflow-hidden group" hover>
              <div className={`h-32 bg-gradient-to-br ${getCategoryColor(index)} p-6 flex items-center justify-center text-white relative`}>
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {getCategoryIcon(category.name)}
                  </div>
                  <h3 className="text-xl font-bold">{category.name.replace('&amp;', 'and')}</h3>
                </div>
                <div className="absolute top-4 right-4 bg-white bg-opacity-20 rounded-full p-2">
                  <TagIcon className="w-4 h-4" />
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-dark-300 mb-4 line-clamp-3">
                  {category.description?.replace('&amp;', 'and') || 'Test your knowledge in this category'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-dark-400">
                    <BookOpenIcon className="w-4 h-4" />
                    <span>
                      {categoryStats[category.id] || 0} questions
                    </span>
                  </div>
                  <div className="text-xs text-dark-500">
                    Added {new Date(category.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Category Statistics */}
      {categories.length > 0 && (
        <Card className="mt-12 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Category Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-400">{categories.length}</p>
              <p className="text-sm text-dark-300">Total Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary-400">
                {Object.values(categoryStats).reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-sm text-dark-300">Total Questions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {Math.round(Object.values(categoryStats).reduce((a, b) => a + b, 0) / categories.length)}
              </p>
              <p className="text-sm text-dark-300">Avg per Category</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">
                {categories.filter((category: Category) => categoryStats[category.id] > 0).length}
              </p>
              <p className="text-sm text-dark-300">Active Categories</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CategoriesPage;