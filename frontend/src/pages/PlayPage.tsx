import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { gameTypesAPI, gamesAPI, categoriesAPI } from '../services/api';
import { PlayIcon, UsersIcon, SwordIcon, ClockIcon, StarIcon } from 'lucide-react';

const PlayPage: React.FC = () => {
  const { user } = useAuth();
  const [gameTypes, setGameTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<any>(null);

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      const [gameTypesResponse, categoriesResponse] = await Promise.all([
        gameTypesAPI.getGameTypes(),
        categoriesAPI.getCategories()
      ]);
      
      setGameTypes(gameTypesResponse.data);
      setCategories(categoriesResponse.data);
    } catch (error) {
      console.error('Failed to load game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startDuelGame = async () => {
    if (!user) return;
    
    setQueueing(true);
    try {
      const response = await gamesAPI.enqueueForDuel(user.id, 1); // Assuming game type 1 is duel
      
      if (response.data.game_id) {
        // Match found immediately
        setCurrentGame({ id: response.data.game_id });
        setGameStarted(true);
        setModalOpen(true);
      } else {
        // Added to queue, start polling
        pollForMatch();
      }
    } catch (error) {
      console.error('Failed to start duel:', error);
      setQueueing(false);
    }
  };

  const pollForMatch = () => {
    // In a real app, you'd use WebSocket or polling
    // For demo, we'll simulate finding a match after 3 seconds
    setTimeout(() => {
      setCurrentGame({ id: Math.random() });
      setGameStarted(true);
      setQueueing(false);
      setModalOpen(true);
    }, 3000);
  };

  const startGroupGame = () => {
    setSelectedGameType(gameTypes.find((gt: any) => gt.name === 'group'));
    setModalOpen(true);
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
        <h1 className="text-3xl font-bold text-white">Play Quiz</h1>
        <p className="text-dark-300 mt-2">Choose your game mode and start playing</p>
      </div>

      {/* Game Mode Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Duel Game */}
        <Card className="p-8 text-center" hover>
          <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <SwordIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Head-to-Head Duel</h2>
          <p className="text-dark-300 mb-6">
            Challenge another player in a real-time quiz battle. Answer questions across different categories and prove your knowledge.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="bg-dark-700 p-3 rounded-lg">
              <div className="flex items-center justify-center space-x-1 text-dark-300">
                <ClockIcon className="w-4 h-4" />
                <span>5 Rounds</span>
              </div>
            </div>
            <div className="bg-dark-700 p-3 rounded-lg">
              <div className="flex items-center justify-center space-x-1 text-dark-300">
                <UsersIcon className="w-4 h-4" />
                <span>1 vs 1</span>
              </div>
            </div>
          </div>

          <Button
            onClick={startDuelGame}
            loading={queueing}
            className="w-full"
            size="lg"
          >
            {queueing ? 'Finding Opponent...' : 'Start Duel'}
          </Button>
        </Card>

        {/* Group Game */}
        <Card className="p-8 text-center" hover>
          <div className="w-20 h-20 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UsersIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Group Competition</h2>
          <p className="text-dark-300 mb-6">
            Join a multiplayer quiz with multiple opponents. Compete in 10 rounds of questions and climb to the top.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="bg-dark-700 p-3 rounded-lg">
              <div className="flex items-center justify-center space-x-1 text-dark-300">
                <ClockIcon className="w-4 h-4" />
                <span>10 Rounds</span>
              </div>
            </div>
            <div className="bg-dark-700 p-3 rounded-lg">
              <div className="flex items-center justify-center space-x-1 text-dark-300">
                <UsersIcon className="w-4 h-4" />
                <span>Multi-player</span>
              </div>
            </div>
          </div>

          <Button
            onClick={startGroupGame}
            variant="secondary"
            className="w-full"
            size="lg"
          >
            Join Group Game
          </Button>
        </Card>
      </div>

      {/* Recent Games */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <StarIcon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-dark-300">Your Level</p>
            <p className="text-lg font-bold text-white">{user?.current_level}</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-secondary-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <PlayIcon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-dark-300">Total XP</p>
            <p className="text-lg font-bold text-white">{user?.total_xp?.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-green-400 rounded-full"></div>
            </div>
            <p className="text-sm text-dark-300">Available</p>
            <p className="text-lg font-bold text-white">{categories.length} Categories</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-dark-300">Game Modes</p>
            <p className="text-lg font-bold text-white">{gameTypes.length}</p>
          </div>
        </div>
      </Card>

      {/* Game Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={gameStarted ? "Game Started!" : "Game Setup"}
        size="lg"
      >
        {gameStarted ? (
          <GameInterface
            game={currentGame}
            categories={categories}
            onGameEnd={() => {
              setModalOpen(false);
              setGameStarted(false);
              setCurrentGame(null);
            }}
          />
        ) : (
          <GroupGameSetup
            onStart={(gameData) => {
              setCurrentGame(gameData);
              setGameStarted(true);
            }}
            onCancel={() => setModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

// Game Interface Component
const GameInterface: React.FC<{
  game: any;
  categories: any[];
  onGameEnd: () => void;
}> = ({ game, categories, onGameEnd }) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [gamePhase, setGamePhase] = useState<'category_selection' | 'question' | 'result' | 'game_end'>('category_selection');
  const [score, setScore] = useState(0);
  const [totalRounds] = useState(5);

  const selectCategory = (category: any) => {
    setSelectedCategory(category);
    // Simulate question loading
    setTimeout(() => {
      setQuestion({
        id: 1,
        text: "What is the capital of France?",
        choices: [
          { id: 1, choice_text: "London", is_correct: false, position: 'A' },
          { id: 2, choice_text: "Berlin", is_correct: false, position: 'B' },
          { id: 3, choice_text: "Paris", is_correct: true, position: 'C' },
          { id: 4, choice_text: "Madrid", is_correct: false, position: 'D' },
        ]
      });
      setGamePhase('question');
    }, 1000);
  };

  const answerQuestion = (choice: any) => {
    if (choice.is_correct) {
      setScore(score + 100);
    }
    
    setGamePhase('result');
    setTimeout(() => {
      if (currentRound >= totalRounds) {
        setGamePhase('game_end');
      } else {
        setCurrentRound(currentRound + 1);
        setGamePhase('category_selection');
        setSelectedCategory(null);
        setQuestion(null);
      }
    }, 2000);
  };

  if (gamePhase === 'category_selection') {
    return (
      <div className="text-center">
        <h3 className="text-lg font-bold mb-4 text-white">Round {currentRound} of {totalRounds}</h3>
        <p className="text-dark-300 mb-6">Choose a category for this round:</p>
        <div className="grid grid-cols-1 gap-3">
          {categories.slice(0, 3).map((category) => (
            <Button
              key={category.id}
              onClick={() => selectCategory(category)}
              variant="outline"
              className="p-4 h-auto"
            >
              <div className="text-left">
                <div className="font-medium text-white">{category.name}</div>
                <div className="text-sm text-dark-300">{category.description}</div>
              </div>
            </Button>
          ))}
        </div>
        <div className="mt-4 text-sm text-dark-400">
          Current Score: {score} points
        </div>
      </div>
    );
  }

  if (gamePhase === 'question' && question) {
    return (
      <div>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-dark-300">Round {currentRound} - {selectedCategory?.name}</span>
            <span className="text-sm font-medium text-white">Score: {score}</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentRound / totalRounds) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <h3 className="text-lg font-bold mb-6 text-white">{question.text}</h3>
        <div className="space-y-3">
          {question.choices?.map((choice: any) => (
            <Button
              key={choice.id}
              onClick={() => answerQuestion(choice)}
              variant="outline"
              className="w-full p-4 h-auto text-left justify-start"
            >
              <span className="font-medium mr-3 text-white">{choice.position}.</span>
              <span className="text-white">{choice.choice_text}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (gamePhase === 'result' && question) {
    const correctChoice = question.choices?.find((c: any) => c.is_correct);
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">
          {correctChoice ? '✅' : '❌'}
        </div>
        <h3 className="text-lg font-bold mb-2 text-white">
          {correctChoice ? 'Correct!' : 'Wrong!'}
        </h3>
        <p className="text-dark-300 mb-4">
          The correct answer was: <strong className="text-white">{correctChoice?.choice_text}</strong>
        </p>
        <div className="text-sm text-dark-400">
          Current Score: {score} points
        </div>
      </div>
    );
  }

  if (gamePhase === 'game_end') {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">🏆</div>
        <h3 className="text-2xl font-bold mb-4 text-white">Game Complete!</h3>
        <p className="text-lg text-dark-300 mb-6">
          Final Score: <strong className="text-white">{score} points</strong>
        </p>
        <Button onClick={onGameEnd} className="w-full">
          Play Again
        </Button>
      </div>
    );
  }

  return <LoadingSpinner />;
};

// Group Game Setup Component
const GroupGameSetup: React.FC<{
  onStart: (gameData: any) => void;
  onCancel: () => void;
}> = ({ onStart, onCancel }) => {
  const [playerCount, setPlayerCount] = useState(4);
  const [loading, setLoading] = useState(false);

  const startGame = () => {
    setLoading(true);
    // Simulate game creation
    setTimeout(() => {
      onStart({ id: Math.random(), players: playerCount });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-4 text-white">Group Game Setup</h3>
        <p className="text-dark-300 mb-6">
          Configure your group game settings. You'll compete against other players in 10 rounds of questions.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-200 mb-2">
          Number of Players
        </label>
        <select
          value={playerCount}
          onChange={(e) => setPlayerCount(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-dark-600 bg-dark-700 text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={2}>2 Players</option>
          <option value={3}>3 Players</option>
          <option value={4}>4 Players</option>
          <option value={5}>5 Players</option>
          <option value={6}>6 Players</option>
        </select>
      </div>

      <div className="bg-dark-700 p-4 rounded-lg">
        <h4 className="font-medium mb-2 text-white">Game Rules:</h4>
        <ul className="text-sm text-dark-300 space-y-1">
          <li>• 10 rounds of questions</li>
          <li>• Categories assigned automatically</li>
          <li>• 100 points per correct answer</li>
          <li>• Highest score wins</li>
        </ul>
      </div>

      <div className="flex space-x-3">
        <Button onClick={startGame} loading={loading} className="flex-1">
          Start Game
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default PlayPage;