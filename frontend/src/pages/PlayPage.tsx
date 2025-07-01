import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { gameTypesAPI, gamesAPI, categoriesAPI } from '../services/api';
import { PlayIcon, UsersIcon, SwordIcon, ClockIcon, StarIcon } from 'lucide-react';

const PlayPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameTypes, setGameTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<any>(null);
  const [queueMessage, setQueueMessage] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadGameData();
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkForActiveGame = async () => {
      try {
        const res = await gamesAPI.queueStatus(user.id, 1); // 1: duel game type
        if (res.data.status === 'matched' && res.data.game_id) {
          navigate(`/game/${res.data.game_id}`);
        }
      } catch (e) {
        // ignore
      }
    };
    const interval = setInterval(checkForActiveGame, 2000);
    return () => clearInterval(interval);
  }, [user, navigate]);

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
    setQueueMessage('Searching for an opponent...');
    try {
      const response = await gamesAPI.enqueueForDuel(user.id, 1); // Assuming game type 1 is duel
      if (response.data.game_id) {
        setCurrentGame({ id: response.data.game_id });
        setGameStarted(true);
        setModalOpen(true);
        setQueueing(false);
      } else {
        pollForMatch();
      }
    } catch (error) {
      setQueueMessage('Failed to join the queue.');
      setQueueing(false);
    }
  };

  const pollForMatch = () => {
    if (!user) return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await gamesAPI.queueStatus(user.id, 1);
        if (res.data.status === 'matched') {
          setCurrentGame({ id: res.data.game_id });
          setGameStarted(true);
          setModalOpen(false);
          setQueueing(false);
          setQueueMessage('Opponent found!');
          if (pollingRef.current) clearInterval(pollingRef.current);
          
          // Navigate directly to game room (game is already started in backend)
          navigate(`/game/${res.data.game_id}`);
        } else if (res.data.status === 'waiting') {
          setQueueMessage('Searching for an opponent...');
        } else {
          setQueueMessage('You are not in the queue.');
          setQueueing(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (e) {
        setQueueMessage('Error checking queue status.');
        setQueueing(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 2000);
  };

  const cancelQueue = () => {
    setQueueing(false);
    setQueueMessage('You have left the queue.');
    if (pollingRef.current) clearInterval(pollingRef.current);
    // (اختیاری: درخواست به سرور برای حذف از صف)
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
            onClick={queueing ? cancelQueue : startDuelGame}
            loading={queueing}
            className="w-full"
            size="lg"
          >
            {queueing ? 'Cancel Search' : 'Start Duel'}
          </Button>
          {queueing && <div className="mt-2 text-yellow-400">{queueMessage}</div>}
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
        {/* Only show modal for group games now */}
        {!gameStarted && (
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
  const { user } = useAuth();
  if (!user) return <LoadingSpinner />;
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const pollingRef = useRef<any>(null);

  // Poll game state every 2s
  useEffect(() => {
    if (!game?.id || !user?.id) return;
    setLoading(true);
    const fetchState = async () => {
      try {
        const res = await gamesAPI.getGameState(game.id, user.id);
        setGameState(res.data);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchState();
    pollingRef.current = setInterval(fetchState, 2000);
    return () => clearInterval(pollingRef.current);
  }, [game?.id, user?.id]);

  if (loading || !gameState) return <LoadingSpinner />;
  const { current_round, game_status } = gameState;
  if (!current_round) {
    // Game finished
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">🏆</div>
        <h3 className="text-2xl font-bold mb-4 text-white">Game Complete!</h3>
        <Button onClick={onGameEnd} className="w-full">
          Play Again
        </Button>
      </div>
    );
  }
  const isMyTurn = current_round.picker_turn === user.id;
  const hasPickedCategory = !!current_round.category_id;
  const myAnswers = current_round.answers || [];
  const allQuestionsAnswered = hasPickedCategory && myAnswers.length === (current_round.questions?.length || 0);

  // Category selection phase
  if (!hasPickedCategory) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-bold mb-4 text-white">Round {current_round.round_number}</h3>
        <p className="text-dark-300 mb-6">
          {isMyTurn ? 'It\'s your turn to pick a category.' : 'Waiting for opponent to pick a category...'}
        </p>
        {isMyTurn ? (
          <div className="grid grid-cols-1 gap-3">
            {current_round.category_options.map((category: any) => (
              <Button
                key={category.id}
                onClick={async () => {
                  setSubmitting(true);
                  await gamesAPI.pickCategory(game.id, current_round.round_number, user.id, category.id);
                  setSubmitting(false);
                }}
                variant="outline"
                className="p-4 h-auto"
                disabled={submitting}
              >
                <div className="text-left">
                  <div className="font-medium text-white">{category.name}</div>
                  <div className="text-sm text-dark-300">{category.description}</div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-dark-400">Waiting...</div>
        )}
      </div>
    );
  }

  // Question answering phase
  if (hasPickedCategory && !allQuestionsAnswered) {
    const nextQuestion = current_round.questions.find((q: any) => !myAnswers.some((a: any) => a.question_id === q.question_id));
    if (!nextQuestion) return <LoadingSpinner />;
    
    // Get choices for this question
    const questionChoices = nextQuestion.choices || [];
    
    return (
      <div>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-dark-300">Round {current_round.round_number}</span>
          </div>
        </div>
        <h3 className="text-lg font-bold mb-6 text-white">{nextQuestion.text}</h3>
        <div className="space-y-3">
          {questionChoices.map((choice: any) => (
            <Button
              key={choice.choice_id}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await gamesAPI.submitAnswer(game.id, current_round.round_number, {
                    user_id: user.id,
                    question_id: nextQuestion.question_id,
                    choice_id: choice.choice_id,
                    response_time_ms: 5000 // Default response time
                  });
                } catch (error) {
                  console.error('Error submitting answer:', error);
                } finally {
                  setSubmitting(false);
                }
              }}
              variant="outline"
              className="w-full p-4 h-auto text-left"
              disabled={submitting}
            >
              <div className="font-medium text-white">{choice.choice_text}</div>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Waiting for opponent to answer
  if (hasPickedCategory && allQuestionsAnswered) {
    return (
      <div className="text-center">
        <div className="text-lg text-dark-300 mb-4">Waiting for opponent to finish this round...</div>
        <LoadingSpinner />
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