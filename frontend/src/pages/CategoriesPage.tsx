import React, { useState, useEffect } from 'react';
import Card from '../components/UI/Card';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import CategoryModal from '../components/CategoryModal';
import { categoriesAPI, questionsAPI } from '../services/api';
import { TagIcon, BookOpenIcon, SearchIcon, FilterIcon, RefreshCwIcon, TrendingUpIcon, ClockIcon } from 'lucide-react';
import { Category, DifficultyStats } from '../types';

// Skeleton component for loading states
const CategorySkeleton: React.FC = () => (
  <Card className="overflow-hidden animate-pulse">
    <div className="h-32 bg-dark-700"></div>
    <div className="p-6">
      <div className="h-4 bg-dark-700 rounded mb-2"></div>
      <div className="h-3 bg-dark-700 rounded mb-4 w-3/4"></div>
      <div className="flex justify-between">
        <div className="h-3 bg-dark-700 rounded w-20"></div>
        <div className="h-3 bg-dark-700 rounded w-24"></div>
      </div>
    </div>
  </Card>
);

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<{[key: number]: number}>({});
  const [difficultyStats, setDifficultyStats] = useState<{[key: number]: DifficultyStats}>({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'questions' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [questionCountFilter, setQuestionCountFilter] = useState<'all' | 'empty' | 'small' | 'medium' | 'large'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [bookmarkedCategories, setBookmarkedCategories] = useState<Set<number>>(new Set());
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    loadCategories();
    loadBookmarks();
  }, []);

  const loadCategories = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setStatsLoading(true);
      setError(null);
      
      const categoriesResponse = await categoriesAPI.getCategories();
      const categoriesData = categoriesResponse.data;
      
      setCategories(categoriesData);
      setLoading(false);
      setRefreshing(false);

      // Load all question counts and difficulty stats in parallel for better performance
      const statsPromises = categoriesData.map(async (category) => {
        try {
          const [questionsResponse, difficultyResponse] = await Promise.all([
            questionsAPI.getQuestions({ 
              category_id: category.id, 
              verified: true 
            }),
            questionsAPI.getDifficultyStats({ 
              category_id: category.id, 
              verified: true 
            })
          ]);
          
          return { 
            id: category.id, 
            count: questionsResponse.data.length,
            difficultyStats: difficultyResponse.data
          };
        } catch (error) {
          return { 
            id: category.id, 
            count: 0,
            difficultyStats: { easy: 0, medium: 0, hard: 0, total: 0 }
          };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const stats: {[key: number]: number} = {};
      const diffStats: {[key: number]: DifficultyStats} = {};
      
      statsResults.forEach(result => {
        stats[result.id] = result.count;
        diffStats[result.id] = result.difficultyStats;
      });
      
      setCategoryStats(stats);
      setDifficultyStats(diffStats);
      setStatsLoading(false);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories. Please try again later.');
      setLoading(false);
      setStatsLoading(false);
      setRefreshing(false);
    }
  };

  const loadBookmarks = () => {
    try {
      const saved = localStorage.getItem('bookmarkedCategories');
      if (saved) {
        setBookmarkedCategories(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const toggleBookmark = (categoryId: number) => {
    const newBookmarks = new Set(bookmarkedCategories);
    if (newBookmarks.has(categoryId)) {
      newBookmarks.delete(categoryId);
    } else {
      newBookmarks.add(categoryId);
    }
    setBookmarkedCategories(newBookmarks);
    
    try {
      localStorage.setItem('bookmarkedCategories', JSON.stringify([...newBookmarks]));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  };

  const handleCategoryClick = (category: Category, index: number) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleRefresh = () => {
    loadCategories(true);
  };

  // Filter and sort categories
  const filteredAndSortedCategories = categories
    .filter(category => {
      // Text search filter
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Question count filter
      const questionCount = categoryStats[category.id] || 0;
      switch (questionCountFilter) {
        case 'empty':
          if (questionCount > 0) return false;
          break;
        case 'small':
          if (questionCount === 0 || questionCount > 10) return false;
          break;
        case 'medium':
          if (questionCount <= 10 || questionCount > 50) return false;
          break;
        case 'large':
          if (questionCount <= 50) return false;
          break;
        case 'all':
        default:
          break;
      }
      
      // Difficulty filter
      if (difficultyFilter !== 'all') {
        const stats = difficultyStats[category.id];
        if (!stats) return false;
        
        const maxDifficulty = Math.max(stats.easy, stats.medium, stats.hard);
        if (maxDifficulty === 0) return false;
        
        switch (difficultyFilter) {
          case 'easy':
            if (stats.easy !== maxDifficulty) return false;
            break;
          case 'medium':
            if (stats.medium !== maxDifficulty) return false;
            break;
          case 'hard':
            if (stats.hard !== maxDifficulty) return false;
            break;
        }
      }
      
      // Bookmark filter
      if (showBookmarkedOnly && !bookmarkedCategories.has(category.id)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'questions':
          comparison = (categoryStats[a.id] || 0) - (categoryStats[b.id] || 0);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

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
    const name = categoryName.toLowerCase();
    
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
        <div className="mb-8">
          <div className="h-8 bg-dark-700 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-dark-700 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dark-900 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Quiz Categories</h1>
          <p className="text-dark-300 mt-2">
            Explore different topics and test your knowledge
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
        >
          <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <FilterIcon className="w-5 h-5 text-dark-400" />
              <span className="text-dark-300 text-sm">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'questions' | 'date')}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="name">Name</option>
                <option value="questions">Questions</option>
                <option value="date">Date Added</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>

            {/* Question Count Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-dark-300 text-sm">Questions:</span>
              <select
                value={questionCountFilter}
                onChange={(e) => setQuestionCountFilter(e.target.value as 'all' | 'empty' | 'small' | 'medium' | 'large')}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="all">All</option>
                <option value="empty">Empty (0)</option>
                <option value="small">Small (1-10)</option>
                <option value="medium">Medium (11-50)</option>
                <option value="large">Large (50+)</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-dark-300 text-sm">Difficulty:</span>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                <option value="all">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Bookmark Filter */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  showBookmarkedOnly 
                    ? 'bg-yellow-500 bg-opacity-20 text-yellow-300 border border-yellow-500' 
                    : 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-white'
                }`}
              >
                <span>⭐</span>
                <span>Bookmarked</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-dark-300 text-sm">View:</span>
              <div className="flex bg-dark-800 border border-dark-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-primary-500 text-white' 
                      : 'text-dark-300 hover:text-white'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-primary-500 text-white' 
                      : 'text-dark-300 hover:text-white'
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            <div className="text-dark-300 text-sm">
              {filteredAndSortedCategories.length} of {categories.length} categories
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || questionCountFilter !== 'all' || difficultyFilter !== 'all' || showBookmarkedOnly) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setQuestionCountFilter('all');
                  setDifficultyFilter('all');
                  setShowBookmarkedOnly(false);
                }}
                className="text-primary-400 hover:text-primary-300 text-sm underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchTerm || questionCountFilter !== 'all' || difficultyFilter !== 'all' || showBookmarkedOnly) && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-dark-300 text-sm">Active filters:</span>
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-500 bg-opacity-20 text-primary-300">
              Search: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="ml-1 hover:text-primary-200"
              >
                ×
              </button>
            </span>
          )}
          {questionCountFilter !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500 bg-opacity-20 text-blue-300">
              Questions: {questionCountFilter}
              <button
                onClick={() => setQuestionCountFilter('all')}
                className="ml-1 hover:text-blue-200"
              >
                ×
              </button>
            </span>
          )}
          {difficultyFilter !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500 bg-opacity-20 text-green-300">
              Difficulty: {difficultyFilter}
              <button
                onClick={() => setDifficultyFilter('all')}
                className="ml-1 hover:text-green-200"
              >
                ×
              </button>
            </span>
          )}
          {showBookmarkedOnly && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500 bg-opacity-20 text-yellow-300">
              ⭐ Bookmarked Only
              <button
                onClick={() => setShowBookmarkedOnly(false)}
                className="ml-1 hover:text-yellow-200"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Card className="mb-6 p-4 border-l-4 border-red-500 bg-red-500 bg-opacity-10">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => loadCategories()}
            className="mt-2 text-red-300 hover:text-red-200 underline text-sm"
          >
            Try again
          </button>
        </Card>
      )}

      {categories.length === 0 ? (
        <Card className="p-12 text-center">
          <TagIcon className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Categories Available</h3>
          <p className="text-dark-300">Categories will appear here once they are created.</p>
        </Card>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredAndSortedCategories.map((category: Category, index) => (
            <Card 
              key={category.id} 
              className={`overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                viewMode === 'list' ? 'flex' : ''
              }`}
              hover
              onClick={() => {
                handleCategoryClick(category, index);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCategoryClick(category, index);
                }
              }}
              aria-label={`View details for ${category.name} category with ${categoryStats[category.id] || 0} questions`}
            >
              <div className={`${viewMode === 'list' ? 'w-48' : ''} h-32 bg-gradient-to-br ${getCategoryColor(index)} p-6 flex items-center justify-center text-white relative group-hover:brightness-110 transition-all duration-200`}>
                <div className="text-center">
                  <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-200">
                    {getCategoryIcon(category.name)}
                  </div>
                  <h3 className="text-xl font-bold">{category.name.replace('&amp;', 'and')}</h3>
                </div>
                <div className="absolute top-4 right-4 bg-white bg-opacity-20 rounded-full p-2 group-hover:bg-opacity-30 transition-all duration-200">
                  <TagIcon className="w-4 h-4" />
                </div>
                {/* Bookmark Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(category.id);
                  }}
                  className={`absolute top-4 left-4 p-2 rounded-full transition-all duration-200 ${
                    bookmarkedCategories.has(category.id)
                      ? 'bg-yellow-500 text-white shadow-lg'
                      : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                  }`}
                  aria-label={bookmarkedCategories.has(category.id) ? 'Remove from bookmarks' : 'Add to bookmarks'}
                >
                  <span className="text-sm">
                    {bookmarkedCategories.has(category.id) ? '⭐' : '☆'}
                  </span>
                </button>
              </div>
              
              <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <p className="text-dark-300 mb-4 line-clamp-3">
                  {category.description?.replace('&amp;', 'and') || 'Test your knowledge in this category'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-dark-400">
                    <BookOpenIcon className="w-4 h-4" />
                    <span>
                      {statsLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-dark-400 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        `${categoryStats[category.id] || 0} questions`
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-dark-500 flex items-center space-x-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>Added {new Date(category.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Difficulty Stats */}
                <div className="mt-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dark-400">Difficulty Distribution:</span>
                      <span className="text-white font-medium">
                        {statsLoading ? (
                          <span className="inline-block w-3 h-3 border border-dark-400 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          difficultyStats[category.id]?.total || 0
                        )}
                      </span>
                    </div>
                    
                    {!statsLoading && difficultyStats[category.id] && (
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-center p-1 bg-green-500 bg-opacity-20 rounded text-xs">
                          <div className="text-green-400 font-medium">
                            {difficultyStats[category.id].easy}
                          </div>
                          <div className="text-green-300 text-xs">Easy</div>
                        </div>
                        <div className="text-center p-1 bg-yellow-500 bg-opacity-20 rounded text-xs">
                          <div className="text-yellow-400 font-medium">
                            {difficultyStats[category.id].medium}
                          </div>
                          <div className="text-yellow-300 text-xs">Med</div>
                        </div>
                        <div className="text-center p-1 bg-red-500 bg-opacity-20 rounded text-xs">
                          <div className="text-red-400 font-medium">
                            {difficultyStats[category.id].hard}
                          </div>
                          <div className="text-red-300 text-xs">Hard</div>
                        </div>
                      </div>
                    )}
                    
                    {!statsLoading && difficultyStats[category.id] && (
                      <div className="mt-2">
                        <div className="text-xs text-dark-400 mb-1">Primary Difficulty:</div>
                        <div className="text-xs font-medium">
                          {(() => {
                            const stats = difficultyStats[category.id];
                            const max = Math.max(stats.easy, stats.medium, stats.hard);
                            if (max === 0) return <span className="text-dark-500">No questions</span>;
                            if (stats.easy === max) return <span className="text-green-400">Easy</span>;
                            if (stats.medium === max) return <span className="text-yellow-400">Medium</span>;
                            return <span className="text-red-400">Hard</span>;
                          })()}
                        </div>
                      </div>
                    )}
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
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <TrendingUpIcon className="w-5 h-5 text-primary-400" />
            <span>Category Overview</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
              <p className="text-2xl font-bold text-primary-400">{categories.length}</p>
              <p className="text-sm text-dark-300">Total Categories</p>
            </div>
            <div className="text-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
              <p className="text-2xl font-bold text-secondary-400">
                {statsLoading ? (
                  <span className="inline-block w-6 h-6 border-2 border-secondary-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  Object.values(categoryStats).reduce((a, b) => a + b, 0)
                )}
              </p>
              <p className="text-sm text-dark-300">Total Questions</p>
            </div>
            <div className="text-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
              <p className="text-2xl font-bold text-green-400">
                {statsLoading ? (
                  <span className="inline-block w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  categories.length > 0 ? Math.round(Object.values(categoryStats).reduce((a, b) => a + b, 0) / categories.length) : 0
                )}
              </p>
              <p className="text-sm text-dark-300">Avg per Category</p>
            </div>
            <div className="text-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
              <p className="text-2xl font-bold text-purple-400">
                {statsLoading ? (
                  <span className="inline-block w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  categories.filter((category: Category) => categoryStats[category.id] > 0).length
                )}
              </p>
              <p className="text-sm text-dark-300">Active Categories</p>
            </div>
          </div>
          
          {/* Additional stats */}
          {!statsLoading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
                <p className="text-lg font-bold text-yellow-400">
                  {categories.filter((category: Category) => (categoryStats[category.id] || 0) > 50).length}
                </p>
                <p className="text-xs text-dark-300">Categories with 50+ Questions</p>
              </div>
              <div className="text-center p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
                <p className="text-lg font-bold text-blue-400">
                  {categories.filter((category: Category) => (categoryStats[category.id] || 0) === 0).length}
                </p>
                <p className="text-xs text-dark-300">Empty Categories</p>
              </div>
              <div className="text-center p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
                <p className="text-lg font-bold text-pink-400">
                  {(() => {
                    const sortedCategories = [...categories].sort((a, b) => 
                      (categoryStats[b.id] || 0) - (categoryStats[a.id] || 0)
                    );
                    return sortedCategories[0]?.name || 'N/A';
                  })()}
                </p>
                <p className="text-xs text-dark-300">Most Questions</p>
              </div>
              <div className="text-center p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
                <p className="text-lg font-bold text-yellow-400">
                  {bookmarkedCategories.size}
                </p>
                <p className="text-xs text-dark-300">Bookmarked Categories</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {selectedCategory && (
        <CategoryModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          category={selectedCategory}
          questionCount={categoryStats[selectedCategory.id] || 0}
          categoryIndex={categories.findIndex(cat => cat.id === selectedCategory.id)}
        />
      )}
    </div>
  );
};

export default CategoriesPage;