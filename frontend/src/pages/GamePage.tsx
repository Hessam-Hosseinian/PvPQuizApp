import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Avatar from '../components/UI/Avatar';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { gamesAPI } from '../services/api';
import { Clock, Shield, CheckCircle, XCircle, ChevronRight, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Define interfaces for our game state
interface Player {
  user_id: number;
  username: string;
  avatar: string;
  score: number;
}

interface Choice {
  choice_id: number;
  choice_text: string;
}

interface Question {
  question_id: number;
  text: string;
  choices: Choice[];
}

interface GameState {
  game_id: number;
  status: string;
  total_rounds: number;
  current_round: {
    round_number: number;
    status: string;
    category_id: number | null;
    category_name?: string;
    category_picker_id: number | null;
    category_options: { id: number; name: string }[];
    questions: Question[];
    answers: any[];
  };
  participants: Player[];
}

interface CorrectAnswerInfo {
  question_id: number;
  correct_choice_id: number;
}

// --- Helper Components ---
const TimerBar: React.FC<{ timeLeft: number; duration: number }> = ({ timeLeft, duration }) => {
    const percentage = (timeLeft / duration) * 100;
    return (
        <div className="w-full bg-dark-600 rounded-full h-2.5 mb-4">
            <motion.div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "linear" }}
            />
        </div>
    );
};

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const ROUND_TIMER_DURATION = 15;
  const [timeLeft, setTimeLeft] = useState(ROUND_TIMER_DURATION);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<CorrectAnswerInfo[]>([]);
  const submissionLockRef = useRef(new Set<number>());
  const [isWaitingForNextRound, setIsWaitingForNextRound] = useState(false);

  // --- Data Fetching and State Management ---
  const fetchGameState = useCallback(async () => {
    if (!gameId || !user) return;
    try {
      const response = await gamesAPI.getGameState(parseInt(gameId), user.id);
      
      setGameState(prevState => {
        // Reset waiting state and question state if round has changed
        if (prevState && response.data.current_round.round_number !== prevState.current_round.round_number) {
            setIsWaitingForNextRound(false);
            setCurrentQuestionIndex(0);
            setSelectedChoiceId(null);
            setRevealedAnswers([]);
            submissionLockRef.current.clear();
        }

        // This prevents the category options from changing on every poll.
        // It "latches" onto the first set of categories received for the round.
        if (
          prevState &&
          !response.data.current_round.category_id && // Still in picking phase
          prevState.current_round.category_options?.length > 0 // We already have options
        ) {
          return {
            ...response.data,
            current_round: {
              ...response.data.current_round,
              category_options: prevState.current_round.category_options,
            },
          };
        }
        return response.data;
      });

      setLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch game state.');
      setLoading(false);
    }
  }, [gameId, user]);

  const advanceToNextStep = useCallback(async () => {
    if (!gameId || !gameState) return;
    const { current_round, total_rounds } = gameState;
    const totalQuestionsInRound = current_round.questions.length;
    
    if (currentQuestionIndex < totalQuestionsInRound - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedChoiceId(null);
      setTimeLeft(ROUND_TIMER_DURATION);
    } else {
      setIsWaitingForNextRound(true);
      try {
        await gamesAPI.completeRound(parseInt(gameId), current_round.round_number);
        if (current_round.round_number === total_rounds) {
          await gamesAPI.completeGame(parseInt(gameId));
        }
      } catch (err: any) {
        console.log("Waiting for opponent...");
      }
    }
  }, [gameId, gameState, currentQuestionIndex]);

  const handleAnswerSelect = useCallback(async (
    questionId: number, 
    choiceId: number, 
    gameData: GameState, 
    currentUser: typeof user
  ) => {
    if (submissionLockRef.current.has(questionId) || !gameId || !currentUser) return;
    submissionLockRef.current.add(questionId);
    
    setSelectedChoiceId(choiceId);

    try {
      const res = await gamesAPI.submitAnswer(
        parseInt(gameId), 
        gameData.current_round.round_number, 
        { user_id: currentUser.id, question_id: questionId, choice_id: choiceId }
      );
      
      setRevealedAnswers(prev => [...prev, { question_id: questionId, correct_choice_id: res.data.correct_choice_id }]);
      
      if (res.data.is_correct) {
        setGameState(prev => {
          if (!prev) return prev;
          const newParticipants = prev.participants.map(p => 
            p.user_id === currentUser.id ? { ...p, score: p.score + res.data.points_earned } : p
          );
          return { ...prev, participants: newParticipants };
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit answer.');
    } finally {
        setTimeout(() => {
            advanceToNextStep();
        }, 2000);
    }
  }, [gameId, advanceToNextStep]);
  
  const handleTimeUp = useCallback(() => {
    if (!gameState || !user) return;
    
    const currentQuestion = gameState.current_round.questions[currentQuestionIndex];
    if (!currentQuestion || submissionLockRef.current.has(currentQuestion.question_id)) {
        return;
    }

    const choices = currentQuestion.choices;
    if (choices && choices.length > 0) {
        const randomChoice = choices[Math.floor(Math.random() * choices.length)];
        // Pass the current gameState and user directly to avoid stale state issues
        handleAnswerSelect(currentQuestion.question_id, randomChoice.choice_id, gameState, user);
    }
  }, [gameState, user, currentQuestionIndex, handleAnswerSelect]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 3000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  useEffect(() => {
    // Reset component states when the round changes
    if (gameState?.current_round?.round_number) {
        setIsWaitingForNextRound(false);
        setCurrentQuestionIndex(0);
        setSelectedChoiceId(null);
        setRevealedAnswers([]);
        submissionLockRef.current.clear();
        setTimeLeft(ROUND_TIMER_DURATION);
    }
  }, [gameState?.current_round?.round_number]);

  useEffect(() => {
    const isQuestionPhase = gameState?.current_round?.category_id && !selectedChoiceId;
    if (!isQuestionPhase) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentQuestionIndex, selectedChoiceId, handleTimeUp]);

  // --- Event Handlers ---
  const handleSelectCategory = async (categoryId: number) => {
    if (!gameId || !user || !gameState) return;
    try {
      await gamesAPI.pickCategory(
        parseInt(gameId), 
        gameState.current_round.round_number, 
        user.id, 
        categoryId
      );
      // The polling mechanism will fetch the updated state,
      // but we can trigger it immediately for a faster UI update.
      fetchGameState();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to pick category.');
    }
  };

  if (loading && !gameState) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-900 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!gameState) {
    return <div className="flex justify-center items-center min-h-screen bg-dark-900">No game data found.</div>;
  }
  
  if (gameState.status === 'completed') {
    return <GameEndScreen gameState={gameState} />;
  }
  
  // Show a waiting screen if we are waiting for the next round to start
  if (isWaitingForNextRound) {
    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-dark-900 text-white">
            <LoadingSpinner size="lg" />
            <h2 className="text-2xl font-bold mt-6">Round Finished!</h2>
            <p className="text-dark-300 mt-2">Waiting for your opponent to finish...</p>
        </div>
    );
  }

  const { participants, current_round } = gameState;
  if (!user) return <div className="flex justify-center items-center min-h-screen bg-dark-900">User not found. Please log in.</div>;
  const player1 = participants.find(p => p.user_id === user?.id) || participants[0];
  const player2 = participants.find(p => p.user_id !== user?.id) || participants[1];

  const isMyTurnToPick = current_round.category_picker_id === user?.id;

  const renderCategorySelection = () => {
    const picker = participants.find(p => p.user_id === current_round.category_picker_id);

    return (
      <motion.div
        key={`category-select-${current_round.round_number}`}
        className="w-full max-w-2xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-4">Round {current_round.round_number}</h1>
        <p className="text-lg text-dark-300 mb-8">
          {isMyTurnToPick
            ? "It's your turn to pick a category!" 
            : `Waiting for ${picker?.username || 'opponent'} to pick a category...`}
        </p>
        
        <div className="grid grid-cols-1 gap-4">
          {current_round.category_options.map(cat => (
            <Card 
              key={cat.id}
              onClick={() => isMyTurnToPick && handleSelectCategory(cat.id)}
              className={`p-6 bg-dark-700 text-left transition-all ${isMyTurnToPick ? 'cursor-pointer hover:bg-primary-700 hover:scale-105' : 'opacity-60'}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold">{cat.name}</span>
                {isMyTurnToPick && <ChevronRight className="w-6 h-6 text-primary-400" />}
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  const renderQuestionScreen = () => {
    if (!current_round?.questions?.length) return <div className="text-center"><LoadingSpinner /><p className="mt-4 text-dark-300">Loading round...</p></div>;

    const question = current_round.questions[currentQuestionIndex];
    if (!question) return <div>Question not found.</div>;

    const revealedAnswerInfo = revealedAnswers.find(a => a.question_id === question.question_id);

    const getChoiceStyle = (choiceId: number): {bgColor?: string; className: string} => {
        if (!selectedChoiceId) {
            return { className: 'bg-dark-700 hover:bg-dark-600' };
        }
    
        const isCorrect = choiceId === revealedAnswerInfo?.correct_choice_id;
        const isSelected = choiceId === selectedChoiceId;
    
        if (isCorrect) {
            return { bgColor: '#22c55e', className: 'scale-105 border-green-400' }; // green-500
        }
        if (isSelected) {
            return { bgColor: '#4b5563', className: 'border-gray-500' }; // gray-600
        }
        
        return { className: 'bg-dark-700 opacity-50' };
    };

    return (
      <motion.div 
        key={`question-view-${current_round.round_number}-${currentQuestionIndex}`}
        className="w-full max-w-4xl flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full flex justify-between items-center mb-2 text-sm text-dark-300">
            <span>Round {current_round.round_number} / {gameState.total_rounds}</span>
            <span>Question {currentQuestionIndex + 1} of {current_round.questions.length}</span>
        </div>
        
        <TimerBar timeLeft={timeLeft} duration={ROUND_TIMER_DURATION} />
        
        <Card className="w-full p-8 text-center bg-dark-900 mb-6 min-h-[150px] flex items-center justify-center">
          <h1 className="text-2xl md:text-3xl font-bold">{question.text}</h1>
        </Card>
        
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.choices.map((choice, index) => {
            const style = getChoiceStyle(choice.choice_id);
            return (
                <Button 
                    key={choice.choice_id} 
                    onClick={() => handleAnswerSelect(question.question_id, choice.choice_id, gameState, user)} 
                    disabled={!!selectedChoiceId}
                    bgColor={style.bgColor}
                    className={`text-lg p-6 justify-start h-full transition-all duration-300 transform ${selectedChoiceId ? '' : 'hover:scale-105'} ${style.className}`}
                >
                    <span className="font-bold mr-4">{String.fromCharCode(65 + index)}</span>
                    <span className="text-left flex-1">{choice.choice_text}</span>
                    {selectedChoiceId && (revealedAnswerInfo?.correct_choice_id === choice.choice_id ? <CheckCircle className="ml-auto w-6 h-6"/> : (selectedChoiceId === choice.choice_id && <XCircle className="ml-auto w-6 h-6"/>))}
                </Button>
            )
          })}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-800 text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      {/* Players Info */}
      <div className="w-full max-w-4xl grid grid-cols-2 gap-4 mb-6">
        {player1 && <Card className={`p-4 flex items-center bg-dark-700 ${isMyTurnToPick && !current_round.category_id ? 'border-2 border-primary-500' : ''}`}>
          <Avatar src={player1.avatar} alt={player1.username} size="lg" />
          <div className="ml-4"><h2 className="text-lg font-bold">{player1.username}</h2><p className="text-sm text-dark-300">Score</p></div>
          <div className="ml-auto text-2xl font-bold text-primary-400">{player1.score}</div>
        </Card>}
        {player2 && <Card className={`p-4 flex items-center bg-dark-700 ${!isMyTurnToPick && !current_round.category_id ? 'border-2 border-primary-500' : ''}`}>
          <div className="mr-auto text-2xl font-bold text-primary-400">{player2.score}</div>
          <div className="mr-4 text-right"><h2 className="text-lg font-bold">{player2.username}</h2><p className="text-sm text-dark-300">Score</p></div>
          <Avatar src={player2.avatar} alt={player2.username} size="lg" />
        </Card>}
      </div>

      <div className="w-full max-w-4xl flex-grow flex items-center justify-center">
        <AnimatePresence mode="wait">
            {gameState && !gameState.current_round.category_id 
              ? renderCategorySelection() 
              : renderQuestionScreen()
            }
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- GameEndScreen Component ---
const GameEndScreen: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { participants } = gameState;

    if (!user) return <div className="flex justify-center items-center min-h-screen bg-dark-900"><LoadingSpinner/></div>

    const winner = participants.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    const loser = participants.find(p => p.user_id !== winner.user_id);
    const isWinner = winner.user_id === user?.id;

    return (
        <div className="min-h-screen bg-dark-900 text-white flex flex-col justify-center items-center p-4">
            <Card className="w-full max-w-md text-center p-8 bg-dark-800 border-2 border-primary-500/50 shadow-2xl">
                <h1 className="text-4xl font-bold mb-2 text-primary-400">{isWinner ? 'Victory!' : 'Defeat'}</h1>
                <p className="text-dark-300 mb-8">{isWinner ? 'You crushed your opponent!' : 'Better luck next time!'}</p>

                <div className="space-y-6">
                    {/* Winner Card */}
                    <div className="relative p-6 rounded-lg bg-dark-700 border border-yellow-400">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-dark-900 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                            <Crown className="w-4 h-4 mr-1" /> Winner
                        </div>
                        <div className="flex items-center">
                            <Avatar src={winner.avatar} alt={winner.username} size="xl" className="ring-2 ring-yellow-400" />
                            <div className="ml-4 text-left">
                                <h2 className="text-xl font-bold">{winner.username}</h2>
                                <p className="text-dark-300">Final Score</p>
                            </div>
                            <div className="ml-auto text-3xl font-bold text-yellow-400">{winner.score}</div>
                        </div>
                    </div>

                    {/* Loser Card */}
                    {loser && (
                         <div className="p-6 rounded-lg bg-dark-700 border border-dark-600">
                            <div className="flex items-center">
                                <Avatar src={loser.avatar} alt={loser.username} size="lg" className="opacity-70" />
                                <div className="ml-4 text-left">
                                    <h2 className="text-lg font-semibold text-dark-200">{loser.username}</h2>
                                    <p className="text-dark-400">Final Score</p>
                                </div>
                                <div className="ml-auto text-2xl font-bold text-dark-300">{loser.score}</div>
                            </div>
                        </div>
                    )}
                </div>

                <Button 
                    onClick={() => navigate('/')} 
                    size="lg" 
                    className="mt-10 w-full bg-primary-600 hover:bg-primary-700"
                >
                    Back to Home
                </Button>
            </Card>
        </div>
    );
}

export default GamePage; 